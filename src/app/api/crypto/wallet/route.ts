import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all user balances
    const balances = await prisma.balance.findMany({
      where: { userId: authSession.user.id },
      orderBy: { amount: "desc" },
    });

    // Format balances without price conversion
    const portfolioData = balances.map((balance) => {
      const amount = parseFloat(balance.amount.toString());
      const locked = parseFloat(balance.locked.toString());

      return {
        currency: balance.currency,
        amount,
        locked,
      };
    });

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId: authSession.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        order: true,
        deposit: true,
        withdrawal: true,
      },
    });

    // Get open orders
    const openOrders = await prisma.order.findMany({
      where: {
        userId: authSession.user.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        balances: portfolioData,
        recentTransactions,
        openOrders,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Wallet API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch wallet data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
