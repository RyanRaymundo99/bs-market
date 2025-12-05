import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nutzPayService } from "@/lib/nutzpay";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    console.log("=== NUTZPAY WEBHOOK RECEIVED ===");
    console.log("Webhook body:", JSON.stringify(body, null, 2));
    console.log(
      "Webhook timestamp:",
      body.timestamp || new Date().toISOString()
    );

    // Verify webhook signature (required by NutzPay)
    // Always validate HMAC-SHA256 signature in X-Webhook-Signature header
    const isValidSignature = await nutzPayService.verifyWebhookSignature(
      request,
      rawBody
    );

    if (!isValidSignature) {
      console.error(
        "❌ Webhook signature verification failed - rejecting webhook"
      );
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // Extract event type and data from webhook
    // NutzPay format: { event: "transaction.completed", data: {...}, timestamp: "..." }
    const eventType = body.event || "transaction.unknown";
    const webhookData = body.data || body;

    // Extract fields from NutzPay payload structure
    const transaction_id = webhookData.transaction_id;
    const external_id = webhookData.external_id;
    // Status can be "COMPLETED", "PENDING", "FAILED" (uppercase) or "completed", "pending", "failed" (lowercase)
    const status = webhookData.status?.toLowerCase() || "pending";
    const amount = webhookData.amount;
    const currency = webhookData.currency || "BRL";
    const user_id = webhookData.user_id;
    const type = webhookData.type; // "PIX", etc.
    const created_at = webhookData.created_at;
    const completed_at = webhookData.completed_at;

    // For USDT purchases, we might need to calculate usdt_amount from the order
    // or it might be in the webhook data
    const usdt_amount = webhookData.usdt_amount;

    console.log("Webhook event type:", eventType);

    if (!transaction_id && !external_id) {
      console.error("Missing transaction_id or external_id in webhook");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("Processing webhook for:", {
      event: eventType,
      transaction_id,
      external_id,
      status,
      amount,
      currency,
      type,
      user_id,
      usdt_amount,
      created_at,
      completed_at,
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
      console.error(
        "Order not found for transaction:",
        transaction_id || external_id
      );
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order status based on event type and status
    // Handle both event type and status field
    // OrderStatus enum: PENDING, EXECUTING, COMPLETED, FAILED, CANCELLED
    let orderStatus:
      | "PENDING"
      | "EXECUTING"
      | "COMPLETED"
      | "FAILED"
      | "CANCELLED" = "PENDING";
    if (eventType === "transaction.completed" || status === "completed") {
      orderStatus = "COMPLETED";
    } else if (eventType === "transaction.failed" || status === "failed") {
      orderStatus = "FAILED";
    } else if (eventType === "transaction.refunded" || status === "refunded") {
      orderStatus = "CANCELLED";
    } else if (status === "pending") {
      orderStatus = "PENDING";
    }

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
        status === "completed"
          ? "CONFIRMED"
          : status === "failed"
          ? "REJECTED"
          : "PENDING";

      await prisma.deposit.update({
        where: { id: deposit.id },
        data: {
          status: depositStatus,
          confirmedAt: status === "completed" ? new Date() : null,
        },
      });
    }

    // If payment is completed, update user balance
    if (
      eventType === "transaction.completed" ||
      status === "completed" ||
      orderStatus === "COMPLETED"
    ) {
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

        console.log(
          `User ${order.userId} balance credited with ${usdtAmount} USDT via webhook`
        );
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
