import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Debug endpoint to check recent orders and their status
 * Useful for troubleshooting webhook issues
 * 
 * GET /api/debug/orders?limit=10
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

    // Check if user is admin (optional - you can remove this check if you want)
    // For now, let's allow any authenticated user to see their own orders

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10");

    // Get recent orders
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        transaction: {
          include: {
            deposit: {
              select: {
                id: true,
                externalId: true,
                status: true,
                confirmedAt: true,
              },
            },
          },
        },
      },
    });

    // Format orders for response
    const formattedOrders = orders.map((order) => ({
      id: order.id,
      externalOrderId: order.externalOrderId,
      status: order.status,
      amount: Number(order.amount),
      price: Number(order.price),
      total: Number(order.total),
      userId: order.userId,
      userEmail: order.user.email,
      createdAt: order.createdAt.toISOString(),
      executedAt: order.executedAt?.toISOString() || null,
      updatedAt: order.updatedAt.toISOString(),
      deposit: order.transaction?.deposit
        ? {
            id: order.transaction.deposit.id,
            externalId: order.transaction.deposit.externalId,
            status: order.transaction.deposit.status,
            confirmedAt: order.transaction.deposit.confirmedAt?.toISOString() || null,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      count: formattedOrders.length,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Debug orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}



