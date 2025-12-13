import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nutzPayService } from "@/lib/nutzpay";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Sync all pending orders by manually processing webhooks
 * POST /api/crypto/sync-all-pending
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

    // Get all pending orders for this user
    const pendingOrders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
        status: "PENDING",
        externalOrderId: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`🔄 Found ${pendingOrders.length} pending orders to sync`);

    const results = {
      total: pendingOrders.length,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each pending order
    for (const order of pendingOrders) {
      try {
        if (!order.externalOrderId) continue;

        // Create a webhook payload with completed status
        const webhookPayload = {
          event: "transaction.completed",
          data: {
            transaction_id: order.externalOrderId,
            external_id: order.externalOrderId,
            status: "COMPLETED",
            amount: Number(order.total),
            currency: "BRL",
            type: "PIX",
            usdt_amount: Number(order.amount),
            created_at: order.createdAt.toISOString(),
            completed_at: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        };

        // Send to webhook handler
        const webhookRequest = new Request(
          `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/api/webhooks/nutzpay`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-test-webhook": "true",
            },
            body: JSON.stringify(webhookPayload),
          }
        );

        // We need to call the webhook handler directly since we're in the same process
        // Instead, let's update the order directly
        const deposit = await prisma.deposit.findFirst({
          where: {
            userId: order.userId,
            amount: order.total,
            createdAt: {
              gte: new Date(order.createdAt.getTime() - 60000),
              lte: new Date(order.createdAt.getTime() + 60000),
            },
          },
        });

        // Check if balance was already updated
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            userId: order.userId,
            currency: "USDT",
            metadata: {
              path: ["orderId"],
              equals: order.id,
            },
          },
        });

        if (!existingTransaction) {
          // Update order status
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: "COMPLETED",
              executedAt: new Date(),
            },
          });

          // Update deposit status
          if (deposit) {
            await prisma.deposit.update({
              where: { id: deposit.id },
              data: {
                status: "CONFIRMED",
                confirmedAt: new Date(),
              },
            });
          }

          // Update USDT balance
          await ledgerService.updateBalance(
            order.userId,
            "USDT",
            new Decimal(Number(order.amount)),
            "ADD"
          );

          // Create transaction record
          const transaction = await ledgerService.createTransaction({
            userId: order.userId,
            type: "BUY_CRYPTO",
            amount: new Decimal(Number(order.amount)),
            currency: "USDT",
            description: `USDT purchase via PIX - ${Number(order.amount)} USDT`,
            metadata: {
              orderId: order.id,
              depositId: deposit?.id,
              transactionId: order.externalOrderId,
              amountBRL: Number(order.total),
              amountUSDT: Number(order.amount),
              exchangeRate: Number(order.total) / Number(order.amount),
              source: "bulk_sync",
            },
          });

          // Link transaction to order
          await prisma.order.update({
            where: { id: order.id },
            data: {
              transactionId: transaction.id,
            },
          });

          results.synced++;
          console.log(`✅ Synced order ${order.id}`);
        } else {
          // Already processed, just update status
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: "COMPLETED",
              executedAt: new Date(),
            },
          });
          results.synced++;
        }
      } catch (error) {
        results.failed++;
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Order ${order.id}: ${errorMsg}`);
        console.error(`❌ Error syncing order ${order.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.synced} of ${results.total} pending orders`,
      results,
    });
  } catch (error) {
    console.error("Sync all pending error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync pending orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
