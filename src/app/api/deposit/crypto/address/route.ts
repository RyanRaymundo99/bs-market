import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nutzPayService } from "@/lib/nutzpay";
import { Decimal } from "@prisma/client/runtime/library";

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

    // Parse request body
    const { network } = await request.json();

    if (!network || !["TRC20", "ERC20", "BSC"].includes(network)) {
      return NextResponse.json(
        { error: "Invalid network. Must be TRC20, ERC20, or BSC" },
        { status: 400 }
      );
    }

    // Generate a unique external ID for tracking this deposit
    const externalId = `deposit_${user.id}_${network}_${Date.now()}`;
    
    // For crypto deposits, we need a wallet address for users to send to
    // Since NutzPay API docs don't show a deposit address endpoint, we have two options:
    // 1. Use a configured static address (set in environment variables)
    // 2. Use NutzPay's main wallet address (if they provide one)
    // 3. Track deposits via webhooks when crypto is received
    
    // Try to get address from environment variable first
    let depositAddress = process.env[`DEPOSIT_ADDRESS_${network}`];
    
    // If no address configured, try to get from NutzPay balance endpoint
    // (some APIs return the deposit address with balance info)
    if (!depositAddress) {
      try {
        const balanceInfo = await nutzPayService.getUSDTBalance();
        // Some APIs include deposit address in balance response
        if (balanceInfo.depositAddress || balanceInfo.address) {
          depositAddress = balanceInfo.depositAddress || balanceInfo.address;
        }
      } catch (error) {
        console.log("Could not get address from balance endpoint, using fallback");
      }
    }
    
    // Fallback: Use a configured main address
    if (!depositAddress) {
      depositAddress = process.env.DEPOSIT_ADDRESS_MAIN || 
        process.env.NUTZPAY_DEPOSIT_ADDRESS ||
        `TMainDepositAddress_${network}`;
      
      console.warn(`Using fallback deposit address for network ${network}. Configure DEPOSIT_ADDRESS_${network} or NUTZPAY_DEPOSIT_ADDRESS in environment variables.`);
    }

    // Create a pending deposit record to track this deposit request
    // When crypto is received via webhook, we'll match it and update this record
    const deposit = await prisma.deposit.create({
      data: {
        userId: user.id,
        amount: new Decimal(0), // Will be updated when deposit is received
        currency: "USDT",
        status: "PENDING",
        paymentMethod: "USDT",
        externalId: externalId,
        paymentId: depositAddress, // Store address in paymentId for webhook matching
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
