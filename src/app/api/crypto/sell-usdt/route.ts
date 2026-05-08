import { NextRequest, NextResponse } from "next/server";
import { ledgerService } from "@/lib/ledger";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/session";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json(
        { error: "No session cookie found" },
        { status: 401 }
      );
    }

    const { usdtAmount } = await request.json();

    if (!usdtAmount || usdtAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid USDT amount" },
        { status: 400 }
      );
    }

    // Check user's USDT balance
    const usdtBalance = await ledgerService.getUserBalance(
      authSession.user.id,
      "USDT"
    );
    if (usdtBalance.amount.lessThan(usdtAmount)) {
      return NextResponse.json(
        { error: "Insufficient USDT balance" },
        { status: 400 }
      );
    }

    // Get USDT/BRL price
    let usdtPrice;
    try {
      // In a real implementation, you'd get the current market rate
      // For now, we'll use a reasonable rate
      usdtPrice = 5.0; // Approximate BRL/USD rate
    } catch {
      usdtPrice = 5.0;
    }

    const brlAmount = usdtAmount * usdtPrice;

    // Create order record
    const order = await prisma.order.create({
      data: {
        userId: authSession.user.id,
        type: "SELL",
        baseCurrency: "USDT",
        quoteCurrency: "BRL",
        amount: new Decimal(usdtAmount),
        price: new Decimal(usdtPrice),
        total: new Decimal(brlAmount),
        status: "PENDING",
      },
    });

    try {
      // In a real implementation, you would execute the trade on an exchange
      // For now, we'll simulate a successful trade

      // Update order status to completed
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "COMPLETED",
          externalOrderId: `sim_${Date.now()}`,
          executedAt: new Date(),
        },
      });

      // Update balances
      await ledgerService.updateBalance(
        authSession.user.id,
        "USDT",
        new Decimal(usdtAmount),
        "SUBTRACT"
      );

      await ledgerService.updateBalance(
        authSession.user.id,
        "BRL",
        new Decimal(brlAmount),
        "ADD"
      );

      // Create transaction records
      await ledgerService.createTransaction({
        userId: authSession.user.id,
        type: "SELL_CRYPTO",
        amount: new Decimal(usdtAmount),
        currency: "USDT",
        description: `Sold ${usdtAmount.toFixed(2)} USDT`,
        metadata: {
          orderId: order.id,
          brlAmount,
          usdtPrice,
        },
      });

      await ledgerService.createTransaction({
        userId: authSession.user.id,
        type: "SELL_CRYPTO",
        amount: new Decimal(brlAmount),
        currency: "BRL",
        description: `Received ${brlAmount.toFixed(2)} BRL`,
        metadata: {
          orderId: order.id,
          usdtAmount,
          usdtPrice,
        },
      });

      return NextResponse.json({
        success: true,
        orderId: order.id,
        usdtAmount,
        brlAmount: parseFloat(brlAmount.toFixed(2)),
        usdtPrice,
        message: "USDT sale executed successfully",
      });
    } catch (error) {
      // Update order status to failed
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "FAILED" },
      });

      throw error;
    }
  } catch (error) {
    console.error("USDT sell error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute USDT sale",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
