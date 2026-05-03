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
    const body = await request.json();
    const { reason: rawReason } = body as { reason?: string };
    const reason = rawReason?.trim();

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

    const depositRejectable =
      transaction.deposit &&
      transaction.deposit.status === "PENDING";
    const withdrawalRejectable =
      transaction.withdrawal &&
      (transaction.withdrawal.status === "PENDING" ||
        transaction.withdrawal.status === "PROCESSING");
    const transactionMetadata =
      (transaction.metadata as Record<string, unknown>) || {};
    const refundRejectable =
      transaction.type === "REFUND" &&
      transactionMetadata.refundStatus !== "APPROVED" &&
      transactionMetadata.refundStatus !== "REJECTED";

    if (!depositRejectable && !withdrawalRejectable && !refundRejectable) {
      return NextResponse.json(
        { error: "Apenas transações pendentes podem ser rejeitadas" },
        { status: 400 }
      );
    }

    let refundForNotification:
      | {
          currency: string;
          amount: Decimal;
          operation: "ADD" | "UNLOCK";
        }
      | null = null;

    // Update records
    await prisma.$transaction(async (tx) => {
      const existingMetadata =
        (transaction.metadata as Record<string, unknown>) || {};
      let refund:
        | {
            currency: string;
            amount: Decimal;
            operation: "ADD" | "UNLOCK";
          }
        | null = null;

      if (transaction.withdrawal) {
        const sourceCurrency = existingMetadata.sourceCurrency;
        const sourceAmountUSDT = existingMetadata.sourceAmountUSDT;

        if (
          sourceCurrency === "USDT" &&
          (typeof sourceAmountUSDT === "number" ||
            typeof sourceAmountUSDT === "string")
        ) {
          refund = {
            currency: "USDT",
            amount: new Decimal(sourceAmountUSDT),
            operation: "ADD",
          };
        } else if (transaction.withdrawal.type === "USDT") {
          refund = {
            currency: "USDT",
            amount: new Decimal(transaction.withdrawal.amount),
            operation: "ADD",
          };
        } else if (transaction.withdrawal.type === "PIX") {
          refund = {
            currency: "BRL",
            amount: new Decimal(transaction.withdrawal.amount),
            operation: "ADD",
          };
        } else {
          // Legacy BRL withdrawals moved funds from available -> locked.
          refund = {
            currency: transaction.withdrawal.currency || transaction.currency,
            amount: new Decimal(transaction.withdrawal.amount),
            operation: "UNLOCK",
          };
        }

        if (refund.amount.lessThanOrEqualTo(0)) {
          refund = null;
        }

        refundForNotification = refund;
      }

      // 1. Update transaction metadata (ledger row has no status field)
      await tx.transaction.update({
        where: { id },
        data: {
          metadata: {
            ...existingMetadata,
            rejectionReason: reason,
            rejectedAt: new Date().toISOString(),
            rejectedBy: adminSession.user.email,
            ...(transaction.type === "REFUND"
              ? {
                  refundStatus: "REJECTED",
                  refundRejectedAt: new Date().toISOString(),
                  refundRejectedBy: adminSession.user.email,
                  refundRejectionReason: reason,
                }
              : {}),
            ...(refund
              ? {
                  refundCurrency: refund.currency,
                  refundAmount: refund.amount.toNumber(),
                  refundOperation: refund.operation,
                }
              : {}),
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
            status: "FAILED",
          },
        });

        if (refund) {
          await ledgerService.updateBalance(
            transaction.userId,
            refund.currency,
            refund.amount,
            refund.operation,
            tx
          );

          await ledgerService.recordTransaction(
            {
              userId: transaction.userId,
              type: "REFUND",
              amount: refund.amount,
              currency: refund.currency,
              description: `Refund for rejected withdrawal ${transaction.withdrawal.protocol || transaction.withdrawal.id}`,
              metadata: {
                originalTransactionId: transaction.id,
                withdrawalId: transaction.withdrawal.id,
                reason,
                refundOperation: refund.operation,
              },
            },
            tx
          );
        }
      }

      const amountLabel = transaction.withdrawal
        ? `${Number(transaction.withdrawal.amount).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} ${transaction.withdrawal.currency}`
        : `${Number(transaction.amount).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} ${transaction.currency}`;

      await tx.notification.create({
        data: {
          userId: transaction.userId,
          type: transaction.withdrawal
            ? "withdrawal_rejected"
            : transaction.type === "REFUND"
            ? "refund_rejected"
            : "deposit_rejected",
          title: transaction.withdrawal
            ? "Saque não aprovado"
            : transaction.type === "REFUND"
            ? "Reembolso não aprovado"
            : "Depósito não aprovado",
          message: transaction.withdrawal
            ? `Seu saque de ${amountLabel} não foi aprovado. Motivo: ${reason}. ${
                refundForNotification
                  ? `O valor foi devolvido ao seu saldo em ${refundForNotification.currency}.`
                  : ""
              }`
            : transaction.type === "REFUND"
            ? `Seu reembolso de ${amountLabel} não foi aprovado. Motivo: ${reason}.`
            : `Seu depósito de ${amountLabel} não foi aprovado. Motivo: ${reason}.`,
          metadata: {
            transactionId: transaction.id,
            withdrawalId: transaction.withdrawal?.id,
            depositId: transaction.deposit?.id,
            reason,
            rejectedAt: new Date().toISOString(),
            rejectedBy: adminSession.user.email,
            ...(refundForNotification
              ? {
                  refundCurrency: refundForNotification.currency,
                  refundAmount: refundForNotification.amount.toNumber(),
                }
              : {}),
          },
        },
      });
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
