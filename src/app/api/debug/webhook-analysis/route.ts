import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Debug endpoint to analyze webhook IDs and payment matching
 * GET /api/debug/webhook-analysis
 */
export async function GET(request: NextRequest) {
  try {
    // Get the session cookie - check admin session first, then regular session
    const adminSessionCookie = request.cookies.get("better-auth.admin-session");
    const regularSessionCookie = request.cookies.get("better-auth.session");
    const sessionToken =
      adminSessionCookie?.value || regularSessionCookie?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the session in the database
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // Get recent webhooks with their IDs
    const webhooks = await prisma.webhookEvent.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    // Get recent orders
    const orders = await prisma.order.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });

    // Get recent deposits
    const deposits = await prisma.deposit.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    // Analyze webhook IDs
    const webhookAnalysis = webhooks.map((webhook) => {
      const payload = webhook.payload as Record<string, unknown>;
      const webhookData = (payload?.data as Record<string, unknown>) || payload;

      return {
        webhookId: webhook.id,
        eventType: webhook.eventType,
        createdAt: webhook.createdAt.toISOString(),
        processed: webhook.processed,
        error: webhook.error,
        // IDs from webhook
        transactionId: webhook.transactionId || webhookData?.transaction_id,
        externalId: webhook.externalId || webhookData?.external_id,
        // Full payload for inspection
        payload: payload,
        // Try to find matching order
        matchingOrder: orders.find((order) => {
          return (
            order.externalOrderId === webhook.transactionId ||
            order.externalOrderId === webhook.externalId ||
            order.externalOrderId === webhookData?.transaction_id ||
            order.externalOrderId === webhookData?.external_id
          );
        }),
        // Try to find matching deposit
        matchingDeposit: deposits.find((deposit) => {
          return (
            deposit.externalId === webhook.transactionId ||
            deposit.externalId === webhook.externalId ||
            deposit.externalId === webhookData?.transaction_id ||
            deposit.externalId === webhookData?.external_id
          );
        }),
      };
    });

    // Analyze orders and their IDs
    const orderAnalysis = orders.map((order) => {
      // Find related deposit
      const relatedDeposit = deposits.find((deposit) => {
        return (
          deposit.userId === order.userId &&
          deposit.amount.equals(order.total) &&
          Math.abs(deposit.createdAt.getTime() - order.createdAt.getTime()) <
            60000
        );
      });

      return {
        orderId: order.id,
        externalOrderId: order.externalOrderId,
        status: order.status,
        userId: order.userId,
        amount: order.total.toString(),
        createdAt: order.createdAt.toISOString(),
        // Find related deposit
        relatedDeposit: relatedDeposit,
        // Find matching webhooks - check multiple ID fields
        matchingWebhooks: webhooks.filter((webhook) => {
          const payload = webhook.payload as Record<string, unknown>;
          const webhookData =
            (payload?.data as Record<string, unknown>) || payload;

          // Get all possible IDs from webhook
          const webhookTransactionId =
            webhook.transactionId || webhookData?.transaction_id;
          const webhookExternalId =
            webhook.externalId || webhookData?.external_id;

          // Match by order.externalOrderId (which stores the PIX transaction ID)
          const matchesOrderId =
            webhookTransactionId === order.externalOrderId ||
            webhookExternalId === order.externalOrderId;

          // Also check if deposit's externalId matches (deposit stores our original externalId)
          const depositMatches =
            relatedDeposit &&
            (webhookTransactionId === relatedDeposit.externalId ||
              webhookExternalId === relatedDeposit.externalId);

          return matchesOrderId || depositMatches;
        }),
      };
    });

    // Summary statistics
    const summary = {
      totalWebhooks: webhooks.length,
      processedWebhooks: webhooks.filter((w) => w.processed).length,
      failedWebhooks: webhooks.filter((w) => w.error).length,
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === "PENDING").length,
      completedOrders: orders.filter((o) => o.status === "COMPLETED").length,
      unmatchedWebhooks: webhookAnalysis.filter((w) => !w.matchingOrder).length,
      unmatchedOrders: orderAnalysis.filter(
        (o) => o.matchingWebhooks.length === 0 && o.status === "PENDING"
      ).length,
    };

    return NextResponse.json({
      success: true,
      summary,
      webhookAnalysis,
      orderAnalysis,
      // Raw data for inspection
      recentWebhooks: webhooks.slice(0, 20).map((w) => ({
        id: w.id,
        eventType: w.eventType,
        transactionId: w.transactionId,
        externalId: w.externalId,
        status: w.status,
        processed: w.processed,
        error: w.error,
        createdAt: w.createdAt.toISOString(),
        payload: w.payload,
      })),
      recentOrders: orders.slice(0, 20).map((o) => ({
        id: o.id,
        externalOrderId: o.externalOrderId,
        status: o.status,
        userId: o.userId,
        amount: o.total.toString(),
        createdAt: o.createdAt.toISOString(),
      })),
      recentDeposits: deposits.slice(0, 20).map((d) => ({
        id: d.id,
        externalId: d.externalId,
        status: d.status,
        userId: d.userId,
        amount: d.amount.toString(),
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Webhook analysis error:", error);

    // If WebhookEvent model doesn't exist, return helpful message
    if (error instanceof Error && error.message.includes("webhookEvent")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "WebhookEvent model not found. Please run database migration first.",
          details: "Run: npx prisma migrate dev --name add_webhook_events",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to analyze webhooks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
