import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nutzPayService } from "@/lib/nutzpay";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";
import {
  sendPurchaseReceipt,
  sendWithdrawalReceipt,
} from "@/lib/receipt-email";

// Allow GET requests for webhook URL verification/testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "Webhook endpoint is active",
    endpoint: "/api/webhooks/nutzpay",
    timestamp: new Date().toISOString(),
    note: "This endpoint accepts POST requests from NutzPay webhooks",
  });
}

export async function POST(request: NextRequest) {
  let webhookEventId: string | null = null;
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Extract webhook metadata
    // NutzPay can send webhooks in two formats:
    // 1. Nested: { event: "...", data: { transaction_id: "...", status: "..." } }
    // 2. Flat: { event: "...", transaction_id: "...", status: "..." }
    const eventType = body.event || "transaction.unknown";
    const webhookData = body.data || body; // Use nested data if present, otherwise use body itself

    // Extract transaction_id from either nested data or top-level
    const transaction_id = webhookData.transaction_id || body.transaction_id;
    const external_id = webhookData.external_id || body.external_id;
    const status = (
      webhookData.status ||
      body.status ||
      "pending"
    )?.toLowerCase();
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
          source: "nutzpay",
          payload: JSON.parse(JSON.stringify(body)),
          transactionId: transaction_id,
          externalId: external_id,
          status: status.toUpperCase(),
          ipAddress: ipAddress,
          userAgent: userAgent,
          processed: false, // Will be updated after processing
        },
      });
      webhookEventId = webhookEvent.id;
    } catch (dbError) {
      // If WebhookEvent model doesn't exist yet (migration not run), continue silently
    }

    // Verify webhook signature (required by NutzPay)
    const isValidSignature = await nutzPayService.verifyWebhookSignature(
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

      // Mark webhook as failed
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

    // Extract fields from NutzPay payload structure
    // Handle both nested (body.data) and flat (body) payload formats
    const amount =
      webhookData.amount ||
      body.amount ||
      webhookData.value ||
      body.value ||
      webhookData.amount_paid_brl ||
      body.amount_paid_brl;
    const currency = webhookData.currency || body.currency || "BRL";
    const type =
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
      webhookData.amount ||
      body.amount;
    const created_at =
      webhookData.created_at ||
      body.created_at ||
      webhookData.createdAt ||
      body.createdAt;
    const completed_at =
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
          note: "NutzPay webhooks must include transaction_id or external_id",
        },
        { status: 400 }
      );
    }

    // Check if this is a withdrawal webhook (external_id starts with "withdrawal_")
    const isWithdrawalWebhook = external_id?.startsWith("withdrawal_") || false;
    
    // Check if this is a crypto deposit webhook (external_id starts with "deposit_" or eventType indicates deposit)
    const isCryptoDepositWebhook = 
      external_id?.startsWith("deposit_") || 
      eventType?.includes("deposit") ||
      eventType?.includes("crypto.received") ||
      false;

    // Handle crypto deposit webhooks first (before withdrawals)
    if (isCryptoDepositWebhook && !isWithdrawalWebhook) {
      // Find deposit by externalId
      let foundDeposit = await prisma.deposit.findFirst({
        where: {
          externalId: external_id,
        },
        include: {
          user: true,
          transaction: true,
        },
      });

      // If not found by externalId, try to find by paymentId (deposit address)
      if (!foundDeposit && transaction_id) {
        foundDeposit = await prisma.deposit.findFirst({
          where: {
            paymentMethod: "USDT",
            status: "PENDING",
            paymentId: transaction_id, // Match by address if stored
          },
          include: {
            user: true,
            transaction: true,
          },
        });
      }

      if (foundDeposit) {
        const depositUser = foundDeposit.user;
        
        // Extract network from externalId or webhook data
        const networkMatch = external_id?.match(/deposit_.*_(TRC20|ERC20|BSC)_/);
        const network = networkMatch ? networkMatch[1] : 
          webhookData.network || body.network || "TRC20";
        
        // Determine deposit status from webhook
        let depositStatus: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" = 
          foundDeposit.status as "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";

        if (
          eventType === "transaction.completed" ||
          eventType === "deposit.completed" ||
          eventType === "crypto.received" ||
          status === "completed" ||
          status === "COMPLETED"
        ) {
          depositStatus = "CONFIRMED";
        } else if (
          eventType === "transaction.failed" ||
          eventType === "deposit.failed" ||
          status === "failed" ||
          status === "FAILED"
        ) {
          depositStatus = "REJECTED";
        }

        // Extract amount from webhook (if provided)
        const depositAmount = amount || usdt_amount || Number(foundDeposit.amount);
        
        // Update deposit with webhook data
        const updatedDeposit = await prisma.deposit.update({
          where: { id: foundDeposit.id },
          data: {
            status: depositStatus,
            amount: depositAmount > 0 ? new Decimal(depositAmount) : foundDeposit.amount, // Update with actual received amount if provided
            confirmedAt: depositStatus === "CONFIRMED" ? new Date() : foundDeposit.confirmedAt,
            paymentId: transaction_id || foundDeposit.paymentId, // Store transaction hash
            paymentStatus: status?.toUpperCase() || foundDeposit.paymentStatus,
            paymentAmount: amount ? new Decimal(amount) : foundDeposit.paymentAmount,
          },
        });

        // If deposit is confirmed, credit user balance
        if (depositStatus === "CONFIRMED" && !foundDeposit.transaction) {
          // Update USDT balance
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
            // Create USDT balance if it doesn't exist
            await prisma.balance.create({
              data: {
                userId: depositUser.id,
                currency: "USDT",
                amount: finalAmount,
                locked: 0,
              },
            });
          }

          // Create transaction record
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
              },
              createdAt: new Date(),
            },
          });

          // Link deposit to transaction
          await prisma.deposit.update({
            where: { id: foundDeposit.id },
            data: { transactionId: depositTransaction.id },
          });

          // Send deposit confirmation email (don't await to avoid blocking)
          if (depositUser.email && depositUser.name) {
            // TODO: Implement sendDepositConfirmationEmail function
            console.log(`Deposit confirmed for user ${depositUser.email}: ${finalAmount} USDT`);
          }
        }

        // Mark webhook as processed
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
      // Handle withdrawal webhook - try to find by externalId first
      let foundWithdrawal = await prisma.withdrawal.findFirst({
        where: {
          externalId: external_id,
        },
        include: {
          transaction: true,
        },
      });

      // If not found by externalId, try by transaction_id (hash)
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
        // Get user info for email
        const withdrawalUser = await prisma.user.findUnique({
          where: { id: foundWithdrawal.userId },
          select: { name: true, email: true },
        });

        // Determine withdrawal status from webhook
        let withdrawalStatus:
          | "PENDING"
          | "PROCESSING"
          | "COMPLETED"
          | "FAILED"
          | "CANCELLED" = foundWithdrawal.status;

        if (
          eventType === "transaction.completed" ||
          eventType === "withdrawal.completed" ||
          status === "completed" ||
          status === "COMPLETED"
        ) {
          withdrawalStatus = "COMPLETED";
        } else if (
          eventType === "transaction.failed" ||
          eventType === "withdrawal.failed" ||
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

        // Update withdrawal status
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

        // Send withdrawal receipt email when completed (don't await to avoid blocking)
        if (
          withdrawalStatus === "COMPLETED" &&
          withdrawalUser?.email &&
          withdrawalUser?.name
        ) {
          // Find the transaction associated with this withdrawal
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
              // Track receipt in transaction metadata if transaction exists
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
              // Don't fail the webhook if email fails
            });
        }

        // Mark webhook as processed
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
        // Withdrawal not found, continue to try order matching
        console.log("Withdrawal not found, trying order matching", {
          external_id,
          transaction_id,
        });
      }
    }

    // Find the order by matching webhook data
    // According to NutzPay webhook documentation:
    // - transaction_id: REQUIRED - PIX transaction ID (e.g., "txn_abc123" or "136829151240")
    // - external_id: OPTIONAL - Our original ID (may not be in webhook payload)
    //
    // We store:
    // - order.externalOrderId = PIX transaction ID from NutzPay response (e.g., "136829151240")
    // - deposit.externalId = Our original external ID (e.g., "purchase_user123_timestamp")
    //
    // Matching strategy (transaction_id is ALWAYS present, external_id is OPTIONAL):
    // 1. PRIMARY: Match order.externalOrderId with webhook transaction_id (PIX transaction ID) - ALWAYS TRY THIS FIRST
    // 2. FALLBACK: If external_id exists, match order.externalOrderId with webhook external_id
    // 3. FALLBACK: If external_id exists, match via deposit.externalId with webhook external_id
    // 4. FALLBACK: Match via deposit.externalId with webhook transaction_id

    // PRIMARY MATCH: Try matching by transaction_id first (from NutzPay)
    // This is the transaction_id that NutzPay returns after payment is processed
    let order = await prisma.order.findFirst({
      where: {
        externalOrderId: transaction_id, // PRIMARY: Match NutzPay transaction ID
      },
      include: { user: true },
    });

    // SECONDARY MATCH: If not found, try matching by external_id
    // This is our original externalId that we send to NutzPay
    // It's set immediately when order is created, so webhook can match even if NutzPay hasn't responded yet
    if (!order && external_id) {
      const orderByExternalId = await prisma.order.findFirst({
        where: {
          externalOrderId: external_id, // Match our original externalId (set immediately on order creation)
        },
        include: { user: true },
      });
      if (orderByExternalId) {
        order = orderByExternalId;

        // If we matched by external_id but webhook has transaction_id, update the order
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

    // If not found, try finding by deposit externalId
    // The deposit stores our original externalId, which matches webhook's external_id
    // Since Deposit doesn't have a direct relation to Order, we need to find orders by userId and amount
    if (!order) {
      // Try matching by deposit externalId (our original ID)
      if (external_id) {
        const deposit = await prisma.deposit.findFirst({
          where: {
            externalId: external_id, // Match by our original externalId
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

      // Also try matching deposit by transaction_id
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
    // ALWAYS use webhook status as source of truth for pending/confirmed/failed
    // OrderStatus enum: PENDING, EXECUTING, COMPLETED, FAILED, CANCELLED
    let orderStatus:
      | "PENDING"
      | "EXECUTING"
      | "COMPLETED"
      | "FAILED"
      | "CANCELLED" = order.status; // Default to current status, but webhook will override

    // PRIORITY 1: Handle completed status from webhook (CONFIRMED)
    if (
      eventType === "transaction.completed" ||
      eventType === "payment.completed" ||
      eventType === "payment.confirmed" || // NutzPay also sends this event type
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
            : order.executedAt, // Keep existing executedAt if not completed/failed
      },
    });

    // Update deposit status - find by matching userId, amount, and creation time
    // Since deposit doesn't have direct relation to order, we match by these criteria
    let deposit = await prisma.deposit.findFirst({
      where: {
        OR: [
          { externalId: external_id },
          { externalId: transaction_id },
          { paymentId: transaction_id }, // Also check paymentId field (stores transaction_id from previous webhooks)
          { paymentId: external_id },
          // Also try matching by order's externalOrderId if it matches our original externalId
          ...(order.externalOrderId
            ? [{ externalId: order.externalOrderId }]
            : []),
          ...(order.externalOrderId
            ? [{ paymentId: order.externalOrderId }]
            : []),
        ],
      },
    });

    // If not found by externalId, try matching by order's userId and amount
    // Use a wider time window and allow for small amount differences (due to fee calculations)
    if (!deposit && order) {
      // First try exact amount match
      deposit = await prisma.deposit.findFirst({
        where: {
          userId: order.userId,
          amount: order.total,
          paymentMethod: "PIX",
          createdAt: {
            gte: new Date(order.createdAt.getTime() - 300000), // 5 minutes before
            lte: new Date(order.createdAt.getTime() + 300000), // 5 minutes after
          },
        },
        orderBy: {
          createdAt: "desc", // Get the most recent matching deposit
        },
      });
    }

    // If still not found, try matching by userId and approximate amount (within 1% difference)
    // This handles cases where amounts might differ slightly due to rounding
    if (!deposit && order) {
      const orderTotal = Number(order.total);
      const minAmount = orderTotal * 0.99; // 1% lower
      const maxAmount = orderTotal * 1.01; // 1% higher

      deposit = await prisma.deposit.findFirst({
        where: {
          userId: order.userId,
          paymentMethod: "PIX",
          amount: {
            gte: new Decimal(minAmount),
            lte: new Decimal(maxAmount),
          },
          createdAt: {
            gte: new Date(order.createdAt.getTime() - 300000), // 5 minutes before
            lte: new Date(order.createdAt.getTime() + 300000), // 5 minutes after
          },
          status: "PENDING", // Only match pending deposits
        },
        orderBy: {
          createdAt: "desc", // Get the most recent matching deposit
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
            depositStatus === "CONFIRMED" ? new Date() : deposit.confirmedAt, // Keep existing confirmedAt if already set
          // Store transaction_id in paymentId field for future webhook matching
          ...(transaction_id ? { paymentId: transaction_id } : {}),
          // Store payment status from webhook
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
      // Final fallback: Try to find any PENDING PIX deposit for this user around the order time
      // This is a last resort to ensure deposits get confirmed
      const fallbackDeposit = await prisma.deposit.findFirst({
        where: {
          userId: order.userId,
          paymentMethod: "PIX",
          status: "PENDING",
          createdAt: {
            gte: new Date(order.createdAt.getTime() - 600000), // 10 minutes before
            lte: new Date(order.createdAt.getTime() + 600000), // 10 minutes after
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (fallbackDeposit && orderStatus === "COMPLETED") {
        // Only use fallback if order is completed and we're confident it's the right deposit
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
        // Update USDT balance (add the USDT amount)
        await ledgerService.updateBalance(
          order.userId,
          "USDT",
          new Decimal(usdtAmount),
          "ADD"
        );

        // Create transaction record for USDT credit
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
            source: "nutzpay_webhook",
          },
        });

        // Link transaction to order
        await prisma.order.update({
          where: { id: order.id },
          data: {
            transactionId: transaction.id,
          },
        });

        // Send purchase receipt email (don't await to avoid blocking webhook)
        const purchaseUser = await prisma.user.findUnique({
          where: { id: order.userId },
          select: { name: true, email: true },
        });

        if (purchaseUser?.email && purchaseUser?.name) {
          const totalAmount = amount || Number(order.total);
          const fee = (totalAmount * 0.03) / 1.03; // 3% fee calculation
          const baseAmount = totalAmount - fee;

          sendPurchaseReceipt({
            userName: purchaseUser.name,
            userEmail: purchaseUser.email,
            amountBRL: baseAmount,
            amountUSDT: usdtAmount,
            exchangeRate: totalAmount / usdtAmount,
            fee: fee,
            totalPaid: totalAmount,
            transactionId: transaction_id || order.externalOrderId || order.id,
            date: new Date(),
            paymentMethod: "PIX",
          })
            .then(async (result) => {
              // Track receipt in transaction metadata
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
              // Don't fail the webhook if email fails
            });
        }
      }
    }

    // Handle payment failure - ROLLBACK all data
    if (
      eventType === "transaction.failed" ||
      status === "failed" ||
      status === "FAILED" ||
      orderStatus === "FAILED"
    ) {
      const usdtAmount = usdt_amount || Number(order.amount);

      // Find all transactions related to this order
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

      // Rollback: Remove USDT balance that was credited
      for (const transaction of relatedTransactions) {
        const transactionAmount = Number(transaction.amount);

        // Subtract the USDT amount from user balance
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
        eventType === "transaction.completed" || status === "completed",
      webhookEventId: webhookEventId,
    });
  } catch (error) {
    console.error("NutzPay webhook error:", error);

    // Mark webhook as failed
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
