import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWithdrawalReceipt } from "@/lib/receipt-email";
import { getMoneyControls } from "@/lib/money-controls";
import {
  isCryptoCurrency,
  isCryptoNetworkForCurrency,
} from "@/lib/crypto-assets";
import {
  computeStablecoinLedgerDebits,
  getUsdtDebitedPerUnitWithdrawnServer,
  usdcWithdrawalCapacityUsdt,
} from "@/lib/stablecoin-withdraw";
import {
  getAdminAlertSettings,
  sendAdminAlertToAll,
} from "@/lib/admin-alert-email";
import { ledgerService } from "@/lib/ledger";

function getNetworkFee(network: string) {
  switch (network) {
    case "ERC20":
      return 5;
    case "TRC20":
    case "POLYGON":
    default:
      return 1;
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
    const { amount, currency = "USDT", walletAddress, network } = await request.json();

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

    // Validate currency/network
    if (
      !isCryptoCurrency(currency) ||
      !isCryptoNetworkForCurrency(currency, network)
    ) {
      return NextResponse.json(
        { error: "Invalid currency/network combination" },
        { status: 400 }
      );
    }

    const rate = getUsdtDebitedPerUnitWithdrawnServer(currency);

    const [usdtBalanceRow, usdcBalanceRow] = await Promise.all([
      prisma.balance.findFirst({
        where: { userId: user.id, currency: "USDT" },
      }),
      prisma.balance.findFirst({
        where: { userId: user.id, currency: "USDC" },
      }),
    ]);

    const usdtBal = usdtBalanceRow ? Number(usdtBalanceRow.amount) : 0;
    const usdcBal = usdcBalanceRow ? Number(usdcBalanceRow.amount) : 0;

    // Rate limiting: Check if user has made a withdrawal in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentWithdrawal = await prisma.withdrawal.findFirst({
      where: {
        userId: user.id,
        type: currency,
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

    const { dUsdt, dUsdc, usdtNeeded } = computeStablecoinLedgerDebits(
      currency,
      amount,
      usdtBal,
      usdcBal,
      rate
    );

    if (currency === "USDT") {
      if (usdtBal + 1e-10 < amount) {
        return NextResponse.json(
          {
            error: `Saldo insuficiente. Você precisa de ${amount.toFixed(
              2
            )} USDT, mas seu saldo é ${usdtBal.toFixed(2)} USDT.`,
          },
          { status: 400 }
        );
      }
    } else {
      const capacity = usdcWithdrawalCapacityUsdt(usdtBal, usdcBal, rate);
      if (capacity + 1e-8 < usdtNeeded) {
        return NextResponse.json(
          {
            error: `Saldo insuficiente para sacar ${amount.toFixed(
              2
            )} USDC. O saldo é contabilizado em USDT (conversão ${rate} USDT por 1 USDC). Equivalente disponível: ${capacity.toFixed(
              2
            )} USDT (USDT: ${usdtBal.toFixed(2)}, USDC: ${usdcBal.toFixed(
              2
            )}).`,
          },
          { status: 400 }
        );
      }
    }

    // Notify admin email on withdrawal attempts over 500 crypto units (non-blocking)
    if (amount > 500) {
      getAdminAlertSettings()
        .then((settings) => {
          if (settings.notifyWithdrawOver500 && settings.emails?.length) {
            return sendAdminAlertToAll(
              settings,
              `Withdrawal attempt over 500 ${currency}: ${amount.toFixed(2)} ${currency}`,
              `User ${user.email} (${user.name}) requested a withdrawal of ${amount.toFixed(2)} ${currency} to ${network} ${walletAddress}.`
            );
          }
        })
        .catch((err) => console.error("Admin withdrawal alert:", err));
    }

    // Generate external ID for tracking
    const externalId = `withdrawal_${user.id}_${Date.now()}`;

    const networkFee = getNetworkFee(network);
    const netAmount = Math.max(0, amount - networkFee);

    if (netAmount <= 0) {
      return NextResponse.json(
        {
          error: `O valor do saque precisa ser maior que a taxa de rede de ${networkFee.toFixed(
            2
          )} ${currency}.`,
        },
        { status: 400 }
      );
    }

    const { withdrawal, withdrawalTransaction } = await prisma.$transaction(
      async (tx) => {
        const withdrawal = await tx.withdrawal.create({
          data: {
            userId: user.id,
            type: currency,
            amount,
            currency,
            fee: networkFee,
            netAmount,
            status: "PENDING",
            paymentMethod: currency,
            walletAddress,
            network,
            hash: null,
            externalId,
            createdAt: new Date(),
          },
        });

        if (dUsdt > 0) {
          await ledgerService.updateBalance(user.id, "USDT", dUsdt, "SUBTRACT", tx);
        }
        if (dUsdc > 0) {
          await ledgerService.updateBalance(user.id, "USDC", dUsdc, "SUBTRACT", tx);
        }

        const withdrawalTransaction = await ledgerService.recordTransaction(
          {
            userId: user.id,
            type: "WITHDRAWAL",
            amount: -amount,
            currency,
            description: `${currency} withdrawal request to ${walletAddress} (${network}) - Taxa de rede: ${networkFee.toFixed(
              2
            )} ${currency}${currency === "USDC" ? ` (ledger: -${dUsdt.toFixed(8)} USDT${dUsdc > 0 ? `, -${dUsdc.toFixed(8)} USDC` : ""})` : ""}`,
            metadata: {
              withdrawalId: withdrawal.id,
              currency,
              provider: "manual_admin_processing",
              withdrawalFlowStatus: "PENDING",
              networkFee,
              netAmount,
              ledgerDebits: { USDT: dUsdt, USDC: dUsdc },
              stablecoinDebitRateUsdtPerUnit: rate,
            },
          },
          tx
        );

        const linkedWithdrawal = await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: { transactionId: withdrawalTransaction.id },
        });

        return { withdrawal: linkedWithdrawal, withdrawalTransaction };
      }
    );

    // Send withdrawal receipt email (non-blocking)
    if (user.email && user.name) {
      sendWithdrawalReceipt({
        userName: user.name,
        userEmail: user.email,
        amount: Number(amount),
        currency,
        networkFee: Number(networkFee),
        netAmount: Number(netAmount),
        network,
        walletAddress,
        transactionId: externalId,
        date: new Date(),
        status: "PENDING",
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
        id: withdrawal.id,
        transaction_id: withdrawalTransaction.id,
        external_id: externalId,
        status: "pending",
        amount,
        currency,
        fee: networkFee,
        net_amount: netAmount,
        total_deducted: amount,
        recipient_address: walletAddress,
        recipient_network: network,
        created_at: withdrawal.createdAt.toISOString(),
        message:
          "Withdrawal request submitted for manual admin processing.",
        provider: "manual_admin_processing",
      },
    });
  } catch (error) {
    console.error("Crypto withdrawal error:", error);
    return NextResponse.json(
      { error: "Failed to process crypto withdrawal" },
      { status: 500 }
    );
  }
}
