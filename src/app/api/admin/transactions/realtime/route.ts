import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "../../../../../../prisma/generated/client";
import { Decimal } from "@prisma/client/runtime/library";
import { validateAdminSession } from "@/lib/admin-session";

function getMetadataNumber(
  metadata: unknown,
  keys: string[]
): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const record = metadata as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function firstPositiveNumber(...values: Array<number | null | undefined>) {
  return values.find(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value) && value > 0
  );
}

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
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "200", 10) || 200,
      500
    );
    const since = searchParams.get("since"); // ISO timestamp for incremental updates
    const lastId = searchParams.get("lastId"); // Last transaction ID for pagination
    const type = searchParams.get("type"); // Transaction type filter
    const dateFrom = searchParams.get("dateFrom"); // ISO date start
    const dateTo = searchParams.get("dateTo"); // ISO date end
    const amountMin = searchParams.get("amountMin"); // Min amount (absolute)
    const amountMax = searchParams.get("amountMax"); // Max amount (absolute)

    // Build where clause for transactions
    const where: Prisma.TransactionWhereInput = {};

    // If 'since' is provided, only get transactions after that time (for real-time updates)
    if (since) {
      where.createdAt = { gt: new Date(since) };
    } else {
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }
    }

    if (lastId) {
      where.id = { gt: lastId };
    }

    if (type && type !== "all") {
      where.type = type as Prisma.TransactionWhereInput["type"];
    }

    if (amountMin != null && amountMin !== "" && !isNaN(Number(amountMin))) {
      where.amount = where.amount || {};
      (where.amount as { gte?: unknown }).gte = new Decimal(amountMin);
    }
    if (amountMax != null && amountMax !== "" && !isNaN(Number(amountMax))) {
      where.amount = where.amount || {};
      (where.amount as { lte?: unknown }).lte = new Decimal(amountMax);
    }

    // Fetch transactions and orphan orders (orders with no linked transaction - e.g. failed/abandoned) in parallel
    const [recentTransactions, orphanOrders] = await Promise.all([
      prisma.transaction.findMany({
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
          metadata: true,
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
              paymentAmount: true,
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
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      // Orders that never got a Transaction (failed purchases, abandoned, etc.)
      prisma.order.findMany({
        where: (() => {
          const orderWhere: { transactionId: null; createdAt?: { gte?: Date; lte?: Date } } = { transactionId: null };
          if (!since && (dateFrom || dateTo)) {
            orderWhere.createdAt = {};
            if (dateFrom) orderWhere.createdAt.gte = new Date(dateFrom);
            if (dateTo) {
              const end = new Date(dateTo);
              end.setHours(23, 59, 59, 999);
              orderWhere.createdAt.lte = end;
            }
          }
          return orderWhere;
        })(),
        select: {
          id: true,
          status: true,
          amount: true,
          total: true,
          createdAt: true,
          userId: true,
          externalOrderId: true,
          user: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    // Format transactions for the frontend (lightweight formatting)
    const formattedTransactions = recentTransactions.map((tx) => {
      const amount = Number(tx.amount);
      const balance = Number(tx.balance);
      const metadataBRLAmount = getMetadataNumber(tx.metadata, [
        "amountBRL",
        "totalBRL",
        "paymentAmount",
        "paidAmount",
        "amount_brl",
      ]);

      let fiatAmount = 0;
      let status = "PENDING"; // Default to PENDING (not COMPLETED)
      let relatedId = null;

      if (tx.deposit) {
        fiatAmount =
          firstPositiveNumber(
            tx.order ? Number(tx.order.total) : null,
            metadataBRLAmount,
            tx.deposit.paymentAmount ? Number(tx.deposit.paymentAmount) : null,
            Number(tx.deposit.amount || 0)
          ) ?? 0;
        const depositStatus = tx.deposit.status;
        if (depositStatus === "CONFIRMED") {
          status = "COMPLETED";
        } else if (depositStatus === "REJECTED") {
          status = "REJECTED";
        } else if (depositStatus === "CANCELLED") {
          status = "CANCELLED";
        } else {
          // PENDING or any other status
          status = "PENDING";
        }
        relatedId = tx.deposit.externalId;
      } else if (tx.withdrawal) {
        fiatAmount = Number(tx.withdrawal.amount || 0);
        const withdrawalStatus = tx.withdrawal.status;
        if (withdrawalStatus === "COMPLETED") {
          status = "COMPLETED";
        } else if (withdrawalStatus === "FAILED") {
          status = "FAILED";
        } else if (withdrawalStatus === "CANCELLED") {
          status = "CANCELLED";
        } else {
          // PENDING, PROCESSING, or any other status
          status = "PENDING";
        }
        relatedId = tx.withdrawal.protocol || tx.withdrawal.hash;
      } else if (tx.order) {
        fiatAmount =
          firstPositiveNumber(
            Number(tx.order.total || 0),
            metadataBRLAmount
          ) ?? 0;
        const orderStatus = tx.order.status;
        if (orderStatus === "COMPLETED") {
          status = "COMPLETED";
        } else if (orderStatus === "FAILED") {
          status = "FAILED";
        } else if (orderStatus === "CANCELLED") {
          status = "CANCELLED";
        } else {
          // PENDING, EXECUTING, or any other status
          status = "PENDING";
        }
        relatedId = tx.order.externalOrderId || tx.order.id;
      }

      // Calculate value: use fiatAmount if valid, otherwise use absolute amount
      // For transactions in BRL, use the amount directly; for USDT, we'd need conversion
      let value = 0;
      value =
        firstPositiveNumber(
          fiatAmount,
          metadataBRLAmount,
          tx.currency === "BRL" ? Math.abs(amount) : null,
          Math.abs(amount)
        ) ?? 0;

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
        user: tx.user
          ? { name: tx.user.name || "", email: tx.user.email || "" }
          : null,
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

    // Format orphan orders (no linked transaction) so they appear in the admin list (e.g. failed/abandoned purchases)
    const formattedOrphans = orphanOrders.map((order) => {
      const total = Number(order.total || 0);
      const amount = Number(order.amount || 0);
      return {
        id: `order_${order.id}`,
        type: "BUY_CRYPTO" as const,
        amount,
        currency: "USDT",
        balance: 0,
        description: `Compra USDT (ordem sem transação)`,
        date: order.createdAt.toISOString(),
        user: order.user
          ? { name: order.user.name || "", email: order.user.email || "" }
          : null,
        userId: order.userId,
        value: total,
        status: order.status, // PENDING, FAILED, CANCELLED, EXECUTING, COMPLETED
        relatedId: order.externalOrderId || order.id,
        metadata: { _orphanOrder: true, orderId: order.id },
        orderId: order.id,
        depositId: null,
        withdrawalId: null,
      };
    });

    // Merge and sort by date desc, then take limit
    const merged = [...formattedTransactions, ...formattedOrphans].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const transactions = merged.slice(0, limit);

    return NextResponse.json({
      success: true,
      transactions,
      count: transactions.length,
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
