import axios from "axios";

export class BancoCentralService {
  private baseUrl = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata";

  /**
   * Get USD/BRL exchange rate from Banco Central
   * Returns the current USD to BRL rate
   */
  async getUSDRate(): Promise<number> {
    try {
      // Get today's date in format MM-DD-YYYY
      const today = new Date();
      const dateStr = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}-${today.getFullYear()}`;

      // Try to get today's rate first
      let response = await axios.get(
        `${this.baseUrl}/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dateStr}'&$top=1&$format=json`,
        {
          timeout: 5000,
        }
      );

      if (response.data?.value && Array.isArray(response.data.value) && response.data.value.length > 0) {
        const cotacao = response.data.value[0];
        const rate = parseFloat(cotacao.cotacaoCompra) || parseFloat(cotacao.cotacaoVenda);
        if (rate && rate > 0 && !isNaN(rate)) {
          return rate;
        }
      }

      // If today's rate is not available, try yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}-${yesterday.getFullYear()}`;

      response = await axios.get(
        `${this.baseUrl}/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${yesterdayStr}'&$top=1&$format=json`,
        {
          timeout: 5000,
        }
      );

      if (response.data?.value && Array.isArray(response.data.value) && response.data.value.length > 0) {
        const cotacao = response.data.value[0];
        const rate = parseFloat(cotacao.cotacaoCompra) || parseFloat(cotacao.cotacaoVenda);
        if (rate && rate > 0 && !isNaN(rate)) {
          return rate;
        }
      }

      // Fallback to a reasonable default if API fails
      console.warn("Failed to fetch USD rate from Banco Central, using fallback");
      return 5.0;
    } catch (error) {
      console.error("Error fetching USD rate from Banco Central:", error);
      // Fallback to a reasonable default
      return 5.0;
    }
  }

  /**
   * Get USDT/BRL rate (USDT is pegged 1:1 with USD)
   */
  async getUSDTRate(): Promise<number> {
    return await this.getUSDRate();
  }
}

export const bancoCentralService = new BancoCentralService();

