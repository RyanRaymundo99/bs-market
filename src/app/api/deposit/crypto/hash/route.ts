import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("better-auth.session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const userEmail = session.user.email;

    const body = await req.json();
    const { transactionId, hash } = body;

    if (!transactionId || !hash) {
      return NextResponse.json(
        { error: "Transaction ID and Hash are required" },
        { status: 400 }
      );
    }

    // Find the deposit
    const deposit = await prisma.deposit.findUnique({
      where: { id: transactionId },
      include: { user: true },
    });

    if (!deposit) {
      return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
    }

    // Verify ownership
    if (deposit.user.email !== userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hashPayload = {
      transactionHash: hash,
      hashSubmittedAt: new Date().toISOString(),
    };

    if (!deposit.transactionId) {
      return NextResponse.json(
        {
          error:
            "Este depósito ainda não está vinculado a uma transação no sistema; não é possível salvar o hash.",
        },
        { status: 422 }
      );
    }

    const ledgerTx = await prisma.transaction.findUnique({
      where: { id: deposit.transactionId },
    });
    const currentMetadata =
      (ledgerTx?.metadata as Record<string, unknown>) || {};
    await prisma.transaction.update({
      where: { id: deposit.transactionId },
      data: {
        metadata: { ...currentMetadata, ...hashPayload },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Transaction hash updated successfully",
    });
  } catch (error) {
    console.error("Error updating transaction hash:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
