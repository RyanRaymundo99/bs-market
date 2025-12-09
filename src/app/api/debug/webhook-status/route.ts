import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Debug endpoint to check webhook status and recent orders
 * GET /api/debug/webhook-status?orderId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // Get the session cookie - check admin session first, then regular session
    const adminSessionCookie = request.cookies.get("better-auth.admin-session");
    const regularSessionCookie = request.cookies.get("better-auth.session");
    const sessionToken = adminSessionCookie?.value || regularSessionCookie?.value;

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

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    // Get recent orders for this user
    const recentOrders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
        ...(orderId ? { id: orderId } : {}),
      },
      take: orderId ? 1 : 10,
      orderBy: { createdAt: "desc" },
    });

    // Get deposits for these orders (match by externalId matching externalOrderId or deposit externalId)
    const orderIds = recentOrders.map((o) => o.id);
    const externalOrderIds = recentOrders
      .map((o) => o.externalOrderId)
      .filter((id): id is string => id !== null);

    // Find deposits for these orders (match by externalId)
    // We store our original externalId in deposit.externalId
    // Order.externalOrderId is the NutzPay transaction ID
    const deposits = externalOrderIds.length > 0
      ? await prisma.deposit.findMany({
          where: {
            userId: session.user.id,
            externalId: { in: externalOrderIds },
          },
          select: {
            id: true,
            externalId: true,
            status: true,
            confirmedAt: true,
          },
        })
      : [];

    // Create a map of externalId -> deposit for quick lookup
    const depositMap = new Map(
      deposits.map((d) => [d.externalId || "", d])
    );

    // Format orders for response
    const formattedOrders = recentOrders.map((order) => {
      // Find matching deposit
      // Deposit.externalId = our original externalId (e.g., "purchase_user123_timestamp")
      // Order.externalOrderId = NutzPay transaction ID
      // We need to find deposits where externalId might match, or find by order creation time/user
      const matchingDeposit = deposits.find(
        (d) => d.externalId && (
          d.externalId === order.externalOrderId ||
          order.externalOrderId?.includes(d.externalId) ||
          d.externalId.includes(order.id)
        )
      ) || null;

      return {
        id: order.id,
        externalOrderId: order.externalOrderId,
        status: order.status,
        amount: Number(order.amount),
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        executedAt: order.executedAt?.toISOString() || null,
        deposit: matchingDeposit
          ? {
              id: matchingDeposit.id,
              externalId: matchingDeposit.externalId,
              status: matchingDeposit.status,
              confirmedAt: matchingDeposit.confirmedAt?.toISOString() || null,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      message: orderId
        ? `Order ${orderId} details`
        : "Recent orders for debugging webhook status",
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br"}/api/webhooks/nutzpay`,
      note: "Check server logs for webhook activity. Look for '=== NUTZPAY WEBHOOK RECEIVED ==='",
    });
  } catch (error) {
    console.error("Webhook status debug error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch webhook status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

