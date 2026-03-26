import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { paymentService, calculateFeeBreakdown } from "@/lib/payment";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";
import {
  sendPurchaseReceipt,
  sendWithdrawalReceipt,
} from "@/lib/receipt-email";

/**
 * Mercado Pago Webhook Handler
 * 
 * Mercado Pago sends webhooks with the following format:
 * {
 *   "action": "payment.updated",
 *   "api_version": "v1",
 *   "data": { "id": "123456789" },
 *   "date_created": "2024-01-01T00:00:00Z",
 *   "id": 12345,
 *   "live_mode": true,
 *   "type": "payment",
 *   "user_id": "123456"
 * }
 * 
 * We then fetch the full payment details from the API using the payment ID.
 */

/** Map Mercado Pago statuses to canonical event types */
function mapMPStatusToEventType(status: string): string {
  switch (status) {
    case "approved":
    case "authorized":
      return "payment.completed";
    case "rejected":
    case "cancelled":
    case "charged_back":
      return "payment.failed";
    case "refunded":
      return "payment.refunded";
    case "pending":
    case "in_process":
    case "in_mediation":
      return "payment.pending";
    default:
      return "payment.pending";
  }
}

// Allow GET requests for webhook URL verification/testing
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Mercado Pago webhook endpoint is active",
    endpoint: "/api/webhooks/mercadopago",
    provider: paymentService.name,
    timestamp: new Date().toISOString(),
    note: "This endpoint accepts POST requests from Mercado Pago webhooks",
  });
}

export async function POST(request: NextRequest) {
  let webhookEventId: string | null = null;
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Mercado Pago webhook notification format
    const notificationType = body.type; // "payment", "plan", "subscription", "invoice"
    const action = body.action; // "payment.created", "payment.updated"
    const dataId = body.data?.id; // Payment ID

    // If this is not a payment notification, acknowledge and skip
    if (notificationType !== "payment" && !action?.startsWith("payment.")) {
      return NextResponse.json({
        success: true,
        message: `Non-payment notification type: ${notificationType || action}`,
        skipped: true,
      });
    }

    if (!dataId) {
      return NextResponse.json(
        { error: "Missing payment ID in webhook data" },
        { status: 400 }
      );
    }

    // Store raw webhook event first for debugging (minimal data)
    let initialWebhookEvent;
    try {
      initialWebhookEvent = await prisma.webhookEvent.create({
        data: {
          eventType: action || notificationType || "unknown",
          source: "mercadopago",
          payload: body,
          transactionId: dataId?.toString(),
          status: "RECEIVED",
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
          processed: false,
        },
      });
      webhookEventId = initialWebhookEvent.id;
    } catch (e) {
      console.error("Failed to store initial webhook event:", e);
    }

    // Verify webhook signature
    const isValidSignature = await paymentService.verifyWebhookSignature(
      request,
      rawBody
    );

    const isDevelopment = process.env.NODE_ENV === "development";
    const isTestWebhook =
      isDevelopment && request.headers.get("x-test-webhook") === "true";

    if (!isValidSignature && !isTestWebhook) {
      const xSignature = request.headers.get("x-signature");
      console.error("Webhook signature verification failed:", {
        dataId,
        xSignature,
        isTestWebhook
      });
      
      if (webhookEventId) {
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: { 
            error: "Invalid signature",
            signatureValid: false 
          }
        }).catch(() => {});
      }
      
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // Update signature validity if it passed
    if (webhookEventId) {
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { signatureValid: true }
      }).catch(() => {});
    }


    // Fetch the full payment details from Mercado Pago API
    const paymentStatus = await paymentService.getTransactionStatus(dataId.toString());
    
    if (!paymentStatus) {
      console.warn("Could not fetch payment status from Mercado Pago API for ID:", dataId);
      // Store the webhook event anyway
      try {
        await prisma.webhookEvent.create({
          data: {
            eventType: action || `${notificationType}.unknown`,
            source: "mercadopago",
            payload: JSON.parse(JSON.stringify(body)),
            transactionId: dataId?.toString(),
            status: "UNKNOWN",
            ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
            userAgent: request.headers.get("user-agent") || "unknown",
            processed: false,
            error: "Could not fetch payment details from API",
          },
        });
      } catch { /* ignore */ }

      return NextResponse.json({
        success: true,
        message: "Webhook received but could not fetch payment details",
      });
    }

    // Extract data from the API response
    const paymentData = paymentStatus.raw as Record<string, unknown>;
    const mpStatus = (paymentData.status as string) || "unknown";
    const transaction_id = dataId.toString();
    const external_id = (paymentData.external_reference as string) || null;
    const status = mpStatus.toLowerCase();
    const eventType = mapMPStatusToEventType(mpStatus);
    const amount = paymentData.transaction_amount as number;


    // Update webhook event with full payment data
    if (webhookEventId) {
      try {
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            eventType: eventType,
            payload: JSON.parse(JSON.stringify({ ...body, fetchedPayment: paymentData })),
            externalId: external_id,
            status: status.toUpperCase(),
          },
        });
      } catch (dbError) {
        console.error("Failed to update webhook event with details:", dbError);
      }
    }


    if (!transaction_id && !external_id) {
      console.error("Webhook missing transaction_id and external_id");
      return NextResponse.json(
        { error: "Missing transaction_id and external_id" },
        { status: 400 }
      );
    }

    // Check if this is a withdrawal webhook
    const isWithdrawalWebhook = external_id?.startsWith("withdrawal_") || false;
    
    // Check if this is a crypto deposit webhook
    const isCryptoDepositWebhook = 
      external_id?.startsWith("deposit_") || false;

    // Handle crypto deposit webhooks
    if (isCryptoDepositWebhook && !isWithdrawalWebhook) {
      let foundDeposit = await prisma.deposit.findFirst({
        where: { externalId: external_id },
        include: { user: true, transaction: true },
      });

      if (!foundDeposit && transaction_id) {
        foundDeposit = await prisma.deposit.findFirst({
          where: {
            paymentMethod: "USDT",
            status: "PENDING",
            paymentId: transaction_id,
          },
          include: { user: true, transaction: true },
        });
      }

      if (foundDeposit) {
        const depositUser = foundDeposit.user;
        const networkMatch = external_id?.match(/deposit_.*_(TRC20|ERC20|BSC)_/);
        const network = networkMatch ? networkMatch[1] : "TRC20";
        
        let depositStatus: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" = 
          foundDeposit.status as "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";

        if (paymentStatus.isCompleted) {
          depositStatus = "CONFIRMED";
        } else if (paymentStatus.isFailed) {
          depositStatus = "REJECTED";
        }

        const depositAmount = amount || Number(foundDeposit.amount);
        
        await prisma.deposit.update({
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
            where: { userId: depositUser.id, currency: "USDT" },
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
                provider: "mercadopago",
              },
              createdAt: new Date(),
            },
          });

          await prisma.deposit.update({
            where: { id: foundDeposit.id },
            data: { transactionId: depositTransaction.id },
          });
        }

        if (webhookEventId) {
          try {
            await prisma.webhookEvent.update({
              where: { id: webhookEventId },
              data: { processed: true, error: null },
            });
          } catch { /* ignore */ }
        }

        return NextResponse.json({
          success: true,
          message: "Crypto deposit webhook processed",
          depositId: foundDeposit.id,
          depositStatus,
        });
      }
    }

    // Handle withdrawal webhooks
    if (isWithdrawalWebhook) {
      let foundWithdrawal = await prisma.withdrawal.findFirst({
        where: { externalId: external_id },
        include: { transaction: true },
      });

      if (!foundWithdrawal && transaction_id) {
        foundWithdrawal = await prisma.withdrawal.findFirst({
          where: { hash: transaction_id },
          include: { transaction: true },
        });
      }

      if (foundWithdrawal) {
        const withdrawalUser = await prisma.user.findUnique({
          where: { id: foundWithdrawal.userId },
          select: { name: true, email: true },
        });

        let withdrawalStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" =
          foundWithdrawal.status;

        if (paymentStatus.isCompleted) {
          withdrawalStatus = "COMPLETED";
        } else if (paymentStatus.isFailed) {
          withdrawalStatus = "FAILED";
        }

        await prisma.withdrawal.update({
          where: { id: foundWithdrawal.id },
          data: {
            status: withdrawalStatus,
            hash: transaction_id || foundWithdrawal.hash,
          },
        });

        if (withdrawalStatus === "COMPLETED" && withdrawalUser?.email && withdrawalUser?.name) {
          sendWithdrawalReceipt({
            userName: withdrawalUser.name,
            userEmail: withdrawalUser.email,
            amount: Number(foundWithdrawal.amount),
            networkFee: Number(foundWithdrawal.fee || 0),
            netAmount: Number(foundWithdrawal.netAmount || foundWithdrawal.amount),
            network: foundWithdrawal.network || "UNKNOWN",
            walletAddress: foundWithdrawal.walletAddress || "",
            transactionHash: transaction_id || undefined,
            transactionId: foundWithdrawal.externalId || undefined,
            date: new Date(),
            status: withdrawalStatus,
          }).catch((error) => {
            console.error("Failed to send withdrawal receipt email:", error);
          });
        }

        if (webhookEventId) {
          try {
            await prisma.webhookEvent.update({
              where: { id: webhookEventId },
              data: { processed: true, error: null },
            });
          } catch { /* ignore */ }
        }

        return NextResponse.json({
          success: true,
          message: "Withdrawal webhook processed",
          withdrawalId: foundWithdrawal.id,
          withdrawalStatus,
        });
      }
    }

    // ─── Find the order by matching webhook data ───────────────────────────
    // Match by transaction_id (MP payment ID) or external_reference (our externalId)
    let order = await prisma.order.findFirst({
      where: { externalOrderId: transaction_id },
      include: { user: true },
    });

    if (!order && external_id) {
      const orderByExternalId = await prisma.order.findFirst({
        where: { externalOrderId: external_id },
        include: { user: true },
      });
      if (orderByExternalId) {
        order = orderByExternalId;
        if (transaction_id && transaction_id !== external_id) {
          await prisma.order.update({
            where: { id: order.id },
            data: { externalOrderId: transaction_id },
          });
          order.externalOrderId = transaction_id;
        }
      }
    }

    // Fallback: find via deposit
    if (!order && external_id) {
      const deposit = await prisma.deposit.findFirst({
        where: { externalId: external_id },
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
        if (matchingOrder) order = matchingOrder;
      }
    }

    if (!order && transaction_id) {
      const deposit = await prisma.deposit.findFirst({
        where: { externalId: transaction_id },
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
        if (matchingOrder) order = matchingOrder;
      }
    }

    if (!order) {
      console.error("Order not found", { transaction_id, external_id });

      if (webhookEventId) {
        try {
          await prisma.webhookEvent.update({
            where: { id: webhookEventId },
            data: {
              processed: false,
              error: `Order not found. transaction_id: ${transaction_id}, external_id: ${external_id}`,
            },
          });
        } catch { /* ignore */ }
      }

      return NextResponse.json(
        { error: "Order not found", details: { transaction_id, external_id } },
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
      } catch { /* ignore */ }
    }

    // Determine order status from Mercado Pago status
    let orderStatus: "PENDING" | "EXECUTING" | "COMPLETED" | "FAILED" | "CANCELLED" = order.status;

    if (paymentStatus.isCompleted) {
      orderStatus = "COMPLETED";
    } else if (paymentStatus.isFailed) {
      orderStatus = "FAILED";
    } else if (status === "in_process" || status === "in_mediation") {
      orderStatus = "EXECUTING";
    }

    await prisma.order.update({
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
          { externalId: external_id || "" },
          { externalId: transaction_id },
          { paymentId: transaction_id },
          { paymentId: external_id || "" },
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
        orderBy: { createdAt: "desc" },
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
        orderBy: { createdAt: "desc" },
      });
    }

    if (deposit) {
      const depositStatus = paymentStatus.isCompleted
        ? "CONFIRMED"
        : paymentStatus.isFailed
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

      console.log(`✅ Deposit ${deposit.id} updated to ${depositStatus}`);
    } else {
      // Fallback deposit matching
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
        orderBy: { createdAt: "desc" },
      });

      if (fallbackDeposit && orderStatus === "COMPLETED") {
        deposit = fallbackDeposit;
        await prisma.deposit.update({
          where: { id: deposit.id },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
          },
        });
        console.log(`✅ Deposit ${deposit.id} updated to CONFIRMED (fallback match)`);
      } else {
        console.warn("⚠️ Deposit not found for order", {
          orderId: order.id,
          external_id,
          transaction_id,
        });
      }
    }

    // Handle payment completion - credit user balance
    if (paymentStatus.isCompleted || orderStatus === "COMPLETED") {
      const usdtAmount = Number(order.amount);

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
            source: "mercadopago_webhook",
          },
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { transactionId: transaction.id },
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
                title: "Pagamento confirmado! Recibo disponível.",
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
          }).catch((error) => {
            console.error("Failed to send purchase receipt email:", error);
          });
        }
      }
    }

    // Handle payment failure - ROLLBACK
    if (paymentStatus.isFailed || orderStatus === "FAILED") {
      const usdtAmount = Number(order.amount);

      const relatedTransactions = await prisma.transaction.findMany({
        where: {
          userId: order.userId,
          currency: "USDT",
          type: "BUY_CRYPTO",
          OR: [
            { metadata: { path: ["orderId"], equals: order.id } },
            { metadata: { path: ["transactionId"], equals: transaction_id } },
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
              refundReason: "Payment failed via Mercado Pago webhook",
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
          data: { processed: true, orderId: order.id, error: null },
        });
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed",
      orderId: order.id,
      orderStatus: orderStatus,
      balanceUpdated: paymentStatus.isCompleted,
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
      } catch { /* ignore */ }
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
