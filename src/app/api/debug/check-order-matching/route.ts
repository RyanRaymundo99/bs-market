import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Debug endpoint to check order matching for a specific transaction
 * GET /api/debug/check-order-matching?transactionId=xxx&externalId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transactionId");
    const externalId = searchParams.get("externalId");

    if (!transactionId && !externalId) {
      return NextResponse.json(
        {
          error: "Please provide transactionId or externalId",
        },
        { status: 400 }
      );
    }

    interface MatchResult {
      method: string;
      order: {
        id: string;
        externalOrderId: string | null;
        status: string;
        total: number;
        userId: string;
      };
    }

    interface CheckOrderMatchingResult {
      transactionId: string | null;
      externalId: string | null;
      matches: MatchResult[];
      deposit?: {
        id: string;
        externalId: string;
        amount: number;
        userId: string;
        createdAt: string;
      };
      depositByTransactionId?: {
        id: string;
        externalId: string;
        amount: number;
        userId: string;
      };
    }

    const results: CheckOrderMatchingResult = {
      transactionId,
      externalId,
      matches: [],
    };

    // Try matching by externalOrderId
    if (transactionId) {
      const orderByTransactionId = await prisma.order.findFirst({
        where: { externalOrderId: transactionId },
        include: { user: { select: { id: true, email: true } } },
      });
      if (orderByTransactionId) {
        results.matches.push({
          method: "order.externalOrderId = transactionId",
          order: {
            id: orderByTransactionId.id,
            externalOrderId: orderByTransactionId.externalOrderId,
            status: orderByTransactionId.status,
            total: Number(orderByTransactionId.total),
            userId: orderByTransactionId.userId,
          },
        });
      }
    }

    if (externalId) {
      const orderByExternalId = await prisma.order.findFirst({
        where: { externalOrderId: externalId },
        include: { user: { select: { id: true, email: true } } },
      });
      if (orderByExternalId) {
        results.matches.push({
          method: "order.externalOrderId = externalId",
          order: {
            id: orderByExternalId.id,
            externalOrderId: orderByExternalId.externalOrderId,
            status: orderByExternalId.status,
            total: Number(orderByExternalId.total),
            userId: orderByExternalId.userId,
          },
        });
      }
    }

    // Try matching via deposit
    if (externalId) {
      const deposit = await prisma.deposit.findFirst({
        where: { externalId: externalId },
      });
      if (deposit) {
        results.deposit = {
          id: deposit.id,
          externalId: deposit.externalId,
          amount: Number(deposit.amount),
          userId: deposit.userId,
          createdAt: deposit.createdAt.toISOString(),
        };

        // Try to find matching order
        const matchingOrder = await prisma.order.findFirst({
          where: {
            userId: deposit.userId,
            total: deposit.amount,
            createdAt: {
              gte: new Date(deposit.createdAt.getTime() - 60000),
              lte: new Date(deposit.createdAt.getTime() + 60000),
            },
          },
        });
        if (matchingOrder) {
          results.matches.push({
            method: "deposit.externalId -> order by userId + amount + time",
            order: {
              id: matchingOrder.id,
              externalOrderId: matchingOrder.externalOrderId,
              status: matchingOrder.status,
              total: Number(matchingOrder.total),
              userId: matchingOrder.userId,
            },
          });
        }
      }
    }

    if (transactionId) {
      const depositByTransactionId = await prisma.deposit.findFirst({
        where: { externalId: transactionId },
      });
      if (depositByTransactionId) {
        results.depositByTransactionId = {
          id: depositByTransactionId.id,
          externalId: depositByTransactionId.externalId,
          amount: Number(depositByTransactionId.amount),
          userId: depositByTransactionId.userId,
        };
      }
    }

    // Get recent orders and deposits for comparison
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        externalOrderId: true,
        status: true,
        total: true,
        userId: true,
        createdAt: true,
      },
    });

    const recentDeposits = await prisma.deposit.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        externalId: true,
        amount: true,
        userId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      ...results,
      recentOrders: recentOrders.map((o) => ({
        ...o,
        total: Number(o.total),
        createdAt: o.createdAt.toISOString(),
      })),
      recentDeposits: recentDeposits.map((d) => ({
        ...d,
        amount: Number(d.amount),
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Check order matching error:", error);
    return NextResponse.json(
      {
        error: "Failed to check order matching",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
