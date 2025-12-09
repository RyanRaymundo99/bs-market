import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nutzPayService } from "@/lib/nutzpay";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Manual sync endpoint to force check and update order status
 * POST /api/crypto/sync-order-status
 * Body: { orderId: string } or { transactionId: string }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { orderId, transactionId } = body;

    if (!orderId && !transactionId) {
      return NextResponse.json(
        { error: "Please provide orderId or transactionId" },
        { status: 400 }
      );
    }

    // Find the order
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          orderId ? { id: orderId } : {},
          transactionId ? { externalOrderId: transactionId } : {},
        ],
        userId: session.user.id,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status === "COMPLETED") {
      return NextResponse.json({
        success: true,
        message: "Order is already completed",
        order: {
          id: order.id,
          status: order.status,
        },
      });
    }

    // Try to get status from NutzPay API
    let nutzPayStatus = null;
    let apiError = null;

    if (order.externalOrderId) {
      try {
        nutzPayStatus = await nutzPayService.getTransactionStatus(order.externalOrderId);
      } catch (error) {
        apiError = error;
        console.error("Error fetching from NutzPay API:", error);
      }
    }

    // If API check failed, we can still manually mark as completed if user confirms
    // For now, return the current status and API response
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        externalOrderId: order.externalOrderId,
      },
      nutzPayStatus: nutzPayStatus,
      apiError: apiError ? (apiError instanceof Error ? apiError.message : "Unknown error") : null,
      message: nutzPayStatus 
        ? "Status fetched from NutzPay API" 
        : "Could not fetch from NutzPay API (you may need to manually process the webhook)",
    });
  } catch (error) {
    console.error("Sync order status error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync order status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



