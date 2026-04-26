import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";
import { sendBalanceAdjustmentEmail } from "@/lib/receipt-email";
import { writeAuditLog, getAuditLogIpAndAgent } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  try {
    // Validate admin session
    const adminSession = await validateAdminSession(request);
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, currency, amount, operation, reason } = await request.json();

    // Validate input
    if (!userId || !currency || !amount || !operation) {
      return NextResponse.json(
        { error: "Missing required fields: userId, currency, amount, operation" },
        { status: 400 }
      );
    }

    if (!["USDT", "BRL"].includes(currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    if (!["CREDIT", "DEDUCT"].includes(operation)) {
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
    }

    const amountDecimal = new Decimal(amount);
    if (amountDecimal.lte(0)) {
      return NextResponse.json({ error: "Amount must be > 0" }, { status: 400 });
    }

    // Process in a transaction for safety
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get user and balance with lock
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const currentBalance = await ledgerService.getUserBalance(userId, currency, tx);

      // 2. Perform balance update
      let updatedBalance;
      let transType: "DEPOSIT" | "WITHDRAWAL" | "FEE" | "REFUND" | "ADJUSTMENT" = "ADJUSTMENT";

      if (operation === "CREDIT") {
        updatedBalance = await ledgerService.updateBalance(userId, currency, amountDecimal, "ADD", tx);
        transType = "DEPOSIT";
      } else {
        if (currentBalance.amount.lt(amountDecimal)) {
          throw new Error(`Insufficient balance. Current: ${currentBalance.amount.toFixed(2)}`);
        }
        updatedBalance = await ledgerService.updateBalance(userId, currency, amountDecimal, "SUBTRACT", tx);
        transType = "WITHDRAWAL";
      }

      // 3. Create transaction record
      const transaction = await ledgerService.recordTransaction({
        userId,
        type: transType,
        amount: operation === "CREDIT" ? amountDecimal : amountDecimal.negated(),
        currency,
        description: `Admin ${operation === "CREDIT" ? "credit" : "deduction"}: ${amountDecimal.toFixed(2)} ${currency}${reason ? ` - ${reason}` : ""}`,
        metadata: {
          adminId: adminSession.userId,
          operation,
          reason: reason || null,
          previousBalance: currentBalance.amount.toNumber(),
          newBalance: updatedBalance.amount.toNumber(),
        }
      }, tx);

      // 4. Create notification
      await tx.notification.create({
        data: {
          userId,
          type: "balance_adjusted",
          title: operation === "CREDIT" ? "Saldo Creditado" : "Saldo Deduzido",
          message: `Seu saldo foi ${operation === "CREDIT" ? "creditado" : "deduzido"} em ${amountDecimal.toFixed(2)} ${currency}. Novo saldo: ${updatedBalance.amount.toFixed(2)} ${currency}.`,
          metadata: { transactionId: transaction.id, operation, amount: amountDecimal.toNumber(), currency }
        }
      });

      return {
        transaction,
        previousBalance: currentBalance.amount,
        newBalance: updatedBalance.amount,
        user
      };
    });

    // Post-transaction tasks (non-blocking)
    if (result.user.email && result.user.name) {
      sendBalanceAdjustmentEmail({
        userName: result.user.name,
        userEmail: result.user.email,
        operation,
        amount: amountDecimal.toNumber(),
        currency,
        previousBalance: result.previousBalance.toNumber(),
        newBalance: result.newBalance.toNumber(),
        reason: reason || null,
        transactionId: result.transaction.id,
        date: new Date(),
      }).catch(err => console.error("Email error:", err));
    }

    const { ipAddress, userAgent } = getAuditLogIpAndAgent(request);
    await writeAuditLog({
      adminId: adminSession.userId,
      adminEmail: adminSession.user.email,
      action: "balance_adjust",
      resourceType: "balance",
      resourceId: result.transaction.id,
      oldValue: { balance: result.previousBalance.toNumber(), currency },
      newValue: { balance: result.newBalance.toNumber(), currency, operation, reason: reason || null },
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Balance adjusted successfully",
      data: {
        newBalance: result.newBalance.toNumber(),
        transactionId: result.transaction.id,
      }
    });

  } catch (error) {
    console.error("Balance adjust error:", error);
    return NextResponse.json(
      { error: "Failed to adjust balance", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
