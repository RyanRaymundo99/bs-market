import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { paymentService, calculateFeeBreakdown } from "@/lib/payment";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";
import {
  sendPurchaseReceipt,
  sendWithdrawalReceipt,
} from "@/lib/receipt-email";

/** Map webhook event names to canonical types we handle (incl. Portuguese / alternate names). */
function normalizeWebhookEventType(raw: string): string {
  const lower = raw.toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    "transaction.created": "transaction.created",
    "transaction.completed": "transaction.completed",
    "transaction.failed": "transaction.failed",
    "transaction.refunded": "transaction.refunded",
    "transaction_created": "transaction.created",
    "transaction_completed": "transaction.completed",
    "transaction_failed": "transaction.failed",
    "transaction_refunded": "transaction.refunded",
    "transacao_criada": "transaction.created",
    "transacao_completada": "transaction.completed",
    "transacao_falhou": "transaction.failed",
    "transacao_reembolsada": "transaction.refunded",
    "payment.created": "payment.created",
    "payment.completed": "payment.completed",
    "payment.failed": "payment.failed",
    "payment.refunded": "payment.refunded",
    "payment_created": "payment.created",
    "payment_completed": "payment.completed",
    "payment_failed": "payment.failed",
    "payment_refunded": "payment.refunded",
    "pagamento_criado": "payment.created",
    "pagamento_completado": "payment.completed",
    "pagamento_falhou": "payment.failed",
    "pagamento_reembolsado": "payment.refunded",
    // Nubank PJ specific events
    "pix.received": "payment.completed",
    "pix.confirmed": "payment.completed",
    "pix.expired": "payment.failed",
    "pix.cancelled": "payment.failed",
    "charge.paid": "payment.completed",
    "charge.expired": "payment.failed",
  };
  return map[lower] ?? raw;
}

// Allow GET requests for webhook URL verification/testing
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Webhook endpoint is active",
    endpoint: "/api/webhooks/nubank",
    provider: paymentService.name,
    timestamp: new Date().toISOString(),
    note: "This endpoint accepts POST requests from payment provider webhooks",
  });
}

export async function POST(request: NextRequest) {
  let webhookEventId: string | null = null;
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Extract webhook metadata
    const rawEvent = (body.event || body.type || "transaction.unknown") as string;
    let eventType = normalizeWebhookEventType(rawEvent);
    const webhookData = body.data || body;

    // Extract transaction_id from either nested data or top-level
    // NuPay sends pspReferenceId (internal provider ID) and referenceId (our order ID)
    const transaction_id = webhookData.pspReferenceId || webhookData.transaction_id || body.transaction_id || body.transactionId || body.id;
    const external_id = webhookData.referenceId || webhookData.external_id || body.external_id || body.externalId;
    let status = (
      webhookData.status ||
      body.status ||
      "pending"
    )?.toLowerCase();

    // 🔒 SECURTY: For NuPay (and as a general best practice), we verify the actual status synchronously
    let fetchedRawData: any = {};
    if (transaction_id && paymentService.name === "nupay") {
      try {
        const verifiedStatus = await paymentService.getTransactionStatus(transaction_id);
        if (verifiedStatus) {
          status = verifiedStatus.status.toLowerCase();
          fetchedRawData = verifiedStatus.raw || {};
          eventType = verifiedStatus.isCompleted
            ? "payment.completed"
            : verifiedStatus.isFailed
            ? "payment.failed"
            : "payment.pending";
        }
      } catch (e) {
        console.error("Failed to synchronously verify NuPay transaction status:", e);
      }
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Store webhook event in database for tracking
    try {
      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          eventType: eventType,
          source: paymentService.name,
          payload: JSON.parse(JSON.stringify(body)),
          transactionId: transaction_id,
          externalId: external_id,
          status: status.toUpperCase(),
          ipAddress: ipAddress,
          userAgent: userAgent,
          processed: false,
        },
      });
      webhookEventId = webhookEvent.id;
    } catch (dbError) {
      // If WebhookEvent model doesn't exist yet (migration not run), continue silently
    }

    // Verify webhook signature
    const isValidSignature = await paymentService.verifyWebhookSignature(
      request,
      rawBody
    );

    // Allow test webhooks only in development
    const isDevelopment = process.env.NODE_ENV === "development";
    const isTestWebhook =
      isDevelopment && request.headers.get("x-test-webhook") === "true";

    // Update webhook event with signature validation result
    if (webhookEventId) {
      try {
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            signatureValid: isValidSignature || isTestWebhook,
          },
        });
      } catch (dbError) {
        // Ignore if model doesn't exist
      }
    }

    if (!isValidSignature && !isTestWebhook) {
      console.error("Webhook signature verification failed");

      if (webhookEventId) {
        try {
          await prisma.webhookEvent.update({
            where: { id: webhookEventId },
            data: {
              processed: false,
              error: "Invalid webhook signature",
            },
          });
        } catch (dbError) {
          // Ignore if model doesn't exist
        }
      }

      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // Extract fields from webhook payload (or use fetchedRawData from security check)
    const amount =
      fetchedRawData.amount?.value ||
      webhookData.amount ||
      body.amount ||
      webhookData.value ||
      body.value ||
      webhookData.amount_paid_brl ||
      body.amount_paid_brl;
    const currency = fetchedRawData.amount?.currency || webhookData.currency || body.currency || "BRL";
    const type =
      fetchedRawData.paymentMethodType ||
      webhookData.type ||
      body.type ||
      webhookData.payment_method ||
      body.payment_method ||
      "PIX";
    const user_id =
      webhookData.user_id ||
      body.user_id ||
      webhookData.customer_id ||
      body.customer_id;
    const usdt_amount =
      webhookData.usdt_amount ||
      body.usdt_amount ||
      webhookData.crypto_amount ||
      body.crypto_amount ||
      amount;
    const created_at =
      fetchedRawData.createdAt ||
      webhookData.created_at ||
      body.created_at ||
      webhookData.createdAt ||
      body.createdAt;
    const completed_at =
      fetchedRawData.timestamp ||
      webhookData.completed_at ||
      body.completed_at ||
      webhookData.completedAt ||
      body.completedAt ||
      webhookData.executed_at ||
      body.executed_at;

    if (!transaction_id && !external_id) {
      console.error("Webhook missing transaction_id and external_id");
      if (webhookEventId) {
        try {
          await prisma.webhookEvent.update({
            where: { id: webhookEventId },
            data: {
              processed: false,
              error:
                "Missing transaction_id and external_id (at least one required)",
            },
          });
        } catch (dbError) {
          // Ignore if model doesn't exist
        }
      }
      return NextResponse.json(
        {
          error:
            "Missing transaction_id and external_id (at least one required)",
          note: "Webhooks must include transaction_id or external_id",
        },
        { status: 400 }
      );
    }

    // Check if this is a withdrawal webhook (external_id starts with "withdrawal_")
    const isWithdrawalWebhook = external_id?.startsWith("withdrawal_") || false;
    
    // Check if this is a crypto deposit webhook
    const isCryptoDepositWebhook = 
      external_id?.startsWith("deposit_") || 
      eventType?.includes("deposit") ||
      eventType?.includes("crypto.received") ||
      false;

    // Handle crypto deposit webhooks first (before withdrawals)
    if (isCryptoDepositWebhook && !isWithdrawalWebhook) {
      let foundDeposit = await prisma.deposit.findFirst({
        where: {
          externalId: external_id,
        },
        include: {
          user: true,
          transaction: true,
        },
      });

      if (!foundDeposit && transaction_id) {
        foundDeposit = await prisma.deposit.findFirst({
          where: {
            paymentMethod: "USDT",
            status: "PENDING",
            paymentId: transaction_id,
          },
          include: {
            user: true,
            transaction: true,
          },
        });
      }

      if (foundDeposit) {
        const depositUser = foundDeposit.user;
        
        const networkMatch = external_id?.match(/deposit_.*_(TRC20|ERC20|BSC)_/);
        const network = networkMatch ? networkMatch[1] : 
          webhookData.network || body.network || "TRC20";
        
        let depositStatus: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" = 
          foundDeposit.status as "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";

        if (
          eventType === "transaction.completed" ||
          eventType === "deposit.completed" ||
          eventType === "crypto.received" ||
          eventType === "payment.completed" ||
          status === "completed" ||
          status === "COMPLETED"
        ) {
          depositStatus = "CONFIRMED";
        } else if (
          eventType === "transaction.failed" ||
          eventType === "deposit.failed" ||
          eventType === "payment.failed" ||
          status === "failed" ||
          status === "FAILED"
        ) {
          depositStatus = "REJECTED";
        }

        const depositAmount = amount || usdt_amount || Number(foundDeposit.amount);
        
        const updatedDeposit = await prisma.deposit.update({
          where: { id: foundDeposit.id },
          data: {
            status: depositStatus,
            amount: depositAmount > 0 ? new Decimal(depositAmount) : foundDeposit.amount,
            confirmedAt: depositStatus === "CONFIRMED" ? new Date() : foundDeposit.confirmedAt,
            paymentId: transaction_id || foundDeposit.paymentId,
            paymentStatus: status?.toUpperCase() || foundDeposit.paymentStatus,
            paymentAmount: amount ? new Decimal(amount) : foundDeposit.paymentAmount,
          },
        });

        if (depositStatus === "CONFIRMED" && !foundDeposit.transaction) {
          const usdtBalance = await prisma.balance.findFirst({
            where: {
              userId: depositUser.id,
              currency: "USDT",
            },
          });

          const finalAmount = depositAmount > 0 ? depositAmount : Number(foundDeposit.amount);

          if (usdtBalance) {
            await prisma.balance.update({
              where: { id: usdtBalance.id },
              data: {
                amount: Number(usdtBalance.amount) + finalAmount,
                updatedAt: new Date(),
              },
            });
          } else {
            await prisma.balance.create({
              data: {
                userId: depositUser.id,
                currency: "USDT",
                amount: finalAmount,
                locked: 0,
              },
            });
          }

          const depositTransaction = await prisma.transaction.create({
            data: {
              userId: depositUser.id,
              type: "DEPOSIT",
              amount: finalAmount,
              currency: "USDT",
              balance: (usdtBalance ? Number(usdtBalance.amount) : 0) + finalAmount,
              description: `USDT deposit via ${network} - ${finalAmount} USDT`,
              metadata: {
                depositId: foundDeposit.id,
                network: network,
                transactionHash: transaction_id,
                externalId: external_id,
                provider: paymentService.name,
              },
              createdAt: new Date(),
            },
          });

          await prisma.deposit.update({
            where: { id: foundDeposit.id },
            data: { transactionId: depositTransaction.id },
          });

          if (depositUser.email && depositUser.name) {
            console.log(`Deposit confirmed for user ${depositUser.email}: ${finalAmount} USDT`);
          }
        }

        if (webhookEventId) {
          try {
            await prisma.webhookEvent.update({
              where: { id: webhookEventId },
              data: {
                processed: true,
                error: null,
              },
            });
          } catch (dbError) {
            // Ignore if model doesn't exist
          }
        }

        return NextResponse.json({
          success: true,
          message: "Crypto deposit webhook processed",
          depositId: foundDeposit.id,
          depositStatus: depositStatus,
        });
      } else {
        console.log("Crypto deposit not found, continuing to other handlers", {
          external_id,
          transaction_id,
        });
      }
    }

    if (isWithdrawalWebhook) {
      let foundWithdrawal = await prisma.withdrawal.findFirst({
        where: {
          externalId: external_id,
        },
        include: {
          transaction: true,
        },
      });

      if (!foundWithdrawal && transaction_id) {
        foundWithdrawal = await prisma.withdrawal.findFirst({
          where: {
            hash: transaction_id,
          },
          include: {
            transaction: true,
          },
        });
      }

      if (foundWithdrawal) {
        const withdrawalUser = await prisma.user.findUnique({
          where: { id: foundWithdrawal.userId },
          select: { name: true, email: true },
        });

        let withdrawalStatus:
          | "PENDING"
          | "PROCESSING"
          | "COMPLETED"
          | "FAILED"
          | "CANCELLED" = foundWithdrawal.status;

        if (
          eventType === "transaction.completed" ||
          eventType === "withdrawal.completed" ||
          eventType === "payment.completed" ||
          status === "completed" ||
          status === "COMPLETED"
        ) {
          withdrawalStatus = "COMPLETED";
        } else if (
          eventType === "transaction.failed" ||
          eventType === "withdrawal.failed" ||
          eventType === "payment.failed" ||
          status === "failed" ||
          status === "FAILED"
        ) {
          withdrawalStatus = "FAILED";
        } else if (
          eventType === "transaction.processing" ||
          status === "processing" ||
          status === "PROCESSING"
        ) {
          withdrawalStatus = "PROCESSING";
        }

        const updatedWithdrawal = await prisma.withdrawal.update({
          where: { id: foundWithdrawal.id },
          data: {
            status: withdrawalStatus,
            hash: transaction_id || foundWithdrawal.hash,
            fee: webhookData.fee || foundWithdrawal.fee,
            netAmount:
              webhookData.amount ||
              webhookData.net_amount ||
              foundWithdrawal.netAmount,
          },
        });

        if (
          withdrawalStatus === "COMPLETED" &&
          withdrawalUser?.email &&
          withdrawalUser?.name
        ) {
          const withdrawalTransaction = await prisma.transaction.findFirst({
            where: {
              userId: foundWithdrawal.userId,
              type: "WITHDRAWAL",
              metadata: {
                path: ["withdrawalId"],
                equals: foundWithdrawal.id,
              },
            },
          });

          sendWithdrawalReceipt({
            userName: withdrawalUser.name,
            userEmail: withdrawalUser.email,
            amount: Number(foundWithdrawal.amount),
            networkFee: Number(updatedWithdrawal.fee || 0),
            netAmount: Number(
              updatedWithdrawal.netAmount || foundWithdrawal.amount
            ),
            network: foundWithdrawal.network || "UNKNOWN",
            walletAddress: foundWithdrawal.walletAddress || "",
            transactionHash: updatedWithdrawal.hash || undefined,
            transactionId: foundWithdrawal.externalId || undefined,
            date: new Date(),
            status: withdrawalStatus,
          })
            .then(async (result) => {
              if (withdrawalTransaction) {
                const metadata =
                  (withdrawalTransaction.metadata as Record<string, unknown>) ||
                  {};
                const receiptHistory =
                  (metadata.receiptHistory as Array<{
                    sentAt: string;
                    success: boolean;
                    error?: string;
                  }>) || [];

                receiptHistory.push({
                  sentAt: new Date().toISOString(),
                  success: result.success,
                  ...(result.message && !result.success
                    ? { error: result.message }
                    : {}),
                });

                await prisma.transaction.update({
                  where: { id: withdrawalTransaction.id },
                  data: {
                    metadata: {
                      ...metadata,
                      receiptHistory,
                      lastReceiptSentAt: new Date().toISOString(),
                      lastReceiptSuccess: result.success,
                    },
                  },
                });
              }
            })
            .catch((error) => {
              console.error("Failed to send withdrawal receipt email:", error);
            });
        }

        if (webhookEventId) {
          try {
            await prisma.webhookEvent.update({
              where: { id: webhookEventId },
              data: {
                processed: true,
                error: null,
              },
            });
          } catch (dbError) {
            // Ignore if model doesn't exist
          }
        }

        return NextResponse.json({
          success: true,
          message: "Withdrawal webhook processed",
          withdrawalId: foundWithdrawal.id,
          withdrawalStatus: withdrawalStatus,
        });
      } else {
        console.log("Withdrawal not found, trying order matching", {
          external_id,
          transaction_id,
        });
      }
    }

    // Find the order by matching webhook data
    // Matching strategy:
    // 1. PRIMARY: Match order.externalOrderId with webhook transaction_id
    // 2. FALLBACK: Match order.externalOrderId with webhook external_id
    // 3. FALLBACK: Match via deposit.externalId
    // 4. FALLBACK: Match via deposit.externalId with transaction_id

    let order = await prisma.order.findFirst({
      where: {
        externalOrderId: transaction_id,
      },
      include: { user: true },
    });

    if (!order && external_id) {
      const orderByExternalId = await prisma.order.findFirst({
        where: {
          externalOrderId: external_id,
        },
        include: { user: true },
      });
      if (orderByExternalId) {
        order = orderByExternalId;

        if (transaction_id && transaction_id !== external_id) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              externalOrderId: transaction_id,
            },
          });
          order.externalOrderId = transaction_id;
        }
      }
    }

    if (!order) {
      if (external_id) {
        const deposit = await prisma.deposit.findFirst({
          where: {
            externalId: external_id,
          },
        });

        if (deposit) {
          const matchingOrder = await prisma.order.findFirst({
            where: {
              userId: deposit.userId,
              total: deposit.amount,
              createdAt: {
                gte: new Date(deposit.createdAt.getTime() - 60000),
                lte: new Date(deposit.createdAt.getTime() + 60000),
              },
            },
            include: { user: true },
          });

          if (matchingOrder) {
            order = matchingOrder;
          }
        }
      }

      if (!order && transaction_id) {
        const deposit = await prisma.deposit.findFirst({
          where: {
            externalId: transaction_id,
          },
        });

        if (deposit) {
          const matchingOrder = await prisma.order.findFirst({
            where: {
              userId: deposit.userId,
              total: deposit.amount,
              createdAt: {
                gte: new Date(deposit.createdAt.getTime() - 60000),
                lte: new Date(deposit.createdAt.getTime() + 60000),
              },
            },
            include: { user: true },
          });

          if (matchingOrder) {
            order = matchingOrder;
          }
        }
      }
    }

    if (!order) {
      const recentOrders = await prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          externalOrderId: true,
          status: true,
          total: true,
          userId: true,
          createdAt: true,
        },
      });

      const recentDeposits = await prisma.deposit.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          externalId: true,
          status: true,
          amount: true,
          userId: true,
          createdAt: true,
        },
      });

      console.error("Order not found", {
        transaction_id,
        external_id,
        recentOrdersCount: recentOrders.length,
        recentDepositsCount: recentDeposits.length,
      });

      if (webhookEventId) {
        try {
          await prisma.webhookEvent.update({
            where: { id: webhookEventId },
            data: {
              processed: false,
              error: `Order not found. transaction_id: ${transaction_id}, external_id: ${external_id}`,
            },
          });
        } catch (dbError) {
          // Ignore if model doesn't exist
        }
      }

      return NextResponse.json(
        {
          error: "Order not found",
          details: {
            transaction_id,
            external_id,
          },
        },
        { status: 404 }
      );
    }

    // Update webhook event with matched order ID
    if (webhookEventId) {
      try {
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: { orderId: order.id },
        });
      } catch (dbError) {
        // Ignore if model doesn't exist
      }
    }

    // Update order status based on webhook event type and status
    let orderStatus:
      | "PENDING"
      | "EXECUTING"
      | "COMPLETED"
      | "FAILED"
      | "CANCELLED" = order.status;

    if (
      eventType === "transaction.completed" ||
      eventType === "payment.completed" ||
      eventType === "payment.confirmed" ||
      status === "completed" ||
      status === "COMPLETED"
    ) {
      orderStatus = "COMPLETED";
    } else if (
      eventType === "transaction.failed" ||
      eventType === "payment.failed" ||
      status === "failed" ||
      status === "FAILED"
    ) {
      orderStatus = "FAILED";
    } else if (
      eventType === "transaction.created" ||
      eventType === "transaction.pending" ||
      eventType === "payment.created" ||
      eventType === "payment.pending" ||
      status === "pending" ||
      status === "PENDING"
    ) {
      orderStatus = "PENDING";
    } else if (
      eventType === "transaction.refunded" ||
      eventType === "payment.refunded" ||
      status === "refunded" ||
      status === "REFUNDED"
    ) {
      orderStatus = "CANCELLED";
    } else if (
      status === "executing" ||
      status === "EXECUTING" ||
      eventType === "transaction.executing"
    ) {
      orderStatus = "EXECUTING";
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: orderStatus,
        executedAt:
          orderStatus === "COMPLETED"
            ? new Date()
            : orderStatus === "FAILED"
            ? null
            : order.executedAt,
      },
    });

    // Update deposit status
    let deposit = await prisma.deposit.findFirst({
      where: {
        OR: [
          { externalId: external_id },
          { externalId: transaction_id },
          { paymentId: transaction_id },
          { paymentId: external_id },
          ...(order.externalOrderId
            ? [{ externalId: order.externalOrderId }]
            : []),
          ...(order.externalOrderId
            ? [{ paymentId: order.externalOrderId }]
            : []),
        ],
      },
    });

    if (!deposit && order) {
      deposit = await prisma.deposit.findFirst({
        where: {
          userId: order.userId,
          amount: order.total,
          paymentMethod: "PIX",
          createdAt: {
            gte: new Date(order.createdAt.getTime() - 300000),
            lte: new Date(order.createdAt.getTime() + 300000),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    if (!deposit && order) {
      const orderTotal = Number(order.total);
      const minAmount = orderTotal * 0.99;
      const maxAmount = orderTotal * 1.01;

      deposit = await prisma.deposit.findFirst({
        where: {
          userId: order.userId,
          paymentMethod: "PIX",
          amount: {
            gte: new Decimal(minAmount),
            lte: new Decimal(maxAmount),
          },
          createdAt: {
            gte: new Date(order.createdAt.getTime() - 300000),
            lte: new Date(order.createdAt.getTime() + 300000),
          },
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    if (deposit) {
      const depositStatus =
        status === "completed" ||
        status === "COMPLETED" ||
        eventType === "transaction.completed" ||
        eventType === "payment.completed" ||
        eventType === "payment.confirmed" ||
        orderStatus === "COMPLETED"
          ? "CONFIRMED"
          : status === "failed" ||
            status === "FAILED" ||
            eventType === "transaction.failed" ||
            eventType === "payment.failed" ||
            orderStatus === "FAILED"
          ? "REJECTED"
          : "PENDING";

      await prisma.deposit.update({
        where: { id: deposit.id },
        data: {
          status: depositStatus,
          confirmedAt:
            depositStatus === "CONFIRMED" ? new Date() : deposit.confirmedAt,
          ...(transaction_id ? { paymentId: transaction_id } : {}),
          ...(status ? { paymentStatus: status.toUpperCase() } : {}),
        },
      });

      console.log(`✅ Deposit ${deposit.id} updated to ${depositStatus}`, {
        depositId: deposit.id,
        depositStatus,
        orderStatus,
        webhookStatus: status,
        eventType,
      });
    } else {
      const fallbackDeposit = await prisma.deposit.findFirst({
        where: {
          userId: order.userId,
          paymentMethod: "PIX",
          status: "PENDING",
          createdAt: {
            gte: new Date(order.createdAt.getTime() - 600000),
            lte: new Date(order.createdAt.getTime() + 600000),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (fallbackDeposit && orderStatus === "COMPLETED") {
        deposit = fallbackDeposit;

        const depositStatus = "CONFIRMED";
        await prisma.deposit.update({
          where: { id: deposit.id },
          data: {
            status: depositStatus,
            confirmedAt: new Date(),
          },
        });

        console.log(
          `✅ Deposit ${deposit.id} updated to ${depositStatus} (fallback match)`,
          {
            depositId: deposit.id,
            depositStatus,
            orderStatus,
            webhookStatus: status,
            eventType,
          }
        );
      } else {
        console.warn("⚠️ Deposit not found for order", {
          orderId: order.id,
          external_id,
          transaction_id,
          orderExternalOrderId: order.externalOrderId,
          userId: order.userId,
          orderTotal: order.total,
          fallbackDepositFound: !!fallbackDeposit,
        });
      }
    }

    // Handle payment completion - credit user balance
    if (
      eventType === "transaction.completed" ||
      eventType === "payment.completed" ||
      status === "completed" ||
      orderStatus === "COMPLETED"
    ) {
      const usdtAmount = usdt_amount || Number(order.amount);

      // Check if balance was already updated (prevent double credit)
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          userId: order.userId,
          currency: "USDT",
          metadata: {
            path: ["orderId"],
            equals: order.id,
          },
        },
      });

      if (!existingTransaction) {
        await ledgerService.updateBalance(
          order.userId,
          "USDT",
          new Decimal(usdtAmount),
          "ADD"
        );

        const transaction = await ledgerService.createTransaction({
          userId: order.userId,
          type: "BUY_CRYPTO",
          amount: new Decimal(usdtAmount),
          currency: "USDT",
          description: `USDT purchase via PIX - ${usdtAmount} USDT`,
          metadata: {
            orderId: order.id,
            depositId: deposit?.id,
            transactionId: transaction_id,
            amountBRL: amount || Number(order.total),
            amountUSDT: usdtAmount,
            exchangeRate: (amount || Number(order.total)) / usdtAmount,
            source: `${paymentService.name}_webhook`,
          },
        });

        await prisma.order.update({
          where: { id: order.id },
          data: {
            transactionId: transaction.id,
          },
        });

        const purchaseUser = await prisma.user.findUnique({
          where: { id: order.userId },
          select: { name: true, email: true },
        });

        if (purchaseUser?.email && purchaseUser?.name) {
          const totalAmount = amount || Number(order.total);
          const feeBreakdown = calculateFeeBreakdown(totalAmount);

          // In-app notification
          try {
            await prisma.notification.create({
              data: {
                userId: order.userId,
                type: "receipt_ready",
                title:
                  "Pagamento confirmado! Recibo disponível.",
                message: `Seu depósito de R$ ${totalAmount.toFixed(2)} foi confirmado. Você recebeu ${usdtAmount.toFixed(2)} USDT. Verifique o histórico na página Depositar.`,
                metadata: {
                  orderId: order.id,
                  transactionId: transaction?.id,
                  amountBRL: totalAmount,
                  amountUSDT: usdtAmount,
                },
              },
            });
          } catch (notificationErr) {
            console.error("Failed to create receipt notification:", notificationErr);
          }

          sendPurchaseReceipt({
            userName: purchaseUser.name,
            userEmail: purchaseUser.email,
            amountBRL: feeBreakdown.baseAmount,
            amountUSDT: usdtAmount,
            exchangeRate: totalAmount / usdtAmount,
            fee: feeBreakdown.totalFee,
            totalPaid: totalAmount,
            transactionId: transaction_id || order.externalOrderId || order.id,
            date: new Date(),
            paymentMethod: "PIX",
          })
            .then(async (result) => {
              if (transaction) {
                const metadata =
                  (transaction.metadata as Record<string, unknown>) || {};
                const receiptHistory =
                  (metadata.receiptHistory as Array<{
                    sentAt: string;
                    success: boolean;
                    error?: string;
                  }>) || [];

                receiptHistory.push({
                  sentAt: new Date().toISOString(),
                  success: result.success,
                  ...(result.message && !result.success
                    ? { error: result.message }
                    : {}),
                });

                await prisma.transaction.update({
                  where: { id: transaction.id },
                  data: {
                    metadata: {
                      ...metadata,
                      receiptHistory,
                      lastReceiptSentAt: new Date().toISOString(),
                      lastReceiptSuccess: result.success,
                    },
                  },
                });
              }
            })
            .catch((error) => {
              console.error("Failed to send purchase receipt email:", error);
            });
        }
      }
    }

    // Handle payment failure - ROLLBACK all data
    if (
      eventType === "transaction.failed" ||
      eventType === "payment.failed" ||
      status === "failed" ||
      status === "FAILED" ||
      orderStatus === "FAILED"
    ) {
      const usdtAmount = usdt_amount || Number(order.amount);

      const relatedTransactions = await prisma.transaction.findMany({
        where: {
          userId: order.userId,
          currency: "USDT",
          type: "BUY_CRYPTO",
          OR: [
            {
              metadata: {
                path: ["orderId"],
                equals: order.id,
              },
            },
            {
              metadata: {
                path: ["transactionId"],
                equals: transaction_id,
              },
            },
          ],
        },
      });

      for (const transaction of relatedTransactions) {
        const transactionAmount = Number(transaction.amount);

        await ledgerService.updateBalance(
          order.userId,
          "USDT",
          new Decimal(transactionAmount),
          "SUBTRACT"
        );

        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            type: "REFUND",
            description: `Payment failed - refunded ${transactionAmount} USDT`,
            metadata: {
              ...(transaction.metadata as Record<string, unknown>),
              refunded: true,
              refundReason: "Payment failed via webhook",
              refundedAt: new Date().toISOString(),
            },
          },
        });
      }

      if (relatedTransactions.length === 0 && order.status === "COMPLETED") {
        await ledgerService.updateBalance(
          order.userId,
          "USDT",
          new Decimal(usdtAmount),
          "SUBTRACT"
        );
      }
    }

    // Mark webhook as successfully processed
    if (webhookEventId) {
      try {
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            processed: true,
            orderId: order.id,
            error: null,
          },
        });
      } catch (dbError) {
        // Ignore if model doesn't exist
      }
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed",
      orderId: order.id,
      orderStatus: orderStatus,
      balanceUpdated:
        eventType === "transaction.completed" ||
        eventType === "payment.completed" ||
        status === "completed",
      webhookEventId: webhookEventId,
    });
  } catch (error) {
    console.error("Webhook error:", error);

    if (webhookEventId) {
      try {
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            processed: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      } catch (dbError) {
        // Ignore if model doesn't exist
      }
    }

    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
