import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get("better-auth.session");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: "No session cookie found" },
        { status: 401 }
      );
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

    // Check if user is admin (you might want to add an admin role check here)
    // For now, we'll assume any authenticated user can access admin data

    console.log("Starting finance data reset...");

    // Reset deposits
    const deletedDeposits = await prisma.deposit.deleteMany({});
    console.log(`Deleted ${deletedDeposits.count} deposits`);

    // Reset withdrawals
    const deletedWithdrawals = await prisma.withdrawal.deleteMany({});
    console.log(`Deleted ${deletedWithdrawals.count} withdrawals`);


    // Reset orders
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`Deleted ${deletedOrders.count} orders`);

    // Reset transactions
    const deletedTransactions = await prisma.transaction.deleteMany({});
    console.log(`Deleted ${deletedTransactions.count} transactions`);

    // Reset balances (set to 0 instead of deleting to maintain user records)
    const resetBalances = await prisma.balance.updateMany({
      data: {
        amount: 0,
        locked: 0,
      },
    });
    console.log(`Reset ${resetBalances.count} balances`);

    console.log("Finance data reset completed successfully");

    return NextResponse.json({
      success: true,
      message: "Dados financeiros resetados com sucesso",
      deleted: {
        deposits: deletedDeposits.count,
        withdrawals: deletedWithdrawals.count,
        orders: deletedOrders.count,
        transactions: deletedTransactions.count,
        balances: resetBalances.count,
      },
    });
  } catch (error) {
    console.error("Finance data reset error:", error);
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}
