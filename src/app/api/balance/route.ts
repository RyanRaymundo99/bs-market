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

    const balances = await prisma.balance.findMany({
      where: { userId: session.user.id },
      orderBy: { currency: "asc" },
    });

    // Ensure USDT balance exists (create if it doesn't)
    const usdtBalance = balances.find((b) => b.currency === "USDT");
    if (!usdtBalance) {
      const newUsdtBalance = await prisma.balance.create({
        data: {
          userId: session.user.id,
          currency: "USDT",
          amount: 0,
          locked: 0,
        },
      });
      balances.push(newUsdtBalance);
    }

    // Convert Decimal to number for frontend compatibility
    const formattedBalances = balances.map((balance) => ({
      ...balance,
      amount: Number(balance.amount),
      locked: Number(balance.locked),
    }));

    return NextResponse.json({ balances: formattedBalances });
  } catch (error) {
    console.error("Balance fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const { currency, amount, type } = await request.json();

    if (!currency || !amount || !type) {
      return NextResponse.json(
        { error: "Currency, amount, and type are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Get current balance
    const currentBalance = await prisma.balance.findUnique({
      where: {
        userId_currency: {
          userId: session.user.id,
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
        return NextResponse.json(
          { error: "Insufficient balance" },
          { status: 400 }
        );
      }
    }

    // Update or create balance
    const balance = await prisma.balance.upsert({
      where: {
        userId_currency: {
          userId: session.user.id,
          currency,
        },
      },
      update: {
        amount: newAmount,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
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
      message: `${
        type === "ADD" ? "Added" : "Subtracted"
      } ${amount} ${currency}`,
    });
  } catch (error) {
    console.error("Balance update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
