import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");
    const currency = searchParams.get("currency");

    const where: Record<string, unknown> = { userId: session.user.id };

    if (type) {
      where.type = type;
    }

    if (currency) {
      where.currency = currency;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        deposit: {
          select: {
            status: true,
          },
        },
        withdrawal: {
          select: {
            status: true,
          },
        },
        order: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.transaction.count({ where });

    // Convert Decimal amounts to numbers and determine status
    const formattedTransactions = transactions.map((transaction) => {
      let status = "COMPLETED"; // Default status

      // Determine status from related entities
      if (transaction.deposit) {
        status =
          transaction.deposit.status === "CONFIRMED"
            ? "COMPLETED"
            : transaction.deposit.status === "REJECTED"
            ? "REJECTED"
            : "PENDING";
      } else if (transaction.withdrawal) {
        status =
          transaction.withdrawal.status === "COMPLETED"
            ? "COMPLETED"
            : transaction.withdrawal.status === "FAILED" ||
              transaction.withdrawal.status === "CANCELLED"
            ? "FAILED"
            : "PENDING";
      } else if (transaction.order) {
        status =
          transaction.order.status === "COMPLETED"
            ? "COMPLETED"
            : transaction.order.status === "FAILED"
            ? "FAILED"
            : "PENDING";
      }

      return {
        ...transaction,
        amount: Number(transaction.amount),
        balance: Number(transaction.balance),
        status,
      };
    });

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Transactions fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
