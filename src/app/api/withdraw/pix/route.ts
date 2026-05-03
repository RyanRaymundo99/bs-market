import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPIXWithdrawalReceipt } from "@/lib/receipt-email";
import { getMoneyControls } from "@/lib/money-controls";
import { ledgerService } from "@/lib/ledger";
import { bancoCentralService } from "@/lib/banco-central";
import { cryptoRatesService } from "@/lib/crypto-rates";
import { Decimal } from "@prisma/client/runtime/library";

const PIX_USDT_TO_BRL_PAYOUT_RATE = new Decimal(0.98);

async function getServerUSDTBRLRate() {
  try {
    if (process.env.USE_REALTIME_RATES !== "false") {
      return new Decimal(await cryptoRatesService.getUSDTRate());
    }

    return new Decimal(await bancoCentralService.getUSDTRate());
  } catch {
    try {
      return new Decimal(await bancoCentralService.getUSDTRate());
    } catch {
      return new Decimal(5);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get("better-auth.session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the session in the database
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

    const user = session.user;

    // Check if user is approved
    if (user.approvalStatus === "REJECTED") {
      return NextResponse.json(
        { error: "Sua conta foi rejeitada. Entre em contato com o suporte." },
        { status: 403 }
      );
    }

    // Check if user is pending
    if (user.approvalStatus === "PENDING") {
      return NextResponse.json(
        {
          error:
            "Sua conta está pendente de aprovação. Complete seu cadastro e aguarde a aprovação.",
        },
        { status: 403 }
      );
    }

    // Check if KYC is pending
    if (user.kycStatus === "PENDING") {
      return NextResponse.json(
        {
          error:
            "Sua verificação KYC está pendente. Complete o upload dos documentos KYC para realizar saques.",
        },
        { status: 403 }
      );
    }

    // Admin-controlled switch to disable withdrawals
    const moneyControls = await getMoneyControls();
    if (moneyControls.withdrawalsDisabled) {
      return NextResponse.json(
        {
          error: moneyControls.withdrawalsDisabledMessage,
          code: "WITHDRAWALS_DISABLED",
        },
        { status: 503 }
      );
    }

    // Parse request body
    const { amount, pixKey, cpf } = await request.json();
    const withdrawalAmountBRL = new Decimal(amount || 0);

    // Validate input
    if (withdrawalAmountBRL.lessThanOrEqualTo(0)) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (!pixKey || !cpf) {
      return NextResponse.json(
        { error: "PIX key and CPF are required" },
        { status: 400 }
      );
    }

    // CPF Validation Function
    const isValidCPF = (cpfValue: string) => {
      const cleanCPF = cpfValue.replace(/\D/g, "");
      if (cleanCPF.length !== 11) return false;
      if (/^(\d)\1+$/.test(cleanCPF)) return false;
      
      let sum = 0;
      let remainder;
      
      for (let i = 1; i <= 9; i++) {
        sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
      }
      
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
      
      sum = 0;
      for (let i = 1; i <= 10; i++) {
        sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
      }
      
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
      
      return true;
    };

    if (!isValidCPF(cpf)) {
      return NextResponse.json({ error: "CPF informado é inválido" }, { status: 400 });
    }

    // No fee on PIX withdrawals
    const fee = new Decimal(0);
    const netAmount = withdrawalAmountBRL;
    const usdtBrlRate = await getServerUSDTBRLRate();
    const effectiveRate = usdtBrlRate.mul(PIX_USDT_TO_BRL_PAYOUT_RATE);
    const usdtToDebit = withdrawalAmountBRL.div(effectiveRate).toDecimalPlaces(8);

    if (usdtToDebit.lessThanOrEqualTo(0)) {
      return NextResponse.json(
        { error: "Invalid conversion rate" },
        { status: 500 }
      );
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
        const usdtBalance = await tx.balance.findUnique({
          where: { userId_currency: { userId: user.id, currency: "USDT" } },
        });

        if (!usdtBalance || usdtBalance.amount.lessThan(usdtToDebit)) {
          throw new Error("INSUFFICIENT_USDT_BALANCE");
        }

        // Generate protocol number
        const protocol = `PIX${Date.now()}${Math.random()
          .toString(36)
          .substr(2, 5)
          .toUpperCase()}`;

        // Create withdrawal record in BRL for admin payout processing.
        const withdrawal = await tx.withdrawal.create({
          data: {
            userId: user.id,
            type: "PIX",
            amount: withdrawalAmountBRL,
            fee,
            netAmount,
            status: "PENDING",
            paymentMethod: "PIX",
            pixKey: pixKey,
            protocol: protocol,
            createdAt: new Date(),
          },
        });

        const pixWithdrawalTransaction = await ledgerService.recordTransaction(
          {
            userId: user.id,
            type: "WITHDRAWAL",
            amount: withdrawalAmountBRL.negated(),
            currency: "BRL",
            description: `PIX withdrawal to ${pixKey}`,
            metadata: {
              withdrawalId: withdrawal.id,
              protocol,
              sourceCurrency: "USDT",
              sourceAmountUSDT: usdtToDebit.toNumber(),
              exchangeRate: usdtBrlRate.toNumber(),
              payoutRate: PIX_USDT_TO_BRL_PAYOUT_RATE.toNumber(),
            },
          },
          tx
        );

        await ledgerService.updateBalance(
          user.id,
          "USDT",
          usdtToDebit,
          "SUBTRACT",
          tx
        );

        // Link withdrawal to transaction
        await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: { transactionId: pixWithdrawalTransaction.id },
        });

        return { withdrawal, pixWithdrawalTransaction, protocol };
      }).catch((error) => {
        if (
          error instanceof Error &&
          error.message === "INSUFFICIENT_USDT_BALANCE"
        ) {
          return null;
        }
        throw error;
      });

    if (!transactionResult) {
      return NextResponse.json(
        { error: "Insufficient USDT balance" },
        { status: 400 }
      );
    }

    const { withdrawal, pixWithdrawalTransaction, protocol } = transactionResult;

    // Send PIX withdrawal receipt email (don't await to avoid blocking response)
    if (user.email && user.name) {
      sendPIXWithdrawalReceipt({
        userName: user.name,
        userEmail: user.email,
        amount: withdrawalAmountBRL.toNumber(),
        fee: fee.toNumber(),
        netAmount: netAmount.toNumber(),
        pixKey: pixKey,
        protocol: protocol,
        date: new Date(),
        status: "PENDING",
      })
        .then(async (result) => {
          // Track receipt in transaction metadata
          const metadata =
            (pixWithdrawalTransaction.metadata as Record<string, unknown>) ||
            {};
          const receiptHistory =
            (metadata.receiptHistory as Array<{
              sentAt: string;
              success: boolean;
              error?: string;
            }>) || [];

          receiptHistory.push({
            sentAt: new Date().toISOString(),
            success: result.success,
            ...(result.message && !result.success
              ? { error: result.message }
              : {}),
          });

          await prisma.transaction.update({
            where: { id: pixWithdrawalTransaction.id },
            data: {
              metadata: {
                ...metadata,
                receiptHistory,
                lastReceiptSentAt: new Date().toISOString(),
                lastReceiptSuccess: result.success,
              },
            },
          });
        })
        .catch((error) => {
          console.error("Failed to send PIX withdrawal receipt email:", error);
          // Don't fail the request if email fails
        });
    }

    // TODO: In a real implementation, you would:
    // 1. Send the PIX request to a payment processor
    // 2. Update the withdrawal status based on the response
    // 3. Handle webhooks for status updates

    return NextResponse.json({
      success: true,
      message: "PIX withdrawal request created successfully",
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        netAmount: withdrawal.netAmount,
        fee: withdrawal.fee,
        protocol: withdrawal.protocol,
        status: withdrawal.status,
        pixKey: withdrawal.pixKey,
        createdAt: withdrawal.createdAt,
      },
    });
  } catch (error) {
    console.error("PIX withdrawal error:", error);
    return NextResponse.json(
      { error: "Failed to process PIX withdrawal" },
      { status: 500 }
    );
  }
}
