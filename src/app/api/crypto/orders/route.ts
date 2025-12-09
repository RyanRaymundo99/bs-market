import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get("better-auth.session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the session in the database
    const session = await prisma.session.findUnique({
      where: { token: sessionCookie.value },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // Get user's orders
    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
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

    // Convert Decimal amounts to numbers for frontend compatibility
    // Include webhook information for each order
    const formattedOrders = orders.map((order) => {
      // Find matching webhook by orderId, transactionId, or externalId
      let matchingWebhook =
        webhookMap.get(order.id) ||
        (order.externalOrderId
          ? webhookByTransactionId.get(order.externalOrderId) ||
            webhookByExternalId.get(order.externalOrderId)
          : null);

      // IMPORTANT: Order status is the source of truth since webhook handler already updates it
      // Only use webhook status if:
      // 1. Order is still PENDING (webhook might not have been processed yet)
      // 2. Webhook was processed successfully and order hasn't been updated since
      // 3. Webhook has a different status than the order (might indicate a recent update)
      let finalStatus = order.status;

      if (matchingWebhook && matchingWebhook.processed) {
        // Webhook was processed, so order should have been updated
        // But if order is still PENDING and webhook says COMPLETED, trust the webhook
        const webhookStatus = matchingWebhook.status?.toUpperCase();

        if (order.status === "PENDING" && webhookStatus === "COMPLETED") {
          // Order is pending but webhook says completed - use webhook status
          finalStatus = "COMPLETED";
        } else if (order.status === "PENDING" && webhookStatus === "FAILED") {
          // Order is pending but webhook says failed - use webhook status
          finalStatus = "FAILED";
        } else {
          // Order status is already updated, use it as source of truth
          finalStatus = order.status;
        }
      } else if (
        matchingWebhook &&
        !matchingWebhook.processed &&
        matchingWebhook.error
      ) {
        // Webhook has error - keep order status but note the error
        finalStatus = order.status;
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
      `[Orders API] User ${session.user.id}: Returning ${formattedOrders.length} orders`
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
