import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nutzPayService } from "@/lib/nutzpay";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("=== NUTZPAY WEBHOOK RECEIVED ===");
    console.log("Webhook body:", JSON.stringify(body, null, 2));
    console.log("Webhook timestamp:", new Date().toISOString());

    // Verify webhook signature if configured
    if (!nutzPayService.verifyWebhookSignature(request)) {
      console.warn("Webhook signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Extract data from webhook
    const { transaction_id, external_id, status, amount, usdt_amount } = body.data || body;

    if (!transaction_id && !external_id) {
      console.error("Missing transaction_id or external_id in webhook");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("Processing webhook for:", {
      transaction_id,
      external_id,
      status,
      amount,
      usdt_amount,
    });

    // Find the order by external_id
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { externalOrderId: transaction_id },
          { externalOrderId: external_id },
        ],
      },
      include: { user: true },
    });

    if (!order) {
      console.error("Order not found for transaction:", transaction_id || external_id);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Update order status
    const orderStatus =
      status === "completed" ? "COMPLETED" :
      status === "failed" ? "FAILED" :
      status === "pending" ? "PENDING" : "PENDING";

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: orderStatus,
        executedAt: status === "completed" ? new Date() : null,
      },
    });

    // Update deposit status
    const deposit = await prisma.deposit.findFirst({
      where: {
        externalId: transaction_id || external_id,
      },
    });

    if (deposit) {
      const depositStatus =
        status === "completed" ? "CONFIRMED" :
        status === "failed" ? "REJECTED" :
        "PENDING";

      await prisma.deposit.update({
        where: { id: deposit.id },
        data: {
          status: depositStatus,
          confirmedAt: status === "completed" ? new Date() : null,
        },
      });
    }

    // If payment is completed, update user balance
    if (status === "completed") {
      const usdtAmount = usdt_amount || Number(order.amount);

      // Check if balance was already updated (prevent double credit)
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          userId: order.userId,
          currency: "USDT",
          metadata: {
            path: ["transactionId"],
            equals: transaction_id,
          },
        },
      });

      if (!existingTransaction) {
        // Update USDT balance (add the USDT amount)
        await ledgerService.updateBalance(
          order.userId,
          "USDT",
          new Decimal(usdtAmount),
          "ADD"
        );

        // Create transaction record for USDT credit
        await ledgerService.createTransaction({
          userId: order.userId,
          type: "BUY_CRYPTO",
          amount: new Decimal(usdtAmount),
          currency: "USDT",
          description: `USDT purchase via PIX - ${usdtAmount} USDT`,
          metadata: {
            orderId: order.id,
            depositId: deposit?.id,
            transactionId: transaction_id,
            amountBRL: amount || Number(order.total),
            amountUSDT: usdtAmount,
            exchangeRate: (amount || Number(order.total)) / usdtAmount,
            source: "nutzpay_webhook",
          },
        });

        console.log(`User ${order.userId} balance credited with ${usdtAmount} USDT via webhook`);
      } else {
        console.log("Balance already updated for transaction:", transaction_id);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("NutzPay webhook error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

