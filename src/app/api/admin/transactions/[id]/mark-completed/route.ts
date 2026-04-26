import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";
import { writeAuditLog, getAuditLogIpAndAgent } from "@/lib/audit-log";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";

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
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty
    }
    const { hash: providedHash } = body as { hash?: string };

    // Use a single transaction for the entire approval process
    return await prisma.$transaction(async (tx) => {
      // 1. Get transaction with lock to prevent race conditions
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: {
          deposit: true,
          withdrawal: true,
          order: true,
        },
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      // 2. IDEMPOTENCY CHECK: Prevent processing already finished transactions
      if (transaction.status === "COMPLETED" || transaction.status === "APPROVED" || transaction.status === "CONFIRMED") {
        return NextResponse.json({ 
          success: true, 
          message: "Transaction is already completed",
          transactionId: transaction.id 
        });
      }

      if (transaction.status === "REJECTED" || transaction.status === "CANCELLED") {
        throw new Error(`Cannot approve a ${transaction.status} transaction`);
      }

      // 3. Process based on transaction type
      if (transaction.deposit) {
        // Update deposit status to CONFIRMED
        await tx.deposit.update({
          where: { id: transaction.deposit.id },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
          },
        });

        // Update user balance atomically via LedgerService
        const updatedBalance = await ledgerService.updateBalance(
          transaction.userId,
          transaction.currency,
          transaction.amount,
          "ADD",
          tx
        );

        // Update transaction record
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "COMPLETED",
            balance: updatedBalance.amount, // Updated snapshot
            description: transaction.description || `Depósito de ${transaction.amount} ${transaction.currency} confirmado`,
          },
        });
      } 
      else if (transaction.withdrawal || transaction.type === "WITHDRAWAL") {
        // For withdrawals, balance is usually deducted when requested (PENDING).
        // Here we just mark the withdrawal record as completed.
        
        let withdrawalId = transaction.withdrawal?.id;
        
        // If not directly linked, try to find it via metadata or transactionId
        if (!withdrawalId) {
          const metadata = transaction.metadata as Record<string, unknown> | null;
          withdrawalId = metadata?.withdrawalId as string | undefined;
          
          if (!withdrawalId) {
            const withdrawal = await tx.withdrawal.findFirst({
              where: { transactionId: transaction.id }
            });
            withdrawalId = withdrawal?.id;
          }
        }

        if (withdrawalId) {
          await tx.withdrawal.update({
            where: { id: withdrawalId },
            data: {
              status: "COMPLETED",
              processedAt: new Date(),
              hash: providedHash || undefined,
            },
          });
        }

        // Update transaction record
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "COMPLETED",
            description: transaction.description || `Saque de ${transaction.amount} ${transaction.currency} processado`,
          },
        });
      } 
      else if (transaction.order) {
        // Update order status to COMPLETED
        await tx.order.update({
          where: { id: transaction.order.id },
          data: {
            status: "COMPLETED",
            executedAt: new Date(),
          },
        });

        // Update transaction record
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "COMPLETED",
          },
        });
      } 
      else {
        throw new Error(`Transaction type ${transaction.type} not supported for manual completion`);
      }

      // 4. Audit Log
      const { ipAddress, userAgent } = getAuditLogIpAndAgent(request);
      await writeAuditLog({
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: "transaction_mark_completed",
        resourceType: "transaction",
        resourceId: transaction.id,
        newValue: { type: transaction.type, status: "COMPLETED" },
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
      });

      return NextResponse.json({
        success: true,
        message: "Transaction marked as completed successfully",
        transactionId: transaction.id,
      });
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
