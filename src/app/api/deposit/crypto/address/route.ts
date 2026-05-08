import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { paymentService } from "@/lib/payment";
import { Decimal } from "@prisma/client/runtime/library";
import { getMoneyControls } from "@/lib/money-controls";
import {
  getCryptoDepositAddress,
  isCryptoCurrency,
  isCryptoNetworkForCurrency,
} from "@/lib/crypto-assets";
import { validateSession } from "@/lib/session";
import { depositApprovalResponse } from "@/lib/deposit-gates";

export async function POST(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = authSession.user;

    const approvalGate = depositApprovalResponse(user);
    if (approvalGate) return approvalGate;

    // Admin-controlled switch to disable deposits
    const moneyControls = await getMoneyControls();
    if (moneyControls.depositsDisabled) {
      return NextResponse.json(
        {
          error: moneyControls.depositsDisabledMessage,
          code: "DEPOSITS_DISABLED",
        },
        { status: 503 }
      );
    }

    // Parse request body
    const { currency = "USDT", network, amount, addressOnly } = await request.json();

    if (
      !isCryptoCurrency(currency) ||
      !isCryptoNetworkForCurrency(currency, network)
    ) {
      return NextResponse.json(
        { error: "Invalid currency/network combination" },
        { status: 400 }
      );
    }

    // Generate a unique external ID for tracking this deposit
    const externalId = `deposit_${user.id}_${currency}_${network}_${Date.now()}`;
    
    // For crypto deposits, we need a wallet address for users to send to
    // Try configured env vars and known fallbacks first.
    let depositAddress = getCryptoDepositAddress(currency, network);
    
    // If no USDT address is configured, try to get it from the payment provider.
    if (!depositAddress && currency === "USDT") {
      try {
        const balanceInfo = await paymentService.getUSDTBalance();
        // Some providers return deposit address with balance info
        if (balanceInfo.raw?.depositAddress || balanceInfo.raw?.address) {
          depositAddress = (balanceInfo.raw.depositAddress || balanceInfo.raw.address) as string;
        }
      } catch {
        console.log("Could not get address from balance endpoint, using fallback");
      }
    }

    if (!depositAddress) {
      return NextResponse.json(
        {
          error: `Deposit address is not configured for ${currency} on ${network}`,
        },
        { status: 500 }
      );
    }

    if (addressOnly) {
      return NextResponse.json({
        success: true,
        address: depositAddress,
        currency,
        network: network,
        message: `Deposit address generated. Enter the amount and transaction hash after sending ${currency}.`,
      });
    }

    let requestedAmount: Decimal;
    try {
      requestedAmount = new Decimal(amount ?? 0);
    } catch {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!Number.isFinite(requestedAmount.toNumber()) || requestedAmount.lte(0)) {
      return NextResponse.json(
        { error: "A valid amount greater than zero is required" },
        { status: 400 }
      );
    }

    // Use a transaction to ensure both deposit and transaction records are created
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the deposit record
      const deposit = await tx.deposit.create({
        data: {
          userId: user.id,
          amount: requestedAmount,
          currency,
          status: "PENDING",
          paymentMethod: currency,
          externalId: externalId,
          paymentId: depositAddress,
          createdAt: new Date(),
        },
      });

      // 2. Get current user balance for USDT
      const balance = await tx.balance.findUnique({
        where: { userId_currency: { userId: user.id, currency } },
      });
      const currentBalance = balance?.amount || new Decimal(0);

      // 3. Create a transaction record so it shows up in history immediately
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEPOSIT",
          amount: requestedAmount,
          currency,
          balance: currentBalance, // Current balance, will be updated upon confirmation
          description: `Depósito ${currency} via ${network}`,
          metadata: {
            depositId: deposit.id,
            currency,
            network: network,
            address: depositAddress,
            requestedAmount: requestedAmount.toNumber(),
          },
        },
      });

      // 4. Link transaction to deposit
      await tx.deposit.update({
        where: { id: deposit.id },
        data: { transactionId: transaction.id },
      });

      return { deposit, transaction };
    });

    // Notify admin (non-blocking; failures only log)
    import("@/lib/admin-alert-email")
      .then(({ getAdminAlertSettings, sendAdminAlertToAll }) =>
        getAdminAlertSettings().then((settings) =>
          sendAdminAlertToAll(
            settings,
            `Novo depósito ${currency} (cripto) iniciado`,
            [
              `Usuário: ${user.name} (${user.email})`,
              `Valor: ${requestedAmount.toNumber()} ${currency}`,
              `Rede: ${network}`,
              `ID depósito: ${result.deposit.id}`,
              `Endereço: ${depositAddress}`,
            ].join("\n")
          )
        )
      )
      .catch((err) => console.error("Admin alert (crypto deposit):", err));

    return NextResponse.json({
      success: true,
      address: depositAddress,
      currency,
      network: network,
      depositId: result.deposit.id,
      transactionId: result.transaction.id,
      externalId: externalId,
      amount: requestedAmount.toNumber(),
      message: `Deposit address generated. Send ${currency} to this address.`,
    });
  } catch (error) {
    console.error("Error generating deposit address:", error);
    return NextResponse.json(
      { error: "Failed to generate deposit address" },
      { status: 500 }
    );
  }
}
