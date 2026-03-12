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
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Fetch webhook events from database
    const rawWebhooks = await prisma.webhookEvent.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        eventType: true,
        source: true,
        transactionId: true,
        externalId: true,
        status: true,
        orderId: true,
        processed: true,
        error: true,
        signatureValid: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        payload: true,
      },
    });

    // Enrich each webhook with user and transaction type
    const webhooks = await Promise.all(
      rawWebhooks.map(async (w) => {
        let userName: string | null = null;
        let userEmail: string | null = null;
        let transactionType: string | null = null;

        const ids = [w.transactionId, w.externalId, w.orderId].filter(
          (x): x is string => x != null && x !== ""
        );
        if (ids.length === 0) {
          return {
            ...w,
            userName,
            userEmail,
            transactionType,
          };
        }

        // 1. If orderId is set (internal Order id after processing), get Order + user
        if (w.orderId) {
          const order = await prisma.order.findUnique({
            where: { id: w.orderId },
            select: {
              type: true,
              user: { select: { name: true, email: true } },
            },
          });
          if (order) {
            userName = order.user.name;
            userEmail = order.user.email;
            transactionType = order.type === "BUY" ? "Buy" : "Sell";
            return { ...w, userName, userEmail, transactionType };
          }
        }

        // 2. Try Deposit by externalId (provider transaction_id or external_id)
        const deposit = await prisma.deposit.findFirst({
          where: {
            externalId: { in: ids },
          },
          select: {
            user: { select: { name: true, email: true } },
          },
        });
        if (deposit) {
          userName = deposit.user.name;
          userEmail = deposit.user.email;
          transactionType = "Deposit";
          return { ...w, userName, userEmail, transactionType };
        }

        // 3. Try Withdrawal by externalId
        const withdrawal = await prisma.withdrawal.findFirst({
          where: {
            externalId: { in: ids },
          },
          select: {
            user: { select: { name: true, email: true } },
          },
        });
        if (withdrawal) {
          userName = withdrawal.user.name;
          userEmail = withdrawal.user.email;
          transactionType = "Withdrawal";
          return { ...w, userName, userEmail, transactionType };
        }

        // 4. Try Order by externalOrderId (e.g. before webhook stored our Order.id)
        const orderByExternal = await prisma.order.findFirst({
          where: {
            externalOrderId: { in: ids },
          },
          select: {
            type: true,
            user: { select: { name: true, email: true } },
          },
        });
        if (orderByExternal) {
          userName = orderByExternal.user.name;
          userEmail = orderByExternal.user.email;
          transactionType =
            orderByExternal.type === "BUY" ? "Buy" : "Sell";
          return { ...w, userName, userEmail, transactionType };
        }

        return { ...w, userName, userEmail, transactionType };
      })
    );

    return NextResponse.json({
      success: true,
      webhooks,
      total: webhooks.length,
    });
  } catch (error) {
    console.error("Error fetching webhook logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
