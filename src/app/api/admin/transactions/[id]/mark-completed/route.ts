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
    } else if (transaction.type === "WITHDRAWAL") {
      // Try multiple methods to find the withdrawal
      let withdrawal = null;
      
      // Method 1: Try direct relation (if transaction.withdrawal exists)
      if (transaction.withdrawal) {
        withdrawal = transaction.withdrawal;
      } else {
        // Method 2: Try to find by transactionId (reverse lookup)
        withdrawal = await prisma.withdrawal.findFirst({
          where: { transactionId: transaction.id },
        });
      }
      
      // Method 3: Try to find by metadata withdrawalId
      if (!withdrawal) {
        const metadata = transaction.metadata as Record<string, unknown> | null;
        const withdrawalId = metadata?.withdrawalId as string | undefined;
        
        if (withdrawalId) {
          withdrawal = await prisma.withdrawal.findUnique({
            where: { id: withdrawalId },
          });
        }
      }
      
      // Method 4: Try to find by matching user, amount, currency, and date (within 5 minutes)
      if (!withdrawal) {
        const fiveMinutesAgo = new Date(transaction.createdAt.getTime() - 5 * 60 * 1000);
        const fiveMinutesLater = new Date(transaction.createdAt.getTime() + 5 * 60 * 1000);
        
        withdrawal = await prisma.withdrawal.findFirst({
          where: {
            userId: transaction.userId,
            amount: transaction.amount,
            currency: transaction.currency,
            createdAt: {
              gte: fiveMinutesAgo,
              lte: fiveMinutesLater,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });
      }
      
      if (withdrawal) {
        // Update withdrawal status to COMPLETED
        await prisma.withdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: "COMPLETED",
            processedAt: new Date(),
            // Also link the transaction if not already linked
            transactionId: withdrawal.transactionId || transaction.id,
          },
        });
      } else {
        return NextResponse.json(
          { 
            error: "Withdrawal record not found for this transaction",
            details: "Transaction type is WITHDRAWAL but no matching withdrawal record could be found. The withdrawal may not have been created or linked properly."
          },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: `Transaction type not supported for manual completion. Type: ${transaction.type}` },
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
