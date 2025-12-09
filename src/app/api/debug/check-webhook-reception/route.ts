import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Debug endpoint to check if webhooks are being received
 * GET /api/debug/check-webhook-reception
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

    // Check if webhook endpoint is accessible
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/nutzpay`;
    
    // Get recent webhooks
    const recentWebhooks = await prisma.webhookEvent.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        externalOrderId: true,
        status: true,
        createdAt: true,
        userId: true,
      },
    });

    // Get recent deposits
    const recentDeposits = await prisma.deposit.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        externalId: true,
        status: true,
        createdAt: true,
        userId: true,
      },
    });

    return NextResponse.json({
      success: true,
      webhookEndpoint: webhookUrl,
      webhookReception: {
        totalWebhooks: recentWebhooks.length,
        latestWebhook: recentWebhooks[0]
          ? {
              id: recentWebhooks[0].id,
              eventType: recentWebhooks[0].eventType,
              transactionId: recentWebhooks[0].transactionId,
              externalId: recentWebhooks[0].externalId,
              status: recentWebhooks[0].status,
              createdAt: recentWebhooks[0].createdAt.toISOString(),
              processed: recentWebhooks[0].processed,
            }
          : null,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        externalOrderId: o.externalOrderId,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
      recentDeposits: recentDeposits.map((d) => ({
        id: d.id,
        externalId: d.externalId,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
      })),
      matchingInfo: {
        note: "Webhooks should match orders by:",
        match1: "order.externalOrderId === webhook.transaction_id (PIX transaction ID)",
        match2: "deposit.externalId === webhook.external_id (our original ID)",
      },
    });
  } catch (error) {
    console.error("Check webhook reception error:", error);
    
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
        error: "Failed to check webhook reception",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}






