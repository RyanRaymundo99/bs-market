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
    const where: {
      createdAt?: { gt: Date };
      id?: { gt: string };
    } = {};

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
        status = tx.deposit.status === "CONFIRMED" ? "COMPLETED" : tx.deposit.status === "REJECTED" ? "REJECTED" : "PENDING";
        relatedId = tx.deposit.externalId;
      } else if (tx.withdrawal) {
        fiatAmount = Number(tx.withdrawal.amount || 0);
        status = tx.withdrawal.status === "COMPLETED" ? "COMPLETED" : tx.withdrawal.status === "REJECTED" ? "REJECTED" : "PENDING";
        relatedId = tx.withdrawal.protocol || tx.withdrawal.hash;
      } else if (tx.order) {
        fiatAmount = Number(tx.order.total || 0);
        status = tx.order.status === "COMPLETED" ? "COMPLETED" : tx.order.status === "FAILED" ? "REJECTED" : "PENDING";
        relatedId = tx.order.externalOrderId || tx.order.id;
      }

      // Calculate value: use fiatAmount if valid, otherwise use absolute amount
      // For transactions in BRL, use the amount directly; for USDT, we'd need conversion
      let value = 0;
      if (fiatAmount && !isNaN(fiatAmount) && fiatAmount > 0) {
        value = fiatAmount;
      } else if (tx.currency === "BRL") {
        // If currency is BRL, use the absolute transaction amount
        value = Math.abs(amount);
      } else {
        // For USDT or other currencies, use absolute amount (will need conversion on frontend if needed)
        value = Math.abs(amount);
      }

      // Ensure value is never NaN
      if (isNaN(value)) {
        value = 0;
      }

      return {
        id: tx.id,
        type: tx.type,
        amount: amount,
        currency: tx.currency,
        balance: balance,
        description: tx.description,
        date: tx.createdAt.toISOString(),
        user: tx.user ? { name: tx.user.name || "", email: tx.user.email || "" } : null,
        userId: tx.userId,
        value: value,
        status: status,
        relatedId: relatedId,
        metadata: tx.metadata,
        orderId: tx.order?.id || null,
        depositId: tx.deposit ? tx.id : null,
        withdrawalId: tx.withdrawal ? tx.id : null,
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
