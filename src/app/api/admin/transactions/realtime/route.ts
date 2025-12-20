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

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const since = searchParams.get("since"); // ISO timestamp for incremental updates
    const lastId = searchParams.get("lastId"); // Last transaction ID for pagination

    // Build where clause
    const where: any = {};

    // If 'since' is provided, only get transactions after that time (for real-time updates)
    if (since) {
      where.createdAt = {
        gt: new Date(since),
      };
    }

    // If 'lastId' is provided, use cursor-based pagination
    if (lastId) {
      where.id = {
        gt: lastId,
      };
    }

    // Get recent transactions (optimized query - only fetch what's needed)
    const recentTransactions = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        balance: true,
        description: true,
        createdAt: true,
        userId: true,
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
            network: true,
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
      take: limit,
    });

    // Format transactions for the frontend (lightweight formatting)
    const formattedTransactions = recentTransactions.map((tx) => {
      const amount = Number(tx.amount);
      const balance = Number(tx.balance);

      let fiatAmount = 0;
      let status = "COMPLETED";
      let relatedId = null;

      if (tx.deposit) {
        fiatAmount = Number(tx.deposit.amount || 0);
        status = tx.deposit.status || "PENDING";
        relatedId = tx.deposit.externalId;
      } else if (tx.withdrawal) {
        fiatAmount = Number(tx.withdrawal.amount || 0);
        status = tx.withdrawal.status || "PENDING";
        relatedId = tx.withdrawal.protocol || tx.withdrawal.hash;
      } else if (tx.order) {
        fiatAmount = Number(tx.order.total || 0);
        status = tx.order.status || "PENDING";
        relatedId = tx.order.externalOrderId || tx.order.id;
      }

      return {
        id: tx.id,
        type: tx.type,
        amount: amount,
        currency: tx.currency,
        balance: balance,
        description: tx.description,
        date: tx.createdAt.toISOString(),
        user: tx.user
          ? {
              name: tx.user.name,
              email: tx.user.email,
            }
          : null,
        fiatAmount: fiatAmount,
        status: status,
        relatedId: relatedId,
      };
    });

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      count: formattedTransactions.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Realtime transactions error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch transactions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
