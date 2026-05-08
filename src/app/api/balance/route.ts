import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonValidationError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { z } from "zod";

const balancePostSchema = z.object({
  currency: z.string().min(1, "Currency is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  type: z.enum(["ADD", "SUBTRACT"], {
    errorMap: () => ({ message: "Type must be ADD or SUBTRACT" }),
  }),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const balances = await prisma.balance.findMany({
      where: { userId: auth.session.user.id },
      orderBy: { currency: "asc" },
    });

    const usdtBalance = balances.find((b) => b.currency === "USDT");
    if (!usdtBalance) {
      const newUsdtBalance = await prisma.balance.create({
        data: {
          userId: auth.session.user.id,
          currency: "USDT",
          amount: 0,
          locked: 0,
        },
      });
      balances.push(newUsdtBalance);
    }

    const formattedBalances = balances.map((balance) => ({
      ...balance,
      amount: Number(balance.amount),
      locked: Number(balance.locked),
    }));

    return NextResponse.json({ balances: formattedBalances });
  } catch (error) {
    console.error("Balance fetch error:", error);
    return jsonError(500, "Internal server error", "INTERNAL_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const raw = await request.json().catch(() => null);
    const parsed = balancePostSchema.safeParse(raw);
    if (!parsed.success) return jsonValidationError(parsed.error);

    const { currency, amount, type } = parsed.data;

    const currentBalance = await prisma.balance.findUnique({
      where: {
        userId_currency: {
          userId: auth.session.user.id,
          currency,
        },
      },
    });

    let newAmount = amount;
    if (currentBalance && type === "ADD") {
      newAmount = Number(currentBalance.amount) + amount;
    } else if (currentBalance && type === "SUBTRACT") {
      newAmount = Number(currentBalance.amount) - amount;
      if (newAmount < 0) {
        return jsonError(400, "Insufficient balance", "INSUFFICIENT_BALANCE");
      }
    }

    const balance = await prisma.balance.upsert({
      where: {
        userId_currency: {
          userId: auth.session.user.id,
          currency,
        },
      },
      update: {
        amount: newAmount,
        updatedAt: new Date(),
      },
      create: {
        userId: auth.session.user.id,
        currency,
        amount: newAmount,
        locked: 0,
      },
    });

    return NextResponse.json({
      success: true,
      balance: {
        ...balance,
        amount: Number(balance.amount),
        locked: Number(balance.locked),
      },
      message: `${type === "ADD" ? "Added" : "Subtracted"} ${amount} ${currency}`,
    });
  } catch (error) {
    console.error("Balance update error:", error);
    return jsonError(500, "Internal server error", "INTERNAL_ERROR");
  }
}
