import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function POST(request: NextRequest) {
  try {
    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized: Admin session required" },
        { status: 401 }
      );
    }

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
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
