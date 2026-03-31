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
    const { network } = await request.json();

    if (!network || !["TRC20", "ERC20", "BSC", "POLYGON"].includes(network)) {
      return NextResponse.json(
        { error: "Invalid network. Must be TRC20, ERC20, BSC or POLYGON" },
        { status: 400 }
      );
    }

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
      BSC: "0x55853FfD5D8772306640B806F445Fc31C33e2FcF", // Usually BSC is also EVM-compatible
    };

    if (!depositAddress) {
      depositAddress = USER_CONFIGURED_ADDRESSES[network] || 
        process.env.DEPOSIT_ADDRESS_MAIN || 
        process.env.PAYMENT_DEPOSIT_ADDRESS ||
        `TMainDepositAddress_${network}`;
      
      console.warn(`Using fallback deposit address for network ${network}. Configure DEPOSIT_ADDRESS_${network} or PAYMENT_DEPOSIT_ADDRESS in environment variables.`);
    }

    // Create a pending deposit record to track this deposit request
    const deposit = await prisma.deposit.create({
      data: {
        userId: user.id,
        amount: new Decimal(0),
        currency: "USDT",
        status: "PENDING",
        paymentMethod: "USDT",
        externalId: externalId,
        paymentId: depositAddress,
        createdAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      address: depositAddress,
      network: network,
      depositId: deposit.id,
      externalId: externalId,
      message: "Deposit address generated. Send USDT to this address. Include the memo/reference if required.",
    });
  } catch (error) {
    console.error("Error generating deposit address:", error);
    return NextResponse.json(
      { error: "Failed to generate deposit address" },
      { status: 500 }
    );
  }
}
