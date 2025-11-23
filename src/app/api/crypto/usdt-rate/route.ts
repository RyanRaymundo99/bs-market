import { NextResponse } from "next/server";
import { bancoCentralService } from "@/lib/banco-central";

export async function GET() {
  try {
    // Get USD/BRL rate from Banco Central (USDT is pegged 1:1 with USD)
    const rate = await bancoCentralService.getUSDTRate();

    return NextResponse.json({
      success: true,
      rate: rate,
      currency: "BRL",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching USDT rate:", error);
    // Return fallback rate if API fails
    return NextResponse.json({
      success: true,
      rate: 5.0, // Fallback rate
      currency: "BRL",
      timestamp: new Date().toISOString(),
      warning: "Using fallback rate due to API error",
    });
  }
}

