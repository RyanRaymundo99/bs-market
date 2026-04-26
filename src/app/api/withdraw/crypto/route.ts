import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { paymentService } from "@/lib/payment";
import { sendWithdrawalReceipt } from "@/lib/receipt-email";
import { getMoneyControls } from "@/lib/money-controls";
import {
  getAdminAlertSettings,
  sendAdminAlertToAll,
} from "@/lib/admin-alert-email";
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
    const { amount, walletAddress, network } = await request.json();

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (!walletAddress || !network) {
      return NextResponse.json(
        { error: "Wallet address and network are required" },
        { status: 400 }
      );
    }

    // Validate network
    const validNetworks = ["TRC20", "ERC20", "POLYGON"];
    if (!validNetworks.includes(network)) {
      return NextResponse.json(
        { error: "Invalid network. Must be TRC20 or ERC20" },
        { status: 400 }
      );
    }

    // Check USDT balance
    const usdtBalance = await prisma.balance.findFirst({
      where: {
        userId: user.id,
        currency: "USDT",
      },
    });

    if (!usdtBalance) {
      return NextResponse.json(
        { error: "USDT balance not found" },
        { status: 400 }
      );
    }

    // Rate limiting: Check if user has made a withdrawal in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentWithdrawal = await prisma.withdrawal.findFirst({
      where: {
        userId: user.id,
        type: "USDT",
        createdAt: {
          gte: twoMinutesAgo,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (recentWithdrawal) {
      const timeSinceLastWithdrawal =
        Date.now() - recentWithdrawal.createdAt.getTime();
      const remainingSeconds = Math.ceil(
        (2 * 60 * 1000 - timeSinceLastWithdrawal) / 1000
      );
      return NextResponse.json(
        {
          error: `Aguarde ${remainingSeconds} segundos antes de fazer outro saque. Limite: 1 saque a cada 2 minutos.`,
        },
        { status: 429 }
      );
    }

    // Check if user has sufficient balance
    if (Number(usdtBalance.amount) < amount) {
      return NextResponse.json(
        {
          error: `Saldo insuficiente. Você precisa de ${amount.toFixed(
            2
          )} USDT, mas seu saldo é ${Number(usdtBalance.amount).toFixed(
            2
          )} USDT.`,
        },
        { status: 400 }
      );
    }

    // Notify admin email on withdrawal attempts over 500 USDT (non-blocking)
    if (amount > 500) {
      getAdminAlertSettings()
        .then((settings) => {
          if (settings.notifyWithdrawOver500 && settings.emails?.length) {
            return sendAdminAlertToAll(
              settings,
              `Withdrawal attempt over 500 USDT: ${amount.toFixed(2)} USDT`,
              `User ${user.email} (${user.name}) requested a withdrawal of ${amount.toFixed(2)} USDT to ${network} ${walletAddress}.`
            );
          }
        })
        .catch((err) => console.error("Admin withdrawal alert:", err));
    }

    // Generate external ID for tracking
    const externalId = `withdrawal_${user.id}_${Date.now()}`;

    // Create withdrawal record first (before API call)
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: user.id,
        type: "USDT",
        amount: amount,
        fee: null,
        netAmount: null,
        status: "PENDING",
        paymentMethod: "USDT",
        walletAddress: walletAddress,
        network: network,
        hash: null,
        externalId: externalId,
        createdAt: new Date(),
      },
    });

    try {
      // Build webhook callback URL
      const callbackUrl =
        process.env.PAYMENT_WEBHOOK_URL ||
        `${
          process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br"
        }/api/webhooks/mercadopago`;

      // Create USDT withdrawal via active payment provider
      const withdrawalResponse = await paymentService.createUSDTWithdrawal({
        amount: amount,
        recipientAddress: walletAddress,
        recipientNetwork: network,
        description: `USDT withdrawal - ${user.email || user.id}`,
        externalId: externalId,
        callbackUrl: callbackUrl,
      });

      // Extract data from response
      const transactionId = withdrawalResponse.transactionId;
      const responseStatus = withdrawalResponse.status;
      const responseFee = (withdrawalResponse.raw.fee as number) || 0;
      const responseAmount = (withdrawalResponse.raw.amount as number) || amount;
      const totalDeducted =
        (withdrawalResponse.raw.total_deducted as number) || responseAmount + responseFee;

      // Update withdrawal with provider response data
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          hash: transactionId || null,
          fee: responseFee,
          netAmount: responseAmount,
          status:
            responseStatus === "completed"
              ? "COMPLETED"
              : responseStatus === "pending"
              ? "PENDING"
              : responseStatus === "failed"
              ? "FAILED"
              : "PENDING",
        },
      });

      // Update user balance (subtract only the amount, not amount + fee)
      await ledgerService.updateBalance(user.id, "USDT", amount, "SUBTRACT");

      // Create transaction record
      const withdrawalTransaction = await ledgerService.recordTransaction({
        userId: user.id,
        type: "WITHDRAWAL",
        amount: -amount,
        currency: "USDT",
        description: `USDT withdrawal to ${walletAddress} (${network}) - Taxa de rede: ${responseFee.toFixed(2)} USDT (informativa)`,
        metadata: { withdrawalId: withdrawal.id, provider: paymentService.name },
        status: responseStatus === "completed" ? "COMPLETED" : "PENDING",
      });

      // Link withdrawal to transaction
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { transactionId: withdrawalTransaction.id },
      });

      // Send withdrawal receipt email (non-blocking)
      if (user.email && user.name) {
        sendWithdrawalReceipt({
          userName: user.name,
          userEmail: user.email,
          amount: Number(amount),
          networkFee: Number(responseFee),
          netAmount: Number(responseAmount),
          network: network,
          walletAddress: walletAddress,
          transactionHash: transactionId || undefined,
          transactionId: externalId,
          date: new Date(),
          status: responseStatus === "completed" ? "COMPLETED" : "PENDING",
        })
          .then(async (result) => {
            const metadata =
              (withdrawalTransaction.metadata as Record<string, unknown>) || {};
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
              where: { id: withdrawalTransaction.id },
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
            console.error("Failed to send withdrawal receipt email:", error);
          });
      }

      return NextResponse.json({
        success: true,
        data: {
          transaction_id: transactionId,
          external_id: (withdrawalResponse.raw.external_id as string) || externalId,
          status: responseStatus,
          amount: responseAmount,
          fee: responseFee,
          total_deducted: totalDeducted,
          recipient_address: (withdrawalResponse.raw.recipient_address as string) || walletAddress,
          recipient_network: (withdrawalResponse.raw.recipient_network as string) || network,
          created_at: (withdrawalResponse.raw.created_at as string) || new Date().toISOString(),
          message:
            (withdrawalResponse.raw.message as string) ||
            "Withdrawal request submitted for processing. You will receive a webhook notification when completed",
          provider: paymentService.name,
        },
      });
    } catch (error: unknown) {
      // If provider API call fails, update withdrawal status to failed
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "FAILED",
        },
      });

      console.error("Payment provider withdrawal error:", error);

      let errorMessage = "Failed to process USDT withdrawal";
      let errorDetails: unknown = undefined;
      let statusCode = 500;

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: unknown; status?: number };
        };
        if (axiosError.response?.data) {
          errorDetails = axiosError.response.data;
          if (
            axiosError.response.data &&
            typeof axiosError.response.data === "object" &&
            "error" in axiosError.response.data &&
            axiosError.response.data.error &&
            typeof axiosError.response.data.error === "object" &&
            "message" in axiosError.response.data.error &&
            typeof axiosError.response.data.error.message === "string"
          ) {
            errorMessage = axiosError.response.data.error.message;
          }
        }
        if (axiosError.response?.status) {
          statusCode = axiosError.response.status;
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          ...(errorDetails ? { details: errorDetails } : {}),
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error("USDT withdrawal error:", error);
    return NextResponse.json(
      { error: "Failed to process USDT withdrawal" },
      { status: 500 }
    );
  }
}
