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

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all aggregate queries in parallel for better performance
    const [
      totalDeposits,
      totalDepositsLastWeek,
      totalWithdrawals,
      totalWithdrawalsLastWeek,
      depositCommissions,
      depositCommissionsLastWeek,
      cryptoTradeCommissions,
      cryptoTradeCommissionsLastWeek,
      averageBalance,
      averageBalanceLastWeek,
    ] = await Promise.all([
      // Calculate total deposits (confirmed only)
      prisma.deposit.aggregate({
        where: {
          status: "CONFIRMED",
          currency: "BRL",
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.deposit.aggregate({
        where: {
          status: "CONFIRMED",
          currency: "BRL",
          createdAt: {
            gte: oneWeekAgo,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      // Calculate total withdrawals (completed only)
      prisma.withdrawal.aggregate({
        where: {
          status: "COMPLETED",
          currency: "BRL",
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.withdrawal.aggregate({
        where: {
          status: "COMPLETED",
          currency: "BRL",
          createdAt: {
            gte: oneWeekAgo,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      // Calculate total commissions based on actual fees charged
      // Deposit commissions: 1.8% commission on deposits (user pays 3% total, we keep 1.8%)
      prisma.deposit.aggregate({
        where: {
          status: "CONFIRMED",
          currency: "BRL",
        },
        _sum: {
          fee: true, // This contains 1.8% commission per deposit
        },
      }),
      prisma.deposit.aggregate({
        where: {
          status: "CONFIRMED",
          currency: "BRL",
          createdAt: {
            gte: oneWeekAgo,
          },
        },
        _sum: {
          fee: true, // This contains 1.8% commission per deposit
        },
      }),
      // Commission from crypto trades
      prisma.transaction.aggregate({
        where: {
          type: {
            in: ["BUY_CRYPTO", "SELL_CRYPTO"],
          },
          currency: "BRL",
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          type: {
            in: ["BUY_CRYPTO", "SELL_CRYPTO"],
          },
          currency: "BRL",
          createdAt: {
            gte: oneWeekAgo,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      // Calculate average user balance
      prisma.balance.aggregate({
        where: {
          currency: "BRL",
        },
        _avg: {
          amount: true,
        },
      }),
      prisma.balance.aggregate({
        where: {
          currency: "BRL",
          updatedAt: {
            gte: oneWeekAgo,
          },
        },
        _avg: {
          amount: true,
        },
      }),
    ]);

    // Total trades volume (removed P2P)
    const totalTrades = { _sum: { fiatAmount: 0 } };
    const totalTradesLastWeek = { _sum: { fiatAmount: 0 } };

    // 2. Commission from P2P trades (removed)
    const tradeCommissions = 0;
    const tradeCommissionsLastWeek = 0;

    // Calculate crypto trade fees (3% of the transaction amount)
    const cryptoFees = Number(cryptoTradeCommissions._sum.amount || 0) * 0.03;
    const cryptoFeesLastWeek =
      Number(cryptoTradeCommissionsLastWeek._sum.amount || 0) * 0.03;

    // Total commissions = deposit commissions (1.8%) + trade fees + crypto fees
    // Note: User pays 3% total on deposits, but our commission is 1.8% (stored in deposit.fee)
    const totalCommissions =
      Number(depositCommissions._sum.fee || 0) + tradeCommissions + cryptoFees;

    const totalCommissionsLastWeek =
      Number(depositCommissionsLastWeek._sum.fee || 0) +
      tradeCommissionsLastWeek +
      cryptoFeesLastWeek;

    // Calculate percentage changes
    const calculatePercentageChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const depositsChange = calculatePercentageChange(
      Number(totalDeposits._sum.amount || 0),
      Number(totalDepositsLastWeek._sum.amount || 0)
    );

    const withdrawalsChange = calculatePercentageChange(
      Number(totalWithdrawals._sum.amount || 0),
      Number(totalWithdrawalsLastWeek._sum.amount || 0)
    );

    const tradesChange = calculatePercentageChange(
      Number(totalTrades._sum.fiatAmount || 0),
      Number(totalTradesLastWeek._sum.fiatAmount || 0)
    );

    const commissionsChange = calculatePercentageChange(
      totalCommissions,
      totalCommissionsLastWeek
    );

    const balanceChange = calculatePercentageChange(
      Number(averageBalance._avg.amount || 0),
      Number(averageBalanceLastWeek._avg.amount || 0)
    );

    // Get recent transactions for the table
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        deposit: {
          select: {
            status: true,
            amount: true,
            externalId: true,
            confirmedAt: true,
          },
        },
        withdrawal: {
          select: {
            status: true,
            amount: true,
            hash: true,
            protocol: true,
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            externalOrderId: true,
            executedAt: true,
            amount: true,
            total: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    // Format transactions for the frontend
    const formattedTransactions = recentTransactions.map((transaction) => {
      let status = "PENDING";
      const type = transaction.type;

      // Determine status based on related entity
      if (transaction.deposit) {
        status =
          transaction.deposit.status === "CONFIRMED"
            ? "APPROVED"
            : transaction.deposit.status === "REJECTED"
            ? "REJECTED"
            : "PENDING";
      } else if (transaction.withdrawal) {
        status =
          transaction.withdrawal.status === "COMPLETED"
            ? "APPROVED"
            : transaction.withdrawal.status === "FAILED"
            ? "REJECTED"
            : "PENDING";
      } else if (transaction.order) {
        // For BUY_CRYPTO and SELL_CRYPTO, use order status
        status =
          transaction.order.status === "COMPLETED"
            ? "APPROVED"
            : transaction.order.status === "FAILED"
            ? "REJECTED"
            : "PENDING";
      }

      return {
        id: transaction.id,
        date: transaction.createdAt.toISOString(),
        type: type,
        user: transaction.user.name || transaction.user.email,
        userId: transaction.userId,
        value: Number(transaction.amount),
        status: status,
        metadata: transaction.metadata,
        orderId: transaction.order?.id || null,
        depositId: transaction.deposit ? "exists" : null,
        withdrawalId: transaction.withdrawal ? "exists" : null,
      };
    });

    // Get chart data for the last 30 days
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const dayDeposits = await prisma.deposit.aggregate({
        where: {
          status: "CONFIRMED",
          currency: "BRL",
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const dayWithdrawals = await prisma.withdrawal.aggregate({
        where: {
          status: "COMPLETED",
          currency: "BRL",
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
        _sum: {
          amount: true,
        },
      });

      // Calculate daily trade volume (from orders)
      const dayTrades = await prisma.order.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
        _sum: {
          total: true,
        },
      });

      chartData.push({
        date: date.toISOString().split("T")[0],
        deposits: Number(dayDeposits._sum.amount || 0),
        withdrawals: Number(dayWithdrawals._sum.amount || 0),
        trades: Number(dayTrades._sum.total || 0),
      });
    }

    const financeStats = {
      totalDeposits: Number(totalDeposits._sum.amount || 0),
      totalWithdrawals: Number(totalWithdrawals._sum.amount || 0),
      totalTrades: Number(totalTrades._sum.fiatAmount || 0),
      totalCommissions: totalCommissions,
      averageUserBalance: Number(averageBalance._avg.amount || 0),
      depositsChange: Number(depositsChange.toFixed(1)),
      withdrawalsChange: Number(withdrawalsChange.toFixed(1)),
      tradesChange: Number(tradesChange.toFixed(1)),
      commissionsChange: Number(commissionsChange.toFixed(1)),
      balanceChange: Number(balanceChange.toFixed(1)),
    };

    return NextResponse.json({
      success: true,
      financeStats,
      transactions: formattedTransactions,
      chartData,
    });
  } catch (error) {
    console.error("Finance data fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
