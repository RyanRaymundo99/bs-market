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

    const userId = session.user.id;

    // Get deposits for the user
    const deposits = await prisma.deposit.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to last 50 deposits
    });

    // Format deposits for frontend
    const formattedDeposits = deposits.map((deposit) => ({
      id: deposit.id,
      type: deposit.paymentMethod === "PIX" ? "PIX" : "USDT",
      amount: Number(deposit.amount),
      status: deposit.status,
      createdAt: deposit.createdAt.toISOString(),
      hash: deposit.paymentId || null, // Use paymentId as hash for crypto deposits
      network: deposit.paymentMethod === "USDT" ? "TRC20" : null, // Default to TRC20 for USDT
      confirmations: null, // Will be updated when we track blockchain confirmations
      requiredConfirmations: 6, // Standard for USDT
    }));

    return NextResponse.json({
      success: true,
      data: formattedDeposits,
    });
  } catch (error) {
    console.error("Failed to fetch deposits:", error);
    return NextResponse.json(
      { error: "Failed to fetch deposits" },
      { status: 500 }
    );
  }
}
