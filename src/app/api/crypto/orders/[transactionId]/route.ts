import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nutzPayService } from "@/lib/nutzpay";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
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

    const { transactionId } = await params;

    // Find order by externalOrderId (transactionId from NutzPay) or by order ID
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ externalOrderId: transactionId }, { id: transactionId }],
        userId: session.user.id, // Ensure user owns this order
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If order is still pending, check status from NutzPay API
    if (order.status === "PENDING" && order.externalOrderId) {
      try {
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

        const externalId = deposit?.externalId;

        let nutzPayStatus;
        let usedId = order.externalOrderId;

        try {
          nutzPayStatus = await nutzPayService.getTransactionStatus(
            order.externalOrderId
          );
        } catch (apiError) {
          console.error(
            "❌ Error fetching with transaction_id, trying external_id..."
          );
          // If transaction_id fails and we have external_id, try that
          if (
            externalId &&
            apiError instanceof Error &&
            apiError.message.includes("not found")
          ) {
            try {
              nutzPayStatus = await nutzPayService.getTransactionStatus(
                externalId
              );
              usedId = externalId;
            } catch (fallbackError) {
              console.error(
                "❌ Error fetching with external_id too:",
                fallbackError
              );
              nutzPayStatus = null;
            }
          } else {
            console.error("❌ Error fetching from NutzPay API:", apiError);
            if (apiError instanceof Error) {
              console.error("Error message:", apiError.message);
            }
            nutzPayStatus = null;
          }
        }

        // Handle case where NutzPay API returns null (server errors)
        if (nutzPayStatus === null) {
        } else if (nutzPayStatus) {
          // Try multiple possible status field names
          const nutzPayStatusValue =
            nutzPayStatus.status ||
            nutzPayStatus.Status ||
            nutzPayStatus.payment_status ||
            nutzPayStatus.PaymentStatus ||
            nutzPayStatus.transaction_status ||
            nutzPayStatus.TransactionStatus ||
            "pending";

          const statusLower = nutzPayStatusValue.toLowerCase();
          const isCompleted =
            statusLower === "completed" ||
            statusLower === "confirmed" ||
            statusLower === "paid" ||
            statusLower === "success" ||
            statusLower === "successful";

          if (isCompleted && order.status === "PENDING") {
            // Update order status
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: "COMPLETED",
                executedAt: new Date(),
              },
            });

            // Update deposit status
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

            if (deposit) {
              await prisma.deposit.update({
                where: { id: deposit.id },
                data: {
                  status: "CONFIRMED",
                  confirmedAt: new Date(),
                },
              });
            }

            // Check if balance was already updated (prevent double credit)
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
                description: `USDT purchase via PIX - ${Number(
                  order.amount
                )} USDT`,
                metadata: {
                  orderId: order.id,
                  depositId: deposit?.id,
                  transactionId: order.externalOrderId,
                  amountBRL: Number(order.total),
                  amountUSDT: Number(order.amount),
                  exchangeRate: Number(order.total) / Number(order.amount),
                  source: "nutzpay_api_poll",
                },
              });

              // Link transaction to order
              await prisma.order.update({
                where: { id: order.id },
                data: {
                  transactionId: transaction.id,
                },
              });
            }

            // Fetch updated order
            const updatedOrder = await prisma.order.findUnique({
              where: { id: order.id },
            });
            if (updatedOrder) {
              order.status = updatedOrder.status;
              order.executedAt = updatedOrder.executedAt;
            }
          } else if (nutzPayStatusValue.toLowerCase() === "failed") {
            // Update to failed if NutzPay says so
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: "FAILED",
              },
            });
            order.status = "FAILED";
          }
        }
      } catch (apiError) {
        console.error("Error checking NutzPay API status:", apiError);
        // Don't fail the request, just log the error and return current order status
      }
    }

    // Re-fetch order to get latest status (might have been updated by sync above)
    const latestOrder = await prisma.order.findUnique({
      where: { id: order.id },
    });

    const finalOrder = latestOrder || order;
    const wasSynced = latestOrder?.status !== order.status;

    // Find deposit separately - match by userId, amount, and creation time
    const deposit = await prisma.deposit.findFirst({
      where: {
        userId: finalOrder.userId,
        amount: finalOrder.total,
        createdAt: {
          gte: new Date(finalOrder.createdAt.getTime() - 60000),
          lte: new Date(finalOrder.createdAt.getTime() + 60000),
        },
      },
    });

    // Convert Decimal amounts to numbers for frontend compatibility
    try {
      const formattedOrder = {
        ...finalOrder,
        amount: Number(finalOrder.amount),
        price: Number(finalOrder.price),
        total: Number(finalOrder.total),
        createdAt: finalOrder.createdAt.toISOString(),
        executedAt: finalOrder.executedAt?.toISOString() || null,
        deposit: deposit
          ? {
              ...deposit,
              amount: Number(deposit.amount),
              fee: deposit.fee ? Number(deposit.fee) : 0,
              confirmedAt: deposit.confirmedAt?.toISOString() || null,
            }
          : null,
      };

      return NextResponse.json({
        success: true,
        order: formattedOrder,
        synced: wasSynced, // Indicates if status was updated during this call
      });
    } catch (formatError) {
      console.error("Error formatting order:", formatError);
      console.error("Order data:", JSON.stringify(order, null, 2));
      throw formatError;
    }
  } catch (error) {
    console.error("Order fetch error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
