import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get transaction with all related data
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        deposit: true,
        withdrawal: true,
        order: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Update based on transaction type
    if (transaction.deposit) {
      // Update deposit status to CONFIRMED
      await prisma.deposit.update({
        where: { id: transaction.deposit.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });
    } else if (transaction.withdrawal) {
      // Update withdrawal status to COMPLETED
      await prisma.withdrawal.update({
        where: { id: transaction.withdrawal.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
        },
      });
    } else if (transaction.order) {
      // Update order status to COMPLETED
      await prisma.order.update({
        where: { id: transaction.order.id },
        data: {
          status: "COMPLETED",
          executedAt: new Date(),
        },
      });
    } else {
      return NextResponse.json(
        { error: "Transaction type not supported for manual completion" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transaction marked as completed successfully",
      transactionId: transaction.id,
    });
  } catch (error) {
    console.error("Error marking transaction as completed:", error);
    return NextResponse.json(
      {
        error: "Failed to mark transaction as completed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
