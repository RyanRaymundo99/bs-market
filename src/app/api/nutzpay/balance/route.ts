import { NextRequest, NextResponse } from "next/server";
import { nutzPayService } from "@/lib/nutzpay";

export async function GET(request: NextRequest) {
  try {
    // Get USDT balance from NutzPay
    const balance = await nutzPayService.getUSDTBalance();

    return NextResponse.json({
      success: true,
      balance: balance.balance,
      currency: balance.currency || "USDT",
      available: balance.available,
      locked: balance.locked || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching NutzPay balance:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch balance";
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

