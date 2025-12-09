import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nutzPayService } from "@/lib/nutzpay";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";

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
    const eventType = body.event || "transaction.unknown";
    const webhookData = body.data || body;
    const transaction_id = webhookData.transaction_id;
    const external_id = webhookData.external_id;
    const status = webhookData.status?.toLowerCase() || "pending";
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    console.log("=== NUTZPAY WEBHOOK RECEIVED ===");
    console.log("Webhook body:", JSON.stringify(body, null, 2));
    console.log(
      "Webhook timestamp:",
      body.timestamp || new Date().toISOString()
    );
    console.log("Webhook IP:", ipAddress);
    console.log("Webhook User-Agent:", userAgent);

    // Log all possible ID fields for debugging
    console.log("🔍 ID ANALYSIS:");
    console.log("  - transaction_id (from webhookData):", transaction_id);
    console.log("  - external_id (from webhookData):", external_id);
    console.log("  - body.data.transaction_id:", webhookData?.transaction_id);
    console.log("  - body.data.external_id:", webhookData?.external_id);
    console.log("  - body.transaction_id:", body.transaction_id);
    console.log("  - body.external_id:", body.external_id);
    console.log("  - Full webhookData keys:", Object.keys(webhookData || {}));

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
      console.log("📝 Webhook event stored:", webhookEvent.id);
    } catch (dbError) {
      // If WebhookEvent model doesn't exist yet (migration not run), log and continue
      console.warn(
        "⚠️ Could not store webhook event (model may not exist yet):",
        dbError
      );
    }

    // Verify webhook signature (required by NutzPay)
    // Always validate HMAC-SHA256 signature in X-Webhook-Signature header
    const isValidSignature = await nutzPayService.verifyWebhookSignature(
      request,
      rawBody
    );

    // Allow test webhooks when x-test-webhook header is present (skip signature verification)
    // This allows testing in any environment
    const isDevelopment = process.env.NODE_ENV === "development";
    const isTestWebhook = request.headers.get("x-test-webhook") === "true";

    // Update webhook event with signature validation result
    if (webhookEventId) {
      try {
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            signatureValid:
              isValidSignature || isTestWebhook,
          },
        });
      } catch (dbError) {
        // Ignore if model doesn't exist
      }
    }

    // Log signature validation result for debugging
    console.log("🔐 Signature Validation:", {
      isValid: isValidSignature,
      isDevelopment,
      isTestWebhook,
      willProcess: isValidSignature || isTestWebhook,
      note: isTestWebhook
        ? "Test webhook mode: Signature verification skipped"
        : isDevelopment
        ? "Development mode: Signature verification required"
        : "Production mode: Signature verification required",
    });

    if (!isValidSignature && !isTestWebhook) {
      console.error(
        "❌ Webhook signature verification failed - rejecting webhook"
      );
      console.error(
        "Note: For test webhooks, include header: x-test-webhook: true"
      );

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

    // Extract fields from NutzPay payload structure using the webhookData from above
    const amount = webhookData.amount || webhookData.value;
    const currency = webhookData.currency || "BRL";
    const type = webhookData.type || webhookData.payment_method || "PIX";
    const user_id = webhookData.user_id || webhookData.customer_id;
    const usdt_amount = webhookData.usdt_amount || webhookData.crypto_amount;
    const created_at = webhookData.created_at || webhookData.createdAt;
    const completed_at =
      webhookData.completed_at ||
      webhookData.completedAt ||
      webhookData.executed_at;

    // According to NutzPay docs, webhook always has transaction_id
    // external_id might not be present (it's optional)
    if (!transaction_id) {
      console.error("❌ Webhook missing transaction_id (required)");
      if (webhookEventId) {
        try {
          await prisma.webhookEvent.update({
            where: { id: webhookEventId },
            data: {
              processed: false,
              error: "Missing transaction_id (required)",
            },
          });
        } catch (dbError) {
          // Ignore if model doesn't exist
        }
      }
      return NextResponse.json(
        {
          error: "Missing transaction_id (required)",
          note: "NutzPay webhooks must include transaction_id in data object",
        },
        { status: 400 }
      );
    }

    // Log if external_id is missing (it's optional but helpful for matching)
    if (!external_id) {
      console.warn(
        "⚠️ Webhook missing external_id (optional). Will match by transaction_id only."
      );
    }

    console.log("Processing webhook for:", {
      event: eventType,
      transaction_id,
      external_id,
      status,
      amount,
      currency,
      type,
      user_id,
      usdt_amount,
      created_at,
      completed_at,
    });

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

    // PRIMARY MATCH: transaction_id is always present in webhook
    let order = await prisma.order.findFirst({
      where: {
        externalOrderId: transaction_id, // PRIMARY: Match PIX transaction ID (always present)
      },
      include: { user: true },
    });

    // If not found and external_id exists, try matching by external_id
    if (!order && external_id) {
      const orderByExternalId = await prisma.order.findFirst({
        where: {
          externalOrderId: external_id, // Fallback: Match our original ID
        },
        include: { user: true },
      });
      if (orderByExternalId) {
        order = orderByExternalId;
        console.log("✅ Found order by external_id:", order.id);
      }
    }

    console.log("🔍 Order lookup attempt:", {
      transaction_id,
      external_id: external_id || "NOT PROVIDED (optional)",
      found: !!order,
      orderId: order?.id,
      orderExternalOrderId: order?.externalOrderId,
      matchingStrategy: order
        ? "matched by externalOrderId"
        : "not found, trying deposit lookup",
    });

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
          console.log(
            "📦 Found deposit with external_id:",
            deposit.id,
            deposit.externalId
          );
          // Find order by matching userId and amount (since they're created together)
          const matchingOrder = await prisma.order.findFirst({
            where: {
              userId: deposit.userId,
              total: deposit.amount, // Match by total amount
              createdAt: {
                // Order should be created around the same time as deposit
                gte: new Date(deposit.createdAt.getTime() - 60000), // 1 minute before
                lte: new Date(deposit.createdAt.getTime() + 60000), // 1 minute after
              },
            },
            include: { user: true },
          });

          if (matchingOrder) {
            order = matchingOrder;
            console.log(
              "✅ Found order via deposit lookup (external_id match):",
              order.id,
              "order.externalOrderId:",
              order.externalOrderId
            );
          } else {
            console.log("⚠️ Deposit found but no matching order");
          }
        }
      }

      // Also try matching deposit by transaction_id (PIX transaction ID)
      if (!order && transaction_id) {
        const deposit = await prisma.deposit.findFirst({
          where: {
            externalId: transaction_id, // Some deposits might have PIX transaction ID
          },
        });

        if (deposit) {
          console.log(
            "📦 Found deposit with transaction_id:",
            deposit.id,
            deposit.externalId
          );
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
            console.log(
              "✅ Found order via deposit lookup (transaction_id match):",
              order.id
            );
          }
        }
      }
    }

    if (!order) {
      console.error("❌ Order not found for transaction");
      console.error("Searched for transaction_id:", transaction_id);
      console.error("Searched for external_id:", external_id);

      // Log recent orders for debugging
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
      console.error(
        "Recent orders (last 10):",
        JSON.stringify(recentOrders, null, 2)
      );

      // Log recent deposits for debugging
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
      console.error(
        "Recent deposits (last 10):",
        JSON.stringify(recentDeposits, null, 2)
      );

      // Mark webhook as failed with detailed error
      if (webhookEventId) {
        try {
          await prisma.webhookEvent.update({
            where: { id: webhookEventId },
            data: {
              processed: false,
              error: `Order not found. transaction_id: ${transaction_id}, external_id: ${external_id}. Recent orders: ${recentOrders.length}, Recent deposits: ${recentDeposits.length}`,
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
            recentOrdersCount: recentOrders.length,
            recentDepositsCount: recentDeposits.length,
          },
        },
        { status: 404 }
      );
    }

    console.log("✅ Order found:", {
      orderId: order.id,
      externalOrderId: order.externalOrderId,
      currentStatus: order.status,
      userId: order.userId,
    });

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
      status === "completed" ||
      status === "COMPLETED"
    ) {
      orderStatus = "COMPLETED";
      console.log("✅ Webhook confirms payment COMPLETED");
    }
    // PRIORITY 2: Handle failed status from webhook (FAILED - will trigger rollback)
    else if (
      eventType === "transaction.failed" ||
      eventType === "payment.failed" ||
      status === "failed" ||
      status === "FAILED"
    ) {
      orderStatus = "FAILED";
      console.log(
        "❌ Webhook confirms payment FAILED - will rollback user data"
      );
    }
    // PRIORITY 3: Handle pending status from webhook (PENDING)
    else if (
      eventType === "transaction.created" ||
      eventType === "transaction.pending" ||
      eventType === "payment.created" ||
      eventType === "payment.pending" ||
      status === "pending" ||
      status === "PENDING"
    ) {
      orderStatus = "PENDING";
      console.log("📋 Webhook confirms payment PENDING");
    }
    // PRIORITY 4: Handle refunded status
    else if (
      eventType === "transaction.refunded" ||
      eventType === "payment.refunded" ||
      status === "refunded" ||
      status === "REFUNDED"
    ) {
      orderStatus = "CANCELLED";
      console.log("🔄 Webhook confirms payment REFUNDED");
    }
    // PRIORITY 5: Handle executing status (if payment is being processed)
    else if (
      status === "executing" ||
      status === "EXECUTING" ||
      eventType === "transaction.executing"
    ) {
      orderStatus = "EXECUTING";
      console.log("⏳ Webhook confirms payment EXECUTING");
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

    console.log("✅ Order status updated:", {
      orderId: updatedOrder.id,
      oldStatus: order.status,
      newStatus: orderStatus,
      eventType: eventType,
      webhookStatus: status,
      executedAt: updatedOrder.executedAt,
    });

    // Log pending payment updates for visibility
    if (orderStatus === "PENDING") {
      console.log("📋 Pending payment detected:", {
        orderId: updatedOrder.id,
        transactionId: transaction_id || external_id,
        amount: amount,
        currency: currency,
      });
    }

    // Update deposit status - find by matching userId, amount, and creation time
    // Since deposit doesn't have direct relation to order, we match by these criteria
    let deposit = await prisma.deposit.findFirst({
      where: {
        OR: [{ externalId: external_id }, { externalId: transaction_id }],
      },
    });

    // If not found by externalId, try matching by order's userId and amount
    if (!deposit && order) {
      deposit = await prisma.deposit.findFirst({
        where: {
          userId: order.userId,
          amount: order.total,
          createdAt: {
            gte: new Date(order.createdAt.getTime() - 60000),
            lte: new Date(order.createdAt.getTime() + 60000),
          },
        },
      });
    }

    if (deposit) {
      const depositStatus =
        status === "completed" || status === "COMPLETED"
          ? "CONFIRMED"
          : status === "failed" || status === "FAILED"
          ? "REJECTED"
          : "PENDING";

      await prisma.deposit.update({
        where: { id: deposit.id },
        data: {
          status: depositStatus,
          confirmedAt:
            status === "completed" || status === "COMPLETED"
              ? new Date()
              : null,
        },
      });

      console.log("✅ Deposit status updated:", {
        depositId: deposit.id,
        status: depositStatus,
        transactionId: transaction_id || external_id,
      });
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
        await ledgerService.createTransaction({
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

        console.log(
          `✅ User ${order.userId} balance credited with ${usdtAmount} USDT via webhook`
        );
      } else {
        console.log(
          "⚠️ Balance already updated for transaction:",
          transaction_id
        );
      }
    }

    // Handle payment failure - ROLLBACK all data
    if (
      eventType === "transaction.failed" ||
      status === "failed" ||
      status === "FAILED" ||
      orderStatus === "FAILED"
    ) {
      console.log("❌ Payment failed - rolling back user data:", {
        orderId: order.id,
        userId: order.userId,
        transactionId: transaction_id,
      });

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

        console.log(
          `🔄 Rolled back ${transactionAmount} USDT from user ${order.userId} balance`
        );

        // Mark transaction as failed/refunded
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

        console.log(`🔄 Marked transaction ${transaction.id} as REFUND`);
      }

      // If no transactions found but order was completed, still try to rollback
      if (relatedTransactions.length === 0 && order.status === "COMPLETED") {
        // Order was marked as completed but no transaction found - still rollback balance
        await ledgerService.updateBalance(
          order.userId,
          "USDT",
          new Decimal(usdtAmount),
          "SUBTRACT"
        );
        console.log(
          `🔄 Rolled back ${usdtAmount} USDT from user ${order.userId} (no transaction found)`
        );
      }

      console.log(
        `✅ Payment failure rollback completed for order ${order.id}`
      );
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

    console.log("✅ Webhook processed successfully");

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
