import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";
import { LedgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";
import { sendBalanceAdjustmentEmail } from "@/lib/receipt-email";

const ledgerService = new LedgerService();

export async function POST(request: NextRequest) {
  try {
    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, currency, amount, operation, reason } =
      await request.json();

    // Validate input
    if (!userId || !currency || !amount || !operation) {
      return NextResponse.json(
        {
          error: "Missing required fields: userId, currency, amount, operation",
        },
        { status: 400 }
      );
    }

    if (!["USDT", "BRL"].includes(currency)) {
      return NextResponse.json(
        { error: "Invalid currency. Must be USDT or BRL" },
        { status: 400 }
      );
    }

    if (!["CREDIT", "DEDUCT"].includes(operation)) {
      return NextResponse.json(
        { error: "Invalid operation. Must be CREDIT or DEDUCT" },
        { status: 400 }
      );
    }

    const amountDecimal = new Decimal(amount);
    if (amountDecimal.lte(0)) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get current balance
    const currentBalance = await ledgerService.getUserBalance(userId, currency);

    // Perform operation
    let transactionType: "DEPOSIT" | "WITHDRAWAL" | "FEE" | "REFUND";

    if (operation === "CREDIT") {
      await ledgerService.updateBalance(userId, currency, amountDecimal, "ADD");
      transactionType = "DEPOSIT";
    } else {
      // DEDUCT
      if (currentBalance.amount.lt(amountDecimal)) {
        return NextResponse.json(
          {
            error: `Insufficient balance. Current balance: ${currentBalance.amount.toFixed(
              2
            )} ${currency}, requested deduction: ${amountDecimal.toFixed(
              2
            )} ${currency}`,
          },
          { status: 400 }
        );
      }

      await ledgerService.updateBalance(
        userId,
        currency,
        amountDecimal,
        "SUBTRACT"
      );
      transactionType = "WITHDRAWAL";
    }

    // Get updated balance for transaction record
    const updatedBalance = await ledgerService.getUserBalance(userId, currency);

    // Create transaction record for audit
    const transaction = await ledgerService.createTransaction({
      userId: userId,
      type: transactionType,
      amount:
        operation === "CREDIT"
          ? amountDecimal
          : new Decimal(-amountDecimal.toNumber()),
      currency: currency,
      description: `Admin ${
        operation === "CREDIT" ? "credit" : "deduction"
      }: ${amountDecimal.toFixed(2)} ${currency}${
        reason ? ` - ${reason}` : ""
      }`,
      metadata: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        operation: operation,
        reason: reason || null,
        previousBalance: currentBalance.amount.toNumber(),
        newBalance: updatedBalance.amount.toNumber(),
        timestamp: new Date().toISOString(),
      },
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: userId,
        type: "balance_adjusted",
        title:
          operation === "CREDIT"
            ? `Saldo Creditado - ${amountDecimal.toFixed(2)} ${currency}`
            : `Saldo Deduzido - ${amountDecimal.toFixed(2)} ${currency}`,
        message:
          operation === "CREDIT"
            ? `Seu saldo foi creditado com ${amountDecimal.toFixed(
                2
              )} ${currency}. Novo saldo: ${updatedBalance.amount.toFixed(
                2
              )} ${currency}.${reason ? ` Motivo: ${reason}` : ""}`
            : `Seu saldo foi deduzido em ${amountDecimal.toFixed(
                2
              )} ${currency}. Novo saldo: ${updatedBalance.amount.toFixed(
                2
              )} ${currency}.${reason ? ` Motivo: ${reason}` : ""}`,
        metadata: {
          transactionId: transaction.id,
          operation: operation,
          amount: amountDecimal.toNumber(),
          currency: currency,
          previousBalance: currentBalance.amount.toNumber(),
          newBalance: updatedBalance.amount.toNumber(),
          reason: reason || null,
          adminId: adminSession.userId,
        },
      },
    });

    // Send balance adjustment email (don't await to avoid blocking response)
    if (user.email && user.name) {
      sendBalanceAdjustmentEmail({
        userName: user.name,
        userEmail: user.email,
        operation: operation,
        amount: amountDecimal.toNumber(),
        currency: currency,
        previousBalance: currentBalance.amount.toNumber(),
        newBalance: updatedBalance.amount.toNumber(),
        reason: reason || null,
        transactionId: transaction.id,
        date: new Date(),
      })
        .then((result) => {
          if (result.success) {
            console.log(
              `✅ Balance adjustment email sent to ${user.email} (${operation})`
            );
          } else {
            console.error(
              `❌ Failed to send balance adjustment email: ${result.message}`
            );
          }
        })
        .catch((error) => {
          console.error("Failed to send balance adjustment email:", error);
          // Don't fail the request if email fails
        });
    }

    return NextResponse.json({
      success: true,
      message: `Balance ${
        operation === "CREDIT" ? "credited" : "deducted"
      } successfully`,
      data: {
        userId: userId,
        userName: user.name,
        userEmail: user.email,
        currency: currency,
        operation: operation,
        amount: amountDecimal.toNumber(),
        previousBalance: currentBalance.amount.toNumber(),
        newBalance: updatedBalance.amount.toNumber(),
        transactionId: transaction.id,
        reason: reason || null,
      },
    });
  } catch (error) {
    console.error("Admin balance adjustment error:", error);
    return NextResponse.json(
      {
        error: "Failed to adjust balance",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
