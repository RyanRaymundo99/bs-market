import { NextResponse } from "next/server";
import { bancoCentralService } from "@/lib/banco-central";
import { cryptoRatesService } from "@/lib/crypto-rates";

export async function GET() {
  try {
    // Check if real-time mode is enabled (default: true)
    // Set USE_REALTIME_RATES=false in .env to use Banco Central (daily rates)
    const useRealtime = process.env.USE_REALTIME_RATES !== "false";

    let rate: number;
    let source: string;

    if (useRealtime) {
      // Get real-time USDT/BRL rate from Binance/CoinGecko
      rate = await cryptoRatesService.getUSDTRate();
      source = "realtime";
    } else {
      // Get USD/BRL rate from Banco Central (daily rate, USDT is pegged 1:1 with USD)
      rate = await bancoCentralService.getUSDTRate();
      source = "banco-central";
    }

    return NextResponse.json({
      success: true,
      rate: rate,
      currency: "BRL",
      source: source,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching USDT rate:", error);

    // Try fallback to Banco Central if real-time fails
    try {
      const fallbackRate = await bancoCentralService.getUSDTRate();
      return NextResponse.json({
        success: true,
        rate: fallbackRate,
        currency: "BRL",
        source: "banco-central-fallback",
        timestamp: new Date().toISOString(),
        warning: "Using Banco Central as fallback due to real-time API error",
      });
    } catch (fallbackError) {
      // Final fallback
      return NextResponse.json({
        success: true,
        rate: 5.0, // Fallback rate
        currency: "BRL",
        source: "fallback",
        timestamp: new Date().toISOString(),
        warning: "Using fallback rate due to API error",
      });
    }
  }
}
