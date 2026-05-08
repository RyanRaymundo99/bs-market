import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's orders
    const orders = await prisma.order.findMany({
      where: {
        userId: authSession.user.id,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Get all webhook events for these orders
    const orderIds = orders.map((o) => o.id);
    const externalOrderIds = orders
      .map((o) => o.externalOrderId)
      .filter((id): id is string => id !== null);

    // Find webhooks that match these orders
    const webhooks = await prisma.webhookEvent.findMany({
      where: {
        OR: [
          { orderId: { in: orderIds } },
          { transactionId: { in: externalOrderIds } },
          { externalId: { in: externalOrderIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Create a map of order ID to latest webhook
    const webhookMap = new Map<string, (typeof webhooks)[0]>();
    const webhookByTransactionId = new Map<string, (typeof webhooks)[0]>();
    const webhookByExternalId = new Map<string, (typeof webhooks)[0]>();

    webhooks.forEach((webhook) => {
      // Map by orderId
      if (webhook.orderId) {
        const existing = webhookMap.get(webhook.orderId);
        if (!existing || webhook.createdAt > existing.createdAt) {
          webhookMap.set(webhook.orderId, webhook);
        }
      }
      // Map by transactionId
      if (webhook.transactionId) {
        const existing = webhookByTransactionId.get(webhook.transactionId);
        if (!existing || webhook.createdAt > existing.createdAt) {
          webhookByTransactionId.set(webhook.transactionId, webhook);
        }
      }
      // Map by externalId
      if (webhook.externalId) {
        const existing = webhookByExternalId.get(webhook.externalId);
        if (!existing || webhook.createdAt > existing.createdAt) {
          webhookByExternalId.set(webhook.externalId, webhook);
        }
      }
    });

    // Get transaction records for these orders to check if payment actually succeeded
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: authSession.user.id,
        type: "BUY_CRYPTO",
        OR: orderIds.map((orderId) => ({
          metadata: {
            path: ["orderId"],
            equals: orderId,
          },
        })),
      },
    });

    // Create a map of orderId -> has successful transaction
    const orderHasTransaction = new Map<string, boolean>();
    transactions.forEach((tx) => {
      const orderId = (tx.metadata as { orderId?: string })?.orderId;
      if (orderId) {
        orderHasTransaction.set(orderId, true);
      }
    });

    // Convert Decimal amounts to numbers for frontend compatibility
    // Include webhook information for each order
    const formattedOrders = orders.map((order) => {
      // CRITICAL FIRST CHECK: Calculate order age immediately
      const orderAge = Date.now() - order.createdAt.getTime();
      const isRecentOrder = orderAge < 20 * 60 * 1000; // 20 minutes (increased for safety)
      const isVeryRecentOrder = orderAge < 15 * 60 * 1000; // 15 minutes (increased for safety)

      // Find matching webhook by orderId, transactionId, or externalId
      const matchingWebhook =
        webhookMap.get(order.id) ||
        (order.externalOrderId
          ? webhookByTransactionId.get(order.externalOrderId) ||
            webhookByExternalId.get(order.externalOrderId)
          : null);

      // Check if there's evidence the payment succeeded (transaction record exists)
      const hasSuccessfulTransaction = orderHasTransaction.get(order.id);

      // IMPORTANT: Be very conservative with FAILED status
      // Only show FAILED if we're absolutely certain the payment failed

      // CRITICAL: For recent orders, NEVER show FAILED - always show PENDING
      // This prevents premature failure status while webhooks are still processing
      let finalStatus = order.status;

      // FIRST PRIORITY: If order is very recent and marked as FAILED, immediately override to PENDING
      // Do this BEFORE any other logic to prevent FAILED from showing
      const orderStatusStr = String(order.status).toUpperCase();
      if (isVeryRecentOrder && orderStatusStr === "FAILED") {
        finalStatus = "PENDING";
      }

      // If there's a transaction record, payment definitely succeeded
      if (hasSuccessfulTransaction) {
        finalStatus = "COMPLETED";
      } else if (matchingWebhook && matchingWebhook.processed) {
        // Webhook was processed
        const webhookStatus = matchingWebhook.status?.toUpperCase();

        if (order.status === "PENDING" && webhookStatus === "COMPLETED") {
          // Order is pending but webhook says completed - use webhook status
          finalStatus = "COMPLETED";
        } else if (
          String(order.status) === "FAILED" ||
          webhookStatus === "FAILED"
        ) {
          // Order or webhook says FAILED - but be very conservative
          // Only trust FAILED if:
          // 1. Order is NOT recent (at least 15 minutes old) - gives time for webhooks to process
          // 2. Webhook was processed successfully
          // 3. There's NO transaction record
          // 4. Webhook is also not too recent (at least 5 minutes old) - avoids premature failures
          const webhookAge = Date.now() - matchingWebhook.createdAt.getTime();
          const isRecentWebhook = webhookAge < 5 * 60 * 1000; // 5 minutes

          if (!isRecentOrder && !isRecentWebhook) {
            // Order and webhook are both old enough - likely actually failed
            finalStatus = "FAILED";
          } else {
            // Order or webhook is too recent - keep as PENDING to avoid false negatives
            // Payment might still be processing
            finalStatus = "PENDING";
          }
        } else if (
          order.status === "COMPLETED" ||
          webhookStatus === "COMPLETED"
        ) {
          // Trust completed status
          finalStatus = "COMPLETED";
        } else {
          // Default to order status, but prefer PENDING for recent orders
          if (isRecentOrder && String(order.status) === "FAILED") {
            // Recent order marked as FAILED - might be premature, keep as PENDING
            finalStatus = "PENDING";
          } else {
            finalStatus = order.status;
          }
        }
      } else if (
        matchingWebhook &&
        !matchingWebhook.processed &&
        matchingWebhook.error
      ) {
        // Webhook has error - keep order status but prefer PENDING for recent orders
        if (isRecentOrder && String(order.status) === "FAILED") {
          finalStatus = "PENDING";
        } else {
          finalStatus = order.status;
        }
      } else {
        // No webhook or unprocessed webhook - be conservative
        if (isRecentOrder && String(order.status) === "FAILED") {
          // Recent order marked as FAILED without clear evidence - keep as PENDING
          finalStatus = "PENDING";
        } else {
          finalStatus = order.status;
        }
      }

      // Final safety check: if there's a transaction record, payment definitely succeeded
      if (hasSuccessfulTransaction && finalStatus !== "COMPLETED") {
        finalStatus = "COMPLETED";
      }

      // Ultimate safety: for recent orders, NEVER show FAILED
      // Always show PENDING to give webhooks time to process
      // Convert to string and uppercase for reliable comparison
      const finalStatusStr = String(finalStatus).toUpperCase();

      if (isRecentOrder && finalStatusStr === "FAILED") {
        finalStatus = "PENDING";
      }

      // Double-check: if somehow we still have FAILED for recent orders, force PENDING
      if (isVeryRecentOrder && finalStatusStr === "FAILED") {
        finalStatus = "PENDING";
      }

      // Triple-check: absolute safety net - if order is less than 20 minutes old and status is FAILED, force PENDING
      // This is the final override - no matter what logic ran before, if order is recent and status is FAILED, show PENDING
      if (
        orderAge < 20 * 60 * 1000 &&
        String(finalStatus).toUpperCase() === "FAILED"
      ) {
        console.log(
          `[Orders API] Overriding FAILED to PENDING for recent order ${
            order.id
          } (age: ${Math.round(orderAge / 1000)}s)`
        );
        finalStatus = "PENDING";
      }

      return {
        ...order,
        amount: Number(order.amount),
        price: Number(order.price),
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
        executedAt: order.executedAt?.toISOString() || null,
        updatedAt: order.updatedAt.toISOString(),
        externalOrderId: order.externalOrderId,
        // Include webhook information for debugging
        webhookStatus: matchingWebhook?.status || null,
        webhookProcessed: matchingWebhook?.processed || false,
        webhookError: matchingWebhook?.error || null,
        webhookReceivedAt: matchingWebhook?.createdAt.toISOString() || null,
        // Use order status as primary source of truth (already updated by webhook handler)
        status: finalStatus,
      };
    });

    // Log for debugging
    console.log(
      `[Orders API] User ${authSession.user.id}: Returning ${formattedOrders.length} orders`
    );
    if (formattedOrders.length > 0) {
      console.log(`[Orders API] Sample order:`, {
        id: formattedOrders[0].id,
        status: formattedOrders[0].status,
        webhookStatus: formattedOrders[0].webhookStatus,
        webhookProcessed: formattedOrders[0].webhookProcessed,
        amount: formattedOrders[0].amount,
        total: formattedOrders[0].total,
      });
    }

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Orders fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
