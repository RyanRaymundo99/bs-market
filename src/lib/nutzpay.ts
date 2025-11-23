import axios from "axios";

export class NutzPayService {
  private publicKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    this.publicKey = process.env.PUBLIC_KEY!;
    this.secretKey = process.env.SECRET_KEY!;
    this.baseUrl = process.env.NUTZPAY_API_URL || "https://nutzpay.com/api/v1";

    if (!this.publicKey || !this.secretKey) {
      throw new Error(
        "NutzPay credentials not configured. Set PUBLIC_KEY and SECRET_KEY environment variables."
      );
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (process.env.NUTZPAY_AUTH_METHOD === "bearer") {
      headers["Authorization"] = `Bearer ${this.secretKey}`;
      headers["X-Public-Key"] = this.publicKey;
    } else if (process.env.NUTZPAY_AUTH_METHOD === "basic") {
      const credentials = Buffer.from(`${this.publicKey}:${this.secretKey}`).toString("base64");
      headers["Authorization"] = `Basic ${credentials}`;
    } else {
      // Default: use custom headers (most common for payment APIs)
      headers["X-Public-Key"] = this.publicKey;
      headers["X-Secret-Key"] = this.secretKey;
    }
    return headers;
  }

  async createUSDTWithdrawal(data: {
    amount: number;
    recipient_address: string;
    recipient_network: string;
    description?: string;
    external_id?: string;
    callback_url?: string;
  }) {
    try {

      // Validate amount
      const amount = Number(data.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount: must be a positive number");
      }

      // Prepare the withdrawal payload according to NutzPay API
      const withdrawalPayload = {
        amount: amount,
        recipient_address: data.recipient_address,
        recipient_network: data.recipient_network,
        description: data.description || "USDT withdrawal",
        external_id: data.external_id || `withdrawal_${Date.now()}`,
        callback_url:
          data.callback_url ||
          `${process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br"}/api/webhooks/nutzpay`,
      };


      const headers = this.getAuthHeaders();

      const response = await axios.post(
        `${this.baseUrl}/usdt/withdrawal`,
        withdrawalPayload,
        { headers }
      );


      return response.data;
    } catch (error) {
      console.error("NutzPay withdrawal creation error:", error);

      // Provide more helpful error information
      if (axios.isAxiosError(error)) {
        // Handle DNS/network errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          const errorMessage = `Cannot connect to NutzPay API at ${this.baseUrl}. Please verify:
1. The NUTZPAY_API_URL environment variable is set correctly
2. The API URL is correct (check NutzPay documentation)
3. Your network connection is active
4. The API domain exists and is accessible`;
          
          console.error(errorMessage);
          throw new Error(errorMessage);
        }

        if (error.response?.data?.error) {
          console.error("NutzPay API error:", error.response.data.error);
        }
      }

      throw error;
    }
  }

  async createUSDTPurchase(data: {
    amount: number;
    usdt_amount: number;
    customer: {
      name: string;
      document: string;
      email: string;
    };
    external_id?: string;
    callback_url?: string;
  }) {
    try {
      // Validate amounts
      const amount = Number(data.amount);
      const usdtAmount = Number(data.usdt_amount);
      if (isNaN(amount) || amount <= 0 || isNaN(usdtAmount) || usdtAmount <= 0) {
        throw new Error("Invalid amounts: must be positive numbers");
      }

      // Prepare the purchase payload according to NutzPay API
      const purchasePayload = {
        amount: amount,
        usdt_amount: usdtAmount,
        customer: {
          name: data.customer.name,
          document: data.customer.document,
          email: data.customer.email,
        },
        external_id: data.external_id || `purchase_${Date.now()}`,
        callback_url:
          data.callback_url ||
          `${process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br"}/api/webhooks/nutzpay`,
      };


      const headers = this.getAuthHeaders();

      const response = await axios.post(
        `${this.baseUrl}/usdt/purchase`,
        purchasePayload,
        { headers }
      );


      return response.data;
    } catch (error) {
      console.error("NutzPay purchase creation error:", error);

      if (axios.isAxiosError(error)) {
        // Handle DNS/network errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          const errorMessage = `Cannot connect to NutzPay API at ${this.baseUrl}. Please verify:
1. The NUTZPAY_API_URL environment variable is set correctly
2. The API URL is correct (check NutzPay documentation)
3. Your network connection is active
4. The API domain exists and is accessible`;
          
          console.error(errorMessage);
          throw new Error(errorMessage);
        }

        if (error.response?.data?.error) {
          console.error("NutzPay API error:", error.response.data.error);
        }
      }

      throw error;
    }
  }

  async getWithdrawalStatus(externalId: string) {
    try {
      const headers = this.getAuthHeaders();

      const response = await axios.get(
        `${this.baseUrl}/usdt/withdrawal/${externalId}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      console.error("NutzPay withdrawal status fetch error:", error);
      throw error;
    }
  }

  /**
   * Get USDT balance from NutzPay account
   * Returns the available USDT balance
   * 
   * Note: The balance endpoint may need to be verified with NutzPay documentation.
   * If you get a 405 error, the endpoint path or method may be incorrect.
   */
  async getUSDTBalance() {
    try {
      console.log(`Using base URL: ${this.baseUrl}`);

      const headers = this.getAuthHeaders();

      // Balance endpoint requires POST method with empty body
      const response = await axios.post(
        `${this.baseUrl}/usdt/balance`,
        {}, // Empty body as per Postman collection
        { headers }
      );


      // Handle different response formats
      const balanceData = response.data?.data || response.data;
      
      return {
        balance: balanceData?.balance || balanceData?.amount || 0,
        currency: balanceData?.currency || "USDT",
        available: balanceData?.available || balanceData?.balance || 0,
        locked: balanceData?.locked || 0,
        ...balanceData,
      };
    } catch (error) {
      console.error("NutzPay balance fetch error:", error);

      if (axios.isAxiosError(error)) {
        // Handle DNS/network errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          const errorMessage = `Cannot connect to NutzPay API at ${this.baseUrl}. Please verify:
1. The NUTZPAY_API_URL environment variable is set correctly
2. The API URL is correct (check NutzPay documentation)
3. Your network connection is active
4. The API domain exists and is accessible`;
          
          console.error(errorMessage);
          throw new Error(errorMessage);
        }

        // Handle permission errors
        if (error.response?.status === 403) {
          const errorData = error.response.data;
          if (errorData?.code === 'INSUFFICIENT_SCOPE') {
            const errorMessage = `Insufficient API key permissions: ${errorData.error || 'Required scope: usdt:read'}. Please check your NutzPay API key permissions.`;
            console.error(errorMessage);
            throw new Error(errorMessage);
          }
        }

        if (error.response?.data) {
          console.error("NutzPay API error response:", error.response.data);
        }
      }

      throw error;
    }
  }

  verifyWebhookSignature(request: Request): boolean {
    try {
      // Get the signature from headers
      const signature =
        request.headers.get("x-signature") ||
        request.headers.get("x-webhook-signature") ||
        request.headers.get("x-nutzpay-signature");

      if (!signature) {
        console.warn("No webhook signature found in headers");
        return false;
      }

      // For now, return true to allow webhooks through
      // TODO: Implement proper HMAC verification
      console.log("Webhook signature found:", signature);
      return true;
    } catch (error) {
      console.error("Error verifying webhook signature:", error);
      return false;
    }
  }
}

export const nutzPayService = new NutzPayService();

