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

    // Convert Decimal amounts to numbers for frontend compatibility
    const formattedOrders = orders.map((order) => ({
      ...order,
      amount: Number(order.amount),
      price: Number(order.price),
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      executedAt: order.executedAt?.toISOString() || null,
    }));

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

