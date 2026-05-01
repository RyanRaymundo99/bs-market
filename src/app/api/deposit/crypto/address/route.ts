import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { paymentService } from "@/lib/payment";
import { Decimal } from "@prisma/client/runtime/library";
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

    if (user.approvalStatus === "PENDING") {
      return NextResponse.json(
        {
          error:
            "Sua conta está pendente de aprovação. Complete seu cadastro e aguarde a aprovação.",
        },
        { status: 403 }
      );
    }

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
    const { network, amount } = await request.json();

    if (!network || !["TRC20", "ERC20", "POLYGON"].includes(network)) {
      return NextResponse.json(
        { error: "Invalid network. Must be TRC20, ERC20, or POLYGON" },
        { status: 400 }
      );
    }

    const requestedAmount = new Decimal(amount || 0);

    // Generate a unique external ID for tracking this deposit
    const externalId = `deposit_${user.id}_${network}_${Date.now()}`;
    
    // For crypto deposits, we need a wallet address for users to send to
    // Try to get address from environment variable first
    let depositAddress = process.env[`DEPOSIT_ADDRESS_${network.toUpperCase()}`];
    
    // If no address configured, try to get from payment provider balance endpoint
    if (!depositAddress) {
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
    
    // Fallback: Use user-provided addresses as main defaults
    const USER_CONFIGURED_ADDRESSES: Record<string, string> = {
      TRC20: "THzBRcQGz2fY9Xcu2ZZtVhKsDDeE98iW2N",
      POLYGON: "0x55853FfD5D8772306640B806F445Fc31C33e2FcF",
      ERC20: "0x55853FfD5D8772306640B806F445Fc31C33e2FcF",
    };

    if (!depositAddress) {
      depositAddress = USER_CONFIGURED_ADDRESSES[network] || 
        process.env.DEPOSIT_ADDRESS_MAIN || 
        process.env.PAYMENT_DEPOSIT_ADDRESS ||
        `TMainDepositAddress_${network}`;
      
      console.warn(`Using fallback deposit address for network ${network}. Configure DEPOSIT_ADDRESS_${network} or PAYMENT_DEPOSIT_ADDRESS in environment variables.`);
    }

    // Use a transaction to ensure both deposit and transaction records are created
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the deposit record
      const deposit = await tx.deposit.create({
        data: {
          userId: user.id,
          amount: requestedAmount,
          currency: "USDT",
          status: "PENDING",
          paymentMethod: "USDT",
          externalId: externalId,
          paymentId: depositAddress,
          createdAt: new Date(),
        },
      });

      // 2. Get current user balance for USDT
      const balance = await tx.balance.findUnique({
        where: { userId_currency: { userId: user.id, currency: "USDT" } },
      });
      const currentBalance = balance?.amount || new Decimal(0);

      // 3. Create a transaction record so it shows up in history immediately
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEPOSIT",
          amount: requestedAmount,
          currency: "USDT",
          balance: currentBalance, // Current balance, will be updated upon confirmation
          description: `Depósito USDT via ${network}`,
          metadata: {
            depositId: deposit.id,
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
            "Novo depósito USDT (cripto) iniciado",
            [
              `Usuário: ${user.name} (${user.email})`,
              `Valor: ${requestedAmount.toNumber()} USDT`,
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
      network: network,
      depositId: result.deposit.id,
      transactionId: result.transaction.id,
      externalId: externalId,
      amount: requestedAmount.toNumber(),
      message: "Deposit address generated. Send USDT to this address.",
    });
  } catch (error) {
    console.error("Error generating deposit address:", error);
    return NextResponse.json(
      { error: "Failed to generate deposit address" },
      { status: 500 }
    );
  }
}
