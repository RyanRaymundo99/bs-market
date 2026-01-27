import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nutzPayService } from "@/lib/nutzpay";
import { sendWithdrawalReceipt } from "@/lib/receipt-email";
import { getMoneyControls } from "@/lib/money-controls";

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

    // Admin-controlled global switch to disable money functions (deposits/withdrawals)
    const moneyControls = await getMoneyControls();
    if (moneyControls.moneyDisabled) {
      return NextResponse.json(
        {
          error: moneyControls.moneyDisabledMessage,
          code: "MONEY_DISABLED",
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
    const validNetworks = ["TRC20", "ERC20"];
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
    // The amount is what the user wants to withdraw. The network fee is handled by NutzPay
    // and deducted from the amount (not added on top). So if user has 10 USDT and wants
    // to withdraw 10 USDT, they'll receive (10 - fee) USDT, which is acceptable.
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

    // Generate external ID for NutzPay
    const externalId = `withdrawal_${user.id}_${Date.now()}`;

    // Create withdrawal record first (before API call)
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: user.id,
        type: "USDT",
        amount: amount, // Store the amount the user requested
        fee: null, // Will be updated from API response (informative only - network fee)
        netAmount: null, // Will be updated from API response
        status: "PENDING",
        paymentMethod: "USDT",
        walletAddress: walletAddress,
        network: network,
        hash: null,
        externalId: externalId, // Store externalId for webhook matching
        createdAt: new Date(),
      },
    });

    try {
      // Call NutzPay API to create withdrawal
      // Use NUTZPAY_WEBHOOK_URL if set (for testing with webhook.site), otherwise use default
      const callbackUrl =
        process.env.NUTZPAY_WEBHOOK_URL ||
        `${
          process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br"
        }/api/webhooks/nutzpay`;

      // Send the full amount to NutzPay - the fee is handled by NutzPay/network
      // We only deduct the amount from user's balance, not amount + fee
      const nutzPayResponse = await nutzPayService.createUSDTWithdrawal({
        amount: amount, // Send the full amount the user requested
        recipient_address: walletAddress,
        recipient_network: network,
        description: `USDT withdrawal - ${user.email || user.id}`,
        external_id: externalId,
        callback_url: callbackUrl,
      });

      // Extract data from response (response structure: { success: true, data: {...} })
      const responseData = nutzPayResponse.data || nutzPayResponse;
      const transactionId = responseData.transaction_id;
      const responseFee = responseData.fee || 0;
      const responseAmount = responseData.amount || amount;
      const totalDeducted =
        responseData.total_deducted || responseAmount + responseFee;
      const responseStatus = responseData.status || "pending";

      // IMPORTANT: The network fee (1 USDT for TRC20, 5 USDT for ERC20) is ONLY informative
      // We deduct ONLY the amount from user's balance, not amount + fee
      // Example: User has 10 USDT, withdraws 10 USDT -> balance becomes 0 USDT (not -1 or -5)
      // The fee is handled by NutzPay/network and is not our responsibility

      // Update withdrawal with NutzPay response data
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
      // The fee is handled by NutzPay/network and is not our responsibility
      // If user has 10 USDT and withdraws 10 USDT, balance becomes 0 USDT
      await prisma.balance.update({
        where: {
          id: usdtBalance.id,
        },
        data: {
          amount: Number(usdtBalance.amount) - amount, // Deduct only the amount, not totalDeducted
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      // Record only the amount withdrawn, not amount + fee
      const withdrawalTransaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "WITHDRAWAL",
          amount: amount, // Record only the amount, not totalDeducted
          currency: "USDT",
          balance: Number(usdtBalance.amount) - amount, // Balance after deducting only the amount
          description: `USDT withdrawal to ${walletAddress} (${network}) - Taxa de rede: ${responseFee.toFixed(
            2
          )} USDT (informativa)`,
          metadata: { withdrawalId: withdrawal.id },
          createdAt: new Date(),
        },
      });

      // Link withdrawal to transaction
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { transactionId: withdrawalTransaction.id },
      });

      // Send withdrawal receipt email (don't await to avoid blocking response)
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
            // Track receipt in transaction metadata
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
            // Don't fail the request if email fails
          });
      }

      return NextResponse.json({
        success: true,
        data: {
          transaction_id: transactionId,
          external_id: responseData.external_id || externalId,
          status: responseStatus,
          amount: responseAmount,
          fee: responseFee,
          total_deducted: totalDeducted,
          recipient_address: responseData.recipient_address || walletAddress,
          recipient_network: responseData.recipient_network || network,
          created_at: responseData.created_at || new Date().toISOString(),
          message:
            responseData.message ||
            "Withdrawal request submitted for processing. You will receive a webhook notification when completed",
        },
      });
    } catch (error: unknown) {
      // If NutzPay API call fails, update withdrawal status to failed
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "FAILED",
        },
      });

      console.error("NutzPay withdrawal error:", error);

      // Return user-friendly error message
      let errorMessage = "Failed to process USDT withdrawal with NutzPay";
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
