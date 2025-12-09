import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Debug endpoint to view recent webhook events
 * GET /api/debug/webhooks?limit=50
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

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const transactionId = request.nextUrl.searchParams.get("transactionId");
    const externalId = request.nextUrl.searchParams.get("externalId");

    // Get recent webhook events
    const webhooks = await prisma.webhookEvent.findMany({
      where: {
        ...(transactionId ? { transactionId: transactionId } : {}),
        ...(externalId ? { externalId: externalId } : {}),
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    // Format webhooks for response
    const formattedWebhooks = webhooks.map((webhook) => ({
      id: webhook.id,
      eventType: webhook.eventType,
      source: webhook.source,
      transactionId: webhook.transactionId,
      externalId: webhook.externalId,
      status: webhook.status,
      orderId: webhook.orderId,
      processed: webhook.processed,
      error: webhook.error,
      signatureValid: webhook.signatureValid,
      ipAddress: webhook.ipAddress,
      userAgent: webhook.userAgent,
      createdAt: webhook.createdAt.toISOString(),
      payload: webhook.payload,
    }));

    return NextResponse.json({
      success: true,
      count: formattedWebhooks.length,
      webhooks: formattedWebhooks,
    });
  } catch (error) {
    console.error("Debug webhooks error:", error);

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
        error: "Failed to fetch webhooks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
