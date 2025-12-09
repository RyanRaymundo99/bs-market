import axios from "axios";
import crypto from "crypto";

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

    const authMethod = process.env.NUTZPAY_AUTH_METHOD || "headers";

    if (authMethod === "bearer") {
      headers["Authorization"] = `Bearer ${this.secretKey}`;
      headers["X-Public-Key"] = this.publicKey;
    } else if (authMethod === "basic") {
      const credentials = Buffer.from(
        `${this.publicKey}:${this.secretKey}`
      ).toString("base64");
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
      // In development, use localhost or tunnel URL if available
      const isDevelopment = process.env.NODE_ENV === "development";
      const devWebhookUrl = process.env.DEV_WEBHOOK_URL; // e.g., ngrok URL
      
      const defaultCallbackUrl = isDevelopment && devWebhookUrl
        ? `${devWebhookUrl}/api/webhooks/nutzpay`
        : isDevelopment
        ? `http://localhost:3000/api/webhooks/nutzpay` // Won't work unless using tunnel
        : `${process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br"}/api/webhooks/nutzpay`;
      
      const withdrawalPayload = {
        amount: amount,
        recipient_address: data.recipient_address,
        recipient_network: data.recipient_network,
        description: data.description || "USDT withdrawal",
        external_id: data.external_id || `withdrawal_${Date.now()}`,
        callback_url: data.callback_url || defaultCallbackUrl,
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
        if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
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
      if (
        isNaN(amount) ||
        amount <= 0 ||
        isNaN(usdtAmount) ||
        usdtAmount <= 0
      ) {
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
          `${
            process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br"
          }/api/webhooks/nutzpay`,
      };

      const headers = this.getAuthHeaders();

      // Log request details for debugging (without exposing full secrets)
      console.log("NutzPay Purchase Request Details:");
      console.log("- URL:", `${this.baseUrl}/usdt/purchase`);
      console.log(
        "- Auth Method:",
        process.env.NUTZPAY_AUTH_METHOD || "headers (default)"
      );
      console.log("- Headers (keys only):", Object.keys(headers).join(", "));
      console.log(
        "- Public Key (first 10 chars):",
        this.publicKey?.substring(0, 10) + "..."
      );
      console.log("- Secret Key exists:", !!this.secretKey);
      console.log("- Payload:", JSON.stringify(purchasePayload, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/usdt/purchase`,
        purchasePayload,
        { headers }
      );

      return response.data;
    } catch (error) {
      console.error("NutzPay purchase creation error:", error);

      if (axios.isAxiosError(error)) {
        // Handle 401 authentication errors specifically
        if (error.response?.status === 401) {
          const errorData = error.response.data;
          console.error("=== NUTZPAY 401 AUTHENTICATION ERROR ===");
          console.error("Status:", error.response.status);
          console.error("Response Data:", JSON.stringify(errorData, null, 2));
          console.error(
            "Request Headers Sent:",
            JSON.stringify(error.config?.headers, null, 2)
          );
          console.error(
            "Auth Method Used:",
            process.env.NUTZPAY_AUTH_METHOD || "headers (default)"
          );
          console.error("Base URL:", this.baseUrl);
          console.error(
            "Public Key (first 10 chars):",
            this.publicKey?.substring(0, 10) + "..."
          );
          console.error("Secret Key exists:", !!this.secretKey);
          console.error("=========================================");

          const errorMessage =
            errorData?.error?.message ||
            errorData?.message ||
            errorData?.error ||
            "NutzPay API authentication failed. Please check your PUBLIC_KEY and SECRET_KEY environment variables.";

          throw new Error(errorMessage);
        }

        // Handle DNS/network errors
        if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
          const errorMessage = `Cannot connect to NutzPay API at ${this.baseUrl}. Please verify:
1. The NUTZPAY_API_URL environment variable is set correctly
2. The API URL is correct (check NutzPay documentation)
3. Your network connection is active
4. The API domain exists and is accessible`;

          console.error(errorMessage);
          throw new Error(errorMessage);
        }

        // Log other API errors
        if (error.response?.data) {
          console.error(
            "NutzPay API error response:",
            JSON.stringify(error.response.data, null, 2)
          );
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
   * Get transaction status from NutzPay API
   * @param transactionId - The transaction ID from NutzPay
   * @returns Transaction status and details
   */
  async getTransactionStatus(transactionId: string) {
    try {
      const headers = this.getAuthHeaders();

      console.log(
        "🔍 Fetching transaction status from NutzPay:",
        transactionId
      );
      console.log("Base URL:", this.baseUrl);

      // Try multiple possible endpoints
      const endpoints = [
        `${this.baseUrl}/usdt/purchase/${transactionId}`,
        `${this.baseUrl}/usdt/transaction/${transactionId}`,
        `${this.baseUrl}/transaction/${transactionId}`,
        `${this.baseUrl}/purchase/${transactionId}`,
      ];

      let lastError: any = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers,
            validateStatus: (status) => status < 500, // Don't throw on 4xx errors
          });

          console.log("📡 NutzPay API Response Status:", response.status);

          if (response.status === 200 || response.status === 201) {
            const responseData = response.data?.data || response.data;
            console.log(
              "✅ NutzPay transaction status response:",
              JSON.stringify(responseData, null, 2)
            );
            return responseData;
          }

          if (response.status === 404) {
            console.log(
              `❌ Transaction not found at ${endpoint}, trying next...`
            );
            continue; // Try next endpoint
          }

          // If we get here, we got a response but not 200/201/404
          const responseData = response.data?.data || response.data;
          console.log(
            `⚠️ Got status ${response.status} from ${endpoint}, but continuing...`
          );
          return responseData;
        } catch (error) {
          lastError = error;
          if (axios.isAxiosError(error)) {
            if (error.response?.status === 404) {
              console.log(`❌ 404 at ${endpoint}, trying next endpoint...`);
              continue; // Try next endpoint
            }
            if (error.response?.status === 500) {
              console.log(
                `❌ 500 error at ${endpoint}, trying next endpoint...`
              );
              continue; // Try next endpoint
            }
          }
          // For other errors, continue to next endpoint
          console.log(
            `❌ Error at ${endpoint}:`,
            error instanceof Error ? error.message : error
          );
          continue;
        }
      }

      // If all endpoints failed, throw the last error
      if (lastError) {
        throw lastError;
      }

      throw new Error("All endpoints failed");

      console.log("📡 NutzPay API Response Status:", response.status);
      console.log("📡 NutzPay API Response Headers:", response.headers);
      console.log(
        "📡 NutzPay API Full Response:",
        JSON.stringify(response.data, null, 2)
      );

      if (response.status === 404) {
        console.error("❌ Transaction not found in NutzPay:", transactionId);
        // Try alternative endpoint or return null
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      if (response.status === 401) {
        console.error("❌ Authentication failed with NutzPay");
        throw new Error("Authentication failed");
      }

      if (response.status >= 400) {
        console.error("❌ NutzPay API error:", response.status, response.data);
        throw new Error(
          `API error: ${response.status} - ${JSON.stringify(response.data)}`
        );
      }

      const responseData = response.data?.data || response.data;
      console.log(
        "✅ NutzPay transaction status response:",
        JSON.stringify(responseData, null, 2)
      );

      return responseData;
    } catch (error) {
      console.error("❌ NutzPay transaction status fetch error:", error);

      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });

        if (error.response?.status === 404) {
          console.error("Transaction not found in NutzPay:", transactionId);
          throw new Error(`Transaction not found: ${transactionId}`);
        }
        if (error.response?.status === 401) {
          console.error("Authentication failed with NutzPay");
          throw new Error("Authentication failed");
        }
        if (error.response?.data) {
          console.error("NutzPay API error response:", error.response.data);
        }
      }

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
        if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
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
          if (errorData?.code === "INSUFFICIENT_SCOPE") {
            const errorMessage = `Insufficient API key permissions: ${
              errorData.error || "Required scope: usdt:read"
            }. Please check your NutzPay API key permissions.`;
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

  /**
   * Verify webhook signature using HMAC-SHA256
   * Follows NutzPay documentation: https://docs.nutzpay.com/webhooks
   *
   * Always validates the HMAC-SHA256 signature in the X-Webhook-Signature header
   * Uses WEBHOOK_SECRET from environment variables (or SECRET_KEY as fallback)
   */
  async verifyWebhookSignature(
    request: Request,
    body: string
  ): Promise<boolean> {
    try {
      // Get webhook secret - required for signature validation
      // Check NUTZPAY_WEBHOOK_SECRET first, then fall back to SECRET_KEY
      const webhookSecret =
        process.env.NUTZPAY_WEBHOOK_SECRET || this.secretKey;

      if (!webhookSecret) {
        console.error(
          "No webhook secret configured. Set NUTZPAY_WEBHOOK_SECRET or SECRET_KEY."
        );
        return false; // Fail closed - require secret for security
      }

      // Get signature from X-Webhook-Signature header (as per NutzPay docs)
      const signature = request.headers.get("x-webhook-signature");

      if (!signature) {
        console.error(
          "Missing X-Webhook-Signature header. NutzPay requires signature validation."
        );
        return false; // Fail closed - require signature
      }

      // Calculate expected signature using HMAC-SHA256
      // IMPORTANT: Use the raw body string (not parsed JSON) for signature verification
      // The body parameter should be the raw JSON string from request.text()
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body) // This should be the raw JSON string
        .digest("hex");

      // Use constant-time comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.error("Webhook signature verification failed");
        console.error(
          "Expected (first 20 chars):",
          expectedSignature.substring(0, 20) + "..."
        );
        console.error(
          "Received (first 20 chars):",
          signature.substring(0, 20) + "..."
        );
        return false;
      }

      console.log("✅ Webhook signature verified successfully");
      return true;
    } catch (error) {
      console.error("Error verifying webhook signature:", error);
      return false; // Fail closed on errors
    }
  }
}

export const nutzPayService = new NutzPayService();
