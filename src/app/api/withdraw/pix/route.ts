import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPIXWithdrawalReceipt } from "@/lib/receipt-email";
import { getMoneyControls } from "@/lib/money-controls";
import { ledgerService } from "@/lib/ledger";

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

    // Validate input
    if (!amount || amount <= 0) {
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

    // Check BRL balance
    const brlBalance = await prisma.balance.findFirst({
      where: {
        userId: user.id,
        currency: "BRL",
      },
    });

    if (!brlBalance || brlBalance.amount < amount) {
      return NextResponse.json(
        { error: "Insufficient BRL balance" },
        { status: 400 }
      );
    }

    // No fee on PIX withdrawals
    const fee = 0;
    const netAmount = amount;

    // Generate protocol number
    const protocol = `PIX${Date.now()}${Math.random()
      .toString(36)
      .substr(2, 5)
      .toUpperCase()}`;

    // Create withdrawal record
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: user.id,
        type: "PIX",
        amount: amount,
        fee: fee,
        netAmount: netAmount,
        status: "PENDING",
        paymentMethod: "PIX",
        pixKey: pixKey,
        protocol: protocol,
        createdAt: new Date(),
      },
    });

    // Update user balance and record transaction atomically via LedgerService
    const pixWithdrawalTransaction = await ledgerService.recordTransaction({
      userId: user.id,
      type: "WITHDRAWAL",
      amount: -amount,
      currency: "BRL",
      description: `PIX withdrawal to ${pixKey}`,
      status: "PENDING",
      metadata: { withdrawalId: withdrawal.id, protocol },
    });

    await ledgerService.updateBalance(user.id, "BRL", amount, "SUBTRACT");

    // Link withdrawal to transaction
    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: { transactionId: pixWithdrawalTransaction.id },
    });

    // Send PIX withdrawal receipt email (don't await to avoid blocking response)
    if (user.email && user.name) {
      sendPIXWithdrawalReceipt({
        userName: user.name,
        userEmail: user.email,
        amount: Number(amount),
        fee: Number(fee),
        netAmount: Number(netAmount),
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
