import axios from "axios";
import crypto from "crypto";

/**
 * NutzPay API v1 client (Nova API – API Keys)
 *
 * - Authentication: X-Public-Key and X-Secret-Key on every request (no session/cookies)
 * - Base URL: https://nutzpay.com/api/v1 (NUTZPAY_API_URL)
 * - Rate limits: 25,000 req/hour; 429 → X-RateLimit-Remaining, X-RateLimit-Reset
 * - Webhooks: validate X-Signature with HMAC-SHA256 (NUTZPAY_WEBHOOK_SECRET or secret key)
 *
 * Endpoints: /usdt/purchase, /usdt/withdrawal, /usdt/balance, /pix/payout, /pix/balance (POST).
 * @see Guia de Migração API NutzPay (PROMPT_MIGRACAO_API_NUTZPAY.md)
 */
export class NutzPayService {
  private publicKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    // Support both old and new variable names for backward compatibility
    this.publicKey = process.env.NUTZPAY_PUBLIC_KEY || process.env.PUBLIC_KEY!;
    this.secretKey = process.env.NUTZPAY_SECRET_KEY || process.env.SECRET_KEY!;
    this.baseUrl = process.env.NUTZPAY_API_URL || "https://nutzpay.com/api/v1";

    if (!this.publicKey || !this.secretKey) {
      throw new Error(
        "NutzPay credentials not configured. Set NUTZPAY_PUBLIC_KEY and NUTZPAY_SECRET_KEY environment variables."
      );
    }
  }

  /** v2.0: Headers for API requests (X-Public-Key, X-Secret-Key, Content-Type). */
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
      // v2.0 default: X-Public-Key and X-Secret-Key
      headers["X-Public-Key"] = this.publicKey;
      headers["X-Secret-Key"] = this.secretKey;
    }

    return headers;
  }

  /**
   * v2.0: Build error message for 429 Rate Limit responses using X-RateLimit-* headers.
   */
  private getRateLimitMessage(error: unknown): string | null {
    if (!axios.isAxiosError(error) || error.response?.status !== 429)
      return null;
    const res = error.response;
    const remaining = res?.headers?.["x-ratelimit-remaining"];
    const reset = res?.headers?.["x-ratelimit-reset"];
    const retryAfter = res?.headers?.["retry-after"];
    const parts = ["NutzPay API rate limit exceeded (429)."];
    if (remaining != null) parts.push(`Remaining: ${remaining}.`);
    if (reset != null) parts.push(`Reset at: ${reset}.`);
    if (retryAfter != null) parts.push(`Retry after: ${retryAfter}s.`);
    return parts.join(" ");
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
          `${
            process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br"
          }/api/webhooks/nutzpay`,
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

      const rateLimitMsg = this.getRateLimitMessage(error);
      if (rateLimitMsg) throw new Error(rateLimitMsg);

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
    // Store formatted amounts outside try block for error logging
    let formattedAmount: number | undefined;
    let formattedUsdtAmount: number | undefined;

    try {
      // Validate amounts
      let amount = Number(data.amount);
      let usdtAmount = Number(data.usdt_amount);
      if (
        isNaN(amount) ||
        amount <= 0 ||
        isNaN(usdtAmount) ||
        usdtAmount <= 0
      ) {
        throw new Error("Invalid amounts: must be positive numbers");
      }

      // Round amounts to appropriate decimal places
      // BRL amount must have exactly 2 decimal places for Mercado Pago
      amount = Math.round(amount * 100) / 100;
      // USDT amount can have up to 8 decimal places, but we'll round to 4 for API compatibility
      usdtAmount = Math.round(usdtAmount * 10000) / 10000;

      // Validate minimum amounts (Mercado Pago typically requires minimum 0.01 BRL)
      if (amount < 0.01) {
        throw new Error("Amount must be at least 0.01 BRL");
      }

      if (usdtAmount < 0.0001) {
        throw new Error("USDT amount must be at least 0.0001 USDT");
      }

      // Store formatted amounts for error logging
      formattedAmount = parseFloat(amount.toFixed(2));
      formattedUsdtAmount = parseFloat(usdtAmount.toFixed(4));

      // Log the amounts being sent for debugging
      console.log("NutzPay purchase request amounts:", {
        originalAmount: data.amount,
        roundedAmount: amount,
        originalUsdtAmount: data.usdt_amount,
        roundedUsdtAmount: usdtAmount,
        amountString: amount.toFixed(2),
        usdtAmountString: usdtAmount.toFixed(4),
      });

      // Prepare the purchase payload per NutzPay migration guide (no "acquirer" field)
      // Guide: amount, usdt_amount, customer, external_id, callback_url only – API uses account default provider
      const purchasePayload = {
        amount: formattedAmount,
        usdt_amount: formattedUsdtAmount,
        customer: {
          name: data.customer.name,
          document: data.customer.document,
          email: data.customer.email,
        },
        external_id: data.external_id || `purchase_${Date.now()}`,
        callback_url:
          data.callback_url ||
          process.env.NUTZPAY_WEBHOOK_URL ||
          `${
            process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br"
          }/api/webhooks/nutzpay`,
      };

      const headers = this.getAuthHeaders();

      const response = await axios.post(
        `${this.baseUrl}/usdt/purchase`,
        purchasePayload,
        { headers }
      );

      // Log full response for debugging
      // Debug logging removed for production

      return response.data;
    } catch (error) {
      console.error("NutzPay purchase creation error:", error);

      const rateLimitMsg = this.getRateLimitMessage(error);
      if (rateLimitMsg) throw new Error(rateLimitMsg);

      if (axios.isAxiosError(error)) {
        // Handle acquirer-related errors (500 with "Unsupported acquirer" message)
        const errorMessage =
          error.response?.data?.message || error.response?.data?.error || "";
        if (
          error.response?.status === 500 &&
          (errorMessage.includes("Unsupported acquirer") ||
            errorMessage.includes("acquirer"))
        ) {
          console.error("=== NUTZPAY ACQUIRER ERROR ===");
          console.error("Status:", error.response.status);
          console.error("Error:", errorMessage);
          console.error(
            "Solution: Set the default provider/acquirer in the NutzPay dashboard (Configurações / Chaves API or account settings), e.g. Mercado Pago. IP whitelist is also configured there when creating API keys."
          );
          throw new Error(
            `NutzPay acquirer error: ${errorMessage}. The provider is configured in your NutzPay dashboard, not in this app. Change the default provider (e.g. to Mercado Pago) and ensure your server IP is whitelisted when creating API keys.`
          );
        }

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
            "NutzPay API authentication failed. Please check your NUTZPAY_PUBLIC_KEY and NUTZPAY_SECRET_KEY environment variables.";

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

        // Log other API errors with request details
        if (error.response?.data) {
          console.error("=== NUTZPAY API ERROR ===");
          console.error("Status:", error.response.status);
          console.error(
            "Response Data:",
            JSON.stringify(error.response.data, null, 2)
          );
          console.error("Request URL:", error.config?.url);
          console.error("Request Method:", error.config?.method);
          console.error(
            "Request Headers:",
            JSON.stringify(error.config?.headers, null, 2)
          );
          console.error("Request payload that caused error:", {
            amount: formattedAmount ?? data.amount,
            usdt_amount: formattedUsdtAmount ?? data.usdt_amount,
            amountType: typeof (formattedAmount ?? data.amount),
            usdtAmountType: typeof (formattedUsdtAmount ?? data.usdt_amount),
            customer: data.customer,
          });
          console.error("=========================================");
        }

        // If it's a 500 error with "Invalid transaction_amount", provide helpful error
        if (
          error.response?.status === 500 &&
          error.response?.data?.message?.includes("Invalid transaction_amount")
        ) {
          const helpfulError = new Error(
            `Invalid transaction amount format. Amount: ${
              formattedAmount ?? data.amount
            }, USDT: ${
              formattedUsdtAmount ?? data.usdt_amount
            }. Mercado Pago requires BRL amounts with exactly 2 decimal places.`
          );
          helpfulError.name = "InvalidTransactionAmountFormat";
          throw helpfulError;
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
      const rateLimitMsg = this.getRateLimitMessage(error);
      if (rateLimitMsg) throw new Error(rateLimitMsg);
      throw error;
    }
  }

  /**
   * Get withdrawal status by transaction_id (from API response)
   * Based on API docs: POST /api/v1/usdt/withdrawal returns transaction_id
   * @param transactionId - The transaction_id from the withdrawal response
   * @returns Withdrawal status and details
   */
  async getWithdrawalStatusByTransactionId(transactionId: string) {
    try {
      const headers = this.getAuthHeaders();

      console.log(
        "🔍 Fetching withdrawal status by transaction_id from NutzPay:",
        transactionId
      );

      // Try multiple possible endpoints for withdrawal status
      const endpoints = [
        `${this.baseUrl}/usdt/withdrawal/${transactionId}`,
        `${this.baseUrl}/usdt/transaction/${transactionId}`,
        `${this.baseUrl}/transaction/${transactionId}`,
      ];

      let lastError: Error | null = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying withdrawal endpoint: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers,
            validateStatus: () => true, // Don't throw on any status
          });

          console.log(
            "📡 NutzPay withdrawal API Response Status:",
            response.status
          );

          if (response.status === 200 || response.status === 201) {
            const responseData = response.data?.data || response.data;
            console.log(
              "✅ NutzPay withdrawal status response:",
              JSON.stringify(responseData, null, 2)
            );
            return responseData;
          }

          if (response.status === 404) {
            console.log(
              `❌ Withdrawal not found at ${endpoint}, trying next...`
            );
            continue; // Try next endpoint
          }

          // Handle 500 errors gracefully
          if (response.status >= 500) {
            console.log(
              `⚠️ NutzPay API server error (${response.status}) at ${endpoint}, trying next endpoint...`
            );
            lastError = new Error(
              `NutzPay API server error: ${response.status}`
            );
            continue;
          }

          // If we get here, we got a response but not 200/201/404/5xx
          const responseData = response.data?.data || response.data;
          return responseData;
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            if (error.response.status >= 500) {
              console.log(
                `⚠️ NutzPay API server error (${error.response.status}), trying next endpoint...`
              );
              lastError =
                error instanceof Error ? error : new Error(String(error));
              continue;
            }
            if (error.response.status === 404) {
              console.log(`❌ 404 at ${endpoint}, trying next endpoint...`);
              continue;
            }
          }
          lastError = error instanceof Error ? error : new Error(String(error));
          console.log(
            `❌ Error at ${endpoint}:`,
            error instanceof Error ? error.message : error
          );
          continue;
        }
      }

      // If all endpoints failed with server errors, return null (don't throw)
      if (lastError) {
        const isServerError =
          lastError.message.includes("500") ||
          lastError.message.includes("server error") ||
          lastError.message.includes("502") ||
          lastError.message.includes("503") ||
          lastError.message.includes("504");

        if (isServerError) {
          console.log(
            "⚠️ NutzPay API server errors on all endpoints - withdrawal status will remain unchanged"
          );
          return null;
        }

        throw lastError;
      }

      throw new Error("All withdrawal endpoints failed");
    } catch (error) {
      console.error("❌ NutzPay withdrawal status fetch error:", error);
      const rateLimitMsg = this.getRateLimitMessage(error);
      if (rateLimitMsg) throw new Error(rateLimitMsg);
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

      let lastError: Error | null = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers,
            validateStatus: () => true, // Don't throw on any status - handle all manually
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

          // Handle 500 errors gracefully - don't throw, just log and try next endpoint
          if (response.status >= 500) {
            console.log(
              `⚠️ NutzPay API server error (${response.status}) at ${endpoint}, trying next endpoint...`
            );
            console.log("Response data:", response.data);
            lastError = new Error(
              `NutzPay API server error: ${response.status}`
            );
            continue; // Try next endpoint
          }

          // If we get here, we got a response but not 200/201/404/5xx
          const responseData = response.data?.data || response.data;
          console.log(
            `⚠️ Got status ${response.status} from ${endpoint}, but continuing...`
          );
          return responseData;
        } catch (error) {
          // Only catch non-HTTP errors (network errors, etc.)
          if (axios.isAxiosError(error) && error.response) {
            // This is an HTTP error - we should have caught it above
            // But if we get here, it means validateStatus didn't work as expected
            if (error.response.status >= 500) {
              console.log(
                `⚠️ NutzPay API server error (${error.response.status}), trying next endpoint...`
              );
              lastError =
                error instanceof Error ? error : new Error(String(error));
              continue;
            }
          }
          lastError = error instanceof Error ? error : new Error(String(error));
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

      // If all endpoints failed, check if it was a server error (5xx)
      // For server errors, don't throw - just return null so order stays PENDING
      if (lastError) {
        const isServerError =
          lastError.message.includes("500") ||
          lastError.message.includes("server error") ||
          lastError.message.includes("502") ||
          lastError.message.includes("503") ||
          lastError.message.includes("504");

        if (isServerError) {
          console.log(
            "⚠️ NutzPay API server errors on all endpoints - order will remain PENDING"
          );
          console.log(
            "This is likely a temporary NutzPay issue. Webhook will update order when payment is confirmed."
          );
          return null; // Return null instead of throwing - order stays PENDING
        }

        // For other errors (4xx, network, etc.), throw
        throw lastError;
      }

      throw new Error("All endpoints failed");
    } catch (error) {
      console.error("❌ NutzPay transaction status fetch error:", error);
      const rateLimitMsg = this.getRateLimitMessage(error);
      if (rateLimitMsg) throw new Error(rateLimitMsg);

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
      const rateLimitMsg = this.getRateLimitMessage(error);
      if (rateLimitMsg) throw new Error(rateLimitMsg);

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
   * Create PIX purchase/charge (Scope: pix:purchase)
   * POST /api/v1/pix/purchase
   */
  async createPixPurchase(data: {
    amount: number;
    currency?: string;
    metadata?: {
      order_id?: string;
      customer_name?: string;
      [key: string]: unknown;
    };
  }) {
    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Invalid amount: must be a positive number");
    }

    const payload = {
      amount,
      currency: data.currency ?? "BRL",
      metadata: data.metadata ?? {},
    };

    try {
      const headers = this.getAuthHeaders();
      const response = await axios.post(
        `${this.baseUrl}/pix/purchase`,
        payload,
        { headers }
      );
      return response.data;
    } catch (error) {
      const rateLimitMsg = this.getRateLimitMessage(error);
      if (rateLimitMsg) throw new Error(rateLimitMsg);
      throw error;
    }
  }

  /**
   * Get PIX balance (Scope: pix:read)
   * POST /api/v1/pix/balance (empty body) – per migration guide
   */
  async getPixBalance() {
    try {
      const headers = this.getAuthHeaders();
      const response = await axios.post(
        `${this.baseUrl}/pix/balance`,
        {},
        { headers }
      );
      const data = response.data?.data ?? response.data;
      return {
        success: response.data?.success ?? true,
        data: {
          balance: data?.balance ?? 0,
          total_deposited: data?.total_deposited ?? 0,
          total_withdrawn: data?.total_withdrawn ?? 0,
          currency: data?.currency ?? "BRL",
          ...data,
        },
      };
    } catch (error) {
      const rateLimitMsg = this.getRateLimitMessage(error);
      if (rateLimitMsg) throw new Error(rateLimitMsg);
      throw error;
    }
  }

  /**
   * Create PIX payout/withdrawal (Scope: pix:payout)
   * POST /api/v1/pix/payout
   * Guide: recipient_key (was pixKey), recipient_key_type, recipient_name required; external_id, callback_url optional.
   */
  async createPixPayout(data: {
    amount: number;
    recipient_key: string;
    recipient_key_type?: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";
    recipient_name: string;
    description?: string;
    external_id?: string;
    callback_url?: string;
  }) {
    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Invalid amount: must be a positive number");
    }
    if (!data.recipient_key?.trim()) {
      throw new Error("recipient_key is required");
    }
    if (!data.recipient_name?.trim()) {
      throw new Error("recipient_name is required");
    }

    const callbackUrl =
      data.callback_url ||
      (process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br") +
        "/api/webhooks/nutzpay";

    const payload: Record<string, unknown> = {
      amount,
      recipient_key: data.recipient_key.trim(),
      recipient_key_type: data.recipient_key_type ?? "CPF",
      recipient_name: data.recipient_name.trim(),
      description: data.description ?? "PIX payout",
      callback_url: callbackUrl,
    };
    if (data.external_id) payload.external_id = data.external_id;

    try {
      const headers = this.getAuthHeaders();
      const response = await axios.post(`${this.baseUrl}/pix/payout`, payload, {
        headers,
      });
      const body = response.data as { data?: unknown };
      return body?.data !== undefined ? body.data : response.data;
    } catch (error) {
      const rateLimitMsg = this.getRateLimitMessage(error);
      if (rateLimitMsg) throw new Error(rateLimitMsg);
      throw error;
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * Follows NutzPay documentation: https://docs.nutzpay.com/webhooks
   *
   * Always validates the HMAC-SHA256 signature in the X-Webhook-Signature header
   * Uses WEBHOOK_SECRET from environment variables (or secret key as fallback)
   */
  async verifyWebhookSignature(
    request: Request,
    body: string
  ): Promise<boolean> {
    try {
      // Get webhook secret - required for signature validation
      // Check NUTZPAY_WEBHOOK_SECRET first, then fall back to secret key
      const webhookSecret =
        process.env.NUTZPAY_WEBHOOK_SECRET || this.secretKey;

      if (!webhookSecret) {
        console.error(
          "No webhook secret configured. Set NUTZPAY_WEBHOOK_SECRET or NUTZPAY_SECRET_KEY."
        );
        return false; // Fail closed - require secret for security
      }

      // Get signature from header - NutzPay may send it as x-signature or x-webhook-signature
      // Try different header names and case variations
      const signature =
        request.headers.get("x-signature") ||
        request.headers.get("X-Signature") ||
        request.headers.get("X-SIGNATURE") ||
        request.headers.get("x-webhook-signature") ||
        request.headers.get("X-Webhook-Signature") ||
        request.headers.get("X-WEBHOOK-SIGNATURE");

      if (!signature) {
        console.error(
          "Missing signature header. NutzPay requires signature validation."
        );
        const relevantHeaders = Array.from(request.headers.keys()).filter(
          (h) =>
            h.toLowerCase().includes("signature") ||
            h.toLowerCase().includes("webhook") ||
            h.toLowerCase().includes("x-")
        );
        console.error("Available headers:", relevantHeaders);
        console.error("All headers:", Array.from(request.headers.keys()));
        return false; // Fail closed - require signature
      }

      console.log(
        "✅ Found signature header:",
        signature.substring(0, 20) + "..."
      );

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
