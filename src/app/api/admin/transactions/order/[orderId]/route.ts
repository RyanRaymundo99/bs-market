import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

/** GET /api/admin/transactions/order/[orderId] - Fetch orphan order details (order with no linked transaction). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminSession = await validateAdminSession(_request);
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const amount = Number(order.amount);
    const status =
      order.status === "COMPLETED"
        ? "APPROVED"
        : order.status === "FAILED"
          ? "REJECTED"
          : order.status === "CANCELLED"
            ? "CANCELLED"
            : "PENDING";

    return NextResponse.json({
      success: true,
      transaction: {
        id: `order_${order.id}`,
        type: "BUY_CRYPTO",
        amount,
        currency: "USDT",
        balance: 0,
        description: "Compra USDT (ordem sem transação vinculada)",
        metadata: { _orphanOrder: true, orderId: order.id },
        status,
        createdAt: order.createdAt.toISOString(),
        user: order.user,
        deposit: null,
        withdrawal: null,
        order: {
          id: order.id,
          type: order.type,
          baseCurrency: order.baseCurrency,
          quoteCurrency: order.quoteCurrency,
          amount: order.amount,
          price: order.price,
          total: order.total,
          status: order.status,
          externalOrderId: order.externalOrderId,
          executedAt: order.executedAt,
          createdAt: order.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    return NextResponse.json(
      { error: "Failed to fetch order details" },
      { status: 500 }
    );
  }
}
