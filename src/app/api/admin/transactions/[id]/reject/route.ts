import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";
import { writeAuditLog, getAuditLogIpAndAgent } from "@/lib/audit-log";

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
    const body = await request.json();
    const { reason } = body as { reason: string };

    if (!reason) {
      return NextResponse.json({ error: "Motivo da rejeição é obrigatório" }, { status: 400 });
    }

    // Get transaction with all related data
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        deposit: true,
        withdrawal: true,
        user: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.status !== "PENDING" && transaction.status !== "PROCESSING") {
      return NextResponse.json({ error: "Apenas transações pendentes podem ser rejeitadas" }, { status: 400 });
    }

    // Update records
    await prisma.$transaction(async (tx) => {
      // 1. Update transaction
      await tx.transaction.update({
        where: { id },
        data: {
          status: "REJECTED",
          metadata: {
            ...(transaction.metadata as object || {}),
            rejectionReason: reason,
            rejectedAt: new Date().toISOString(),
            rejectedBy: adminSession.user.email,
          },
        },
      });

      // 2. Update deposit if exists
      if (transaction.deposit) {
        await tx.deposit.update({
          where: { id: transaction.deposit.id },
          data: {
            status: "REJECTED",
          },
        });
      }

      // 3. Update withdrawal if exists
      if (transaction.withdrawal) {
        await tx.withdrawal.update({
          where: { id: transaction.withdrawal.id },
          data: {
            status: "REJECTED",
          },
        });
      }
    });

    // Send notification (non-blocking)
    // Disabled per user request due to domain verification issues
    /*
    try {
      const { sendRejectionReceipt } = await import("@/lib/receipt-email");
      await sendRejectionReceipt({
        userName: transaction.user.name || "Cliente",
        userEmail: transaction.user.email,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        type: transaction.deposit ? "DEPOSIT" : "WITHDRAWAL",
        reason: reason,
        transactionId: transaction.id,
        date: new Date(),
      });
    } catch (err) {
      console.error("Failed to send rejection email:", err);
    }
    */

    const { ipAddress, userAgent } = getAuditLogIpAndAgent(request);
    await writeAuditLog({
      adminId: adminSession.userId,
      adminEmail: adminSession.user.email,
      action: "transaction_reject",
      resourceType: "transaction",
      resourceId: transaction.id,
      newValue: { reason },
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Transação rejeitada com sucesso",
    });
  } catch (error) {
    console.error("Error rejecting transaction:", error);
    return NextResponse.json(
      {
        error: "Falha ao rejeitar transação",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
