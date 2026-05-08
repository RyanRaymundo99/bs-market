import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  // ONLY ALLOW IN DEVELOPMENT
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only allowed in development mode" }, { status: 403 });
  }

  try {
    const { depositId, transactionId } = await request.json();

    if (!depositId && !transactionId) {
      return NextResponse.json({ error: "depositId or transactionId required" }, { status: 400 });
    }

    // Find the transaction, deposit, or order
    let transaction = transactionId
      ? await prisma.transaction.findUnique({
          where: { id: transactionId },
          include: {
            deposit: true,
            user: true,
          },
        })
      : null;

    if (!transaction && (transactionId || depositId)) {
      // Try finding by depositId (could be a PIX deposit)
      const deposit = await prisma.deposit.findFirst({
        where: depositId ? { id: depositId } : { externalId: transactionId },
        include: { user: true, transaction: true },
      });

      if (deposit) {
        if (deposit.transaction) {
          transaction = await prisma.transaction.findUnique({
            where: { id: deposit.transaction.id },
            include: { deposit: true, user: true },
          });
        }
      }
    }

    // Re-find with all relations if we found something
    
    // Final attempt to get the most complete object
    const fullTx = await prisma.transaction.findFirst({
      where: { 
        OR: [
          { id: transactionId || "" },
          { deposit: { id: depositId || "" } },
          { deposit: { externalId: transactionId || "" } }
        ]
      },
      include: {
        deposit: true,
        user: true,
      },
    });

    if (!fullTx || !fullTx.deposit) {
      // If it's a PIX order without a transaction yet, handle it
      const order = await prisma.order.findFirst({
        where: { externalOrderId: transactionId || "" },
        include: { user: true }
      });

      if (order) {
        // Handle PIX simulation specifically
        await prisma.$transaction(async (tx) => {
          // 1. Update Order
          await tx.order.update({
            where: { id: order.id },
            data: { status: "COMPLETED", executedAt: new Date() }
          });

          // 2. Update Deposit
          const deposit = await tx.deposit.findFirst({
            where: { externalId: order.externalOrderId }
          });
          if (deposit) {
            await tx.deposit.update({
              where: { id: deposit.id },
              data: { status: "CONFIRMED", confirmedAt: new Date() }
            });
          }

          // 3. Update Balance
          const balance = await tx.balance.upsert({
            where: { userId_currency: { userId: order.userId, currency: "USDT" } },
            update: { amount: { increment: order.amount } },
            create: { userId: order.userId, currency: "USDT", amount: order.amount }
          });

          // 4. Create Transaction
          await tx.transaction.create({
            data: {
              userId: order.userId,
              type: "BUY_CRYPTO",
              amount: order.amount,
              currency: "USDT",
              balance: balance.amount,
              description: `USDT purchase via PIX (Simulado)`,
              metadata: { orderId: order.id, simulated: true },
            },
          });
        });

        return NextResponse.json({ success: true, message: "PIX Payment simulated successfully" });
      }

      return NextResponse.json({ error: "Transaction/Deposit/Order not found" }, { status: 404 });
    }

    if (fullTx.deposit?.status === "CONFIRMED") {
      return NextResponse.json(
        { error: "Deposit already confirmed" },
        { status: 400 }
      );
    }

    // Simulate completion for Crypto (or PIX with existing transaction)
    await prisma.$transaction(async (tx) => {
      // 1. Update deposit status
      await tx.deposit.update({
        where: { id: fullTx.deposit!.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });

      // 2. Update user balance
      const balance = await tx.balance.upsert({
        where: { 
          userId_currency: { 
            userId: fullTx.userId, 
            currency: fullTx.currency 
          } 
        },
        update: {
          amount: { increment: fullTx.amount }
        },
        create: {
          userId: fullTx.userId,
          currency: fullTx.currency,
          amount: fullTx.amount
        }
      });

      // 3. Update transaction record
      await tx.transaction.update({
        where: { id: fullTx.id },
        data: {
          balance: balance.amount,
          description: fullTx.description + " (Simulado)",
        },
      });

      // 4. Send receipt email (optional for test, but good to test)
      // Disabled per user request due to domain verification issues
      /*
      try {
        const { sendPurchaseReceipt } = await import("@/lib/receipt-email");
        await sendPurchaseReceipt({
          userName: transaction.user.name || "Test User",
          userEmail: transaction.user.email,
          amountBRL: 0,
          amountUSDT: Number(transaction.amount),
          exchangeRate: 0,
          fee: 0,
          totalPaid: Number(transaction.amount),
          transactionId: transaction.id,
          date: new Date(),
          paymentMethod: "USDT",
        });
      } catch (err) {
        console.error("Test receipt email failed:", err);
      }
      */
    });

    return NextResponse.json({
      success: true,
      message: "Payment simulated successfully",
      transactionId: fullTx.id,
    });
  } catch (error) {
    console.error("Error simulating payment:", error);
    return NextResponse.json(
      {
        error: "Failed to simulate payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
