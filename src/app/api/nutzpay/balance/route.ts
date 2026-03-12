import { NextResponse } from "next/server";
import { paymentService } from "@/lib/payment";

export async function GET() {
  try {
    // Get USDT balance from payment provider
    const balance = await paymentService.getUSDTBalance();

    return NextResponse.json({
      success: true,
      balance: balance.balance,
      currency: balance.currency || "USDT",
      available: balance.available,
      locked: balance.locked || 0,
      provider: paymentService.name,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching provider balance:", error);
    
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
