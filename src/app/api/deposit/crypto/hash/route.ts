import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    if (deposit.user.email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update metadata with the hash
    const currentMetadata = (deposit.metadata as Record<string, any>) || {};
    const updatedMetadata = {
      ...currentMetadata,
      transactionHash: hash,
      hashSubmittedAt: new Date().toISOString(),
    };

    await prisma.deposit.update({
      where: { id: transactionId },
      data: {
        metadata: updatedMetadata,
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
