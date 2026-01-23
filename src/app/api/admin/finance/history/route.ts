import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized: Admin session required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get("metric"); // deposits, withdrawals, trades, commissions, balance
    const days = parseInt(searchParams.get("days") || "7", 10);

    if (!metric || !["deposits", "withdrawals", "trades", "commissions", "balance"].includes(metric)) {
      return NextResponse.json(
        { error: "Invalid metric parameter" },
        { status: 400 }
      );
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    // Initialize data structure for all days
    const history: Array<{ date: string; value: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0];
      history.push({
        date: dateKey,
        value: 0,
      });
    }

    if (metric === "deposits") {
      const deposits = await prisma.deposit.findMany({
        where: {
          status: "CONFIRMED",
          currency: "BRL",
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
      });

      for (const deposit of deposits) {
        const dateKey = deposit.createdAt.toISOString().split("T")[0];
        const entry = history.find((h) => h.date === dateKey);
        if (entry) {
          entry.value += Number(deposit.amount);
        }
      }
    } else if (metric === "withdrawals") {
      const withdrawals = await prisma.withdrawal.findMany({
        where: {
          status: "COMPLETED",
          currency: "BRL",
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
      });

      for (const withdrawal of withdrawals) {
        const dateKey = withdrawal.createdAt.toISOString().split("T")[0];
        const entry = history.find((h) => h.date === dateKey);
        if (entry) {
          entry.value += Number(withdrawal.amount);
        }
      }
    } else if (metric === "trades") {
      const orders = await prisma.order.findMany({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          total: true,
          createdAt: true,
        },
      });

      for (const order of orders) {
        const dateKey = order.createdAt.toISOString().split("T")[0];
        const entry = history.find((h) => h.date === dateKey);
        if (entry) {
          entry.value += Number(order.total);
        }
      }
    } else if (metric === "commissions") {
      // Get deposit fees
      const deposits = await prisma.deposit.findMany({
        where: {
          status: "CONFIRMED",
          currency: "BRL",
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          fee: true,
          createdAt: true,
        },
      });

      // Get crypto trade commissions (3% of transaction amount)
      const cryptoTransactions = await prisma.transaction.findMany({
        where: {
          type: {
            in: ["BUY_CRYPTO", "SELL_CRYPTO"],
          },
          currency: "BRL",
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
      });

      // Aggregate deposit fees
      for (const deposit of deposits) {
        const dateKey = deposit.createdAt.toISOString().split("T")[0];
        const entry = history.find((h) => h.date === dateKey);
        if (entry) {
          entry.value += Number(deposit.fee || 0);
        }
      }

      // Aggregate crypto trade commissions (3% of amount)
      for (const transaction of cryptoTransactions) {
        const dateKey = transaction.createdAt.toISOString().split("T")[0];
        const entry = history.find((h) => h.date === dateKey);
        if (entry) {
          entry.value += Math.abs(Number(transaction.amount || 0)) * 0.03;
        }
      }
    } else if (metric === "balance") {
      // For average balance, we need to calculate daily averages
      // This is more complex - we'll use a simplified approach
      // Get all balances updated in the period and group by date
      const balances = await prisma.balance.findMany({
        where: {
          currency: "BRL",
          updatedAt: {
            gte: startDate,
          },
        },
        select: {
          amount: true,
          updatedAt: true,
        },
      });

      // Group by date and calculate average
      const balanceMap = new Map<string, number[]>();
      for (const balance of balances) {
        const dateKey = balance.updatedAt.toISOString().split("T")[0];
        if (!balanceMap.has(dateKey)) {
          balanceMap.set(dateKey, []);
        }
        balanceMap.get(dateKey)!.push(Number(balance.amount));
      }

      // Calculate daily averages
      for (const entry of history) {
        const dayBalances = balanceMap.get(entry.date);
        if (dayBalances && dayBalances.length > 0) {
          const sum = dayBalances.reduce((a, b) => a + b, 0);
          entry.value = sum / dayBalances.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      metric,
      history,
    });
  } catch (error) {
    console.error("Finance history fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
