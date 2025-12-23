import axios from "axios";

export class CryptoRatesService {
  /**
   * Get real-time USDT/BRL rate from Binance
   * Binance has a USDT/BRL trading pair, so we can get real-time rates
   * No API key required for public endpoints
   */
  async getUSDTBRLFromBinance(): Promise<number> {
    try {
      // Binance USDT/BRL ticker endpoint
      const response = await axios.get(
        "https://api.binance.com/api/v3/ticker/price?symbol=USDTBRL",
        {
          timeout: 5000,
        }
      );

      if (response.data?.price) {
        const rate = parseFloat(response.data.price);
        if (rate && rate > 0 && !isNaN(rate)) {
          return rate;
        }
      }

      throw new Error("Invalid response from Binance");
    } catch (error) {
      console.error("Error fetching USDT/BRL from Binance:", error);
      throw error;
    }
  }

  /**
   * Get real-time USDT/BRL rate from CoinGecko
   * Free tier: 10-50 calls/minute
   * No API key required for basic usage
   */
  async getUSDTBRLFromCoinGecko(): Promise<number> {
    try {
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=brl",
        {
          timeout: 5000,
        }
      );

      if (response.data?.tether?.brl) {
        const rate = parseFloat(response.data.tether.brl);
        if (rate && rate > 0 && !isNaN(rate)) {
          return rate;
        }
      }

      throw new Error("Invalid response from CoinGecko");
    } catch (error) {
      console.error("Error fetching USDT/BRL from CoinGecko:", error);
      throw error;
    }
  }

  /**
   * Get real-time USDT/BRL rate with fallback strategy
   * Tries multiple sources in order of preference
   */
  async getUSDTRate(): Promise<number> {
    // Try Binance first (most reliable for USDT/BRL)
    try {
      return await this.getUSDTBRLFromBinance();
    } catch (binanceError) {
      console.warn("Binance API failed, trying CoinGecko...", binanceError);
    }

    // Fallback to CoinGecko
    try {
      return await this.getUSDTBRLFromCoinGecko();
    } catch (coingeckoError) {
      console.warn(
        "CoinGecko API failed, using fallback rate...",
        coingeckoError
      );
    }

    // Final fallback
    console.warn("All real-time APIs failed, using fallback rate");
    return 5.0;
  }
}

export const cryptoRatesService = new CryptoRatesService();
