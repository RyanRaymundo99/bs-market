import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authSession.user.id;

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
