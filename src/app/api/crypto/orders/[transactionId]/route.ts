import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
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

    const { transactionId } = params;

    // Find order by externalOrderId (transactionId from NutzPay)
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { externalOrderId: transactionId },
          { id: transactionId },
        ],
        userId: session.user.id, // Ensure user owns this order
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Convert Decimal amounts to numbers for frontend compatibility
    const formattedOrder = {
      ...order,
      amount: Number(order.amount),
      price: Number(order.price),
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      executedAt: order.executedAt?.toISOString() || null,
    };

    return NextResponse.json({
      success: true,
      order: formattedOrder,
    });
  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

