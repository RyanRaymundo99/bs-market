import crypto from "crypto";
import type {
  PaymentProvider,
  PixPaymentRequest,
  PixPaymentResponse,
  WithdrawalRequest,
  WithdrawalResponse,
  PaymentStatusResponse,
  BalanceResponse,
} from "./types";

/**
 * Mercado Pago Payment Provider
 *
 * Implements the PaymentProvider interface for Mercado Pago.
 *
 * Authentication: Access Token in Authorization header.
 * PIX: Uses Mercado Pago's Payment API to generate PIX QR codes.
 *
 * Environment variables:
 *   MERCADOPAGO_ACCESS_TOKEN  – Access Token (server-side)
 *   MERCADOPAGO_PUBLIC_KEY    – Public Key (client-side, optional)
 *   PAYMENT_WEBHOOK_SECRET    – Secret for webhook signature verification
 *
 * @see https://www.mercadopago.com.br/developers/pt/reference
 */
export class MercadoPagoService implements PaymentProvider {
  readonly name = "mercadopago";

  private accessToken: string;
  private baseUrl = "https://api.mercadopago.com";

  constructor() {
    this.accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "";

    if (!this.accessToken) {
      console.warn(
        "⚠️ Mercado Pago credentials not configured. Set MERCADOPAGO_ACCESS_TOKEN."
      );
    }
  }

  // ─── Authentication ──────────────────────────────────────────────────────

  /**
   * Get authenticated headers for API requests.
   */
  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
    };
  }

  /**
   * Build a user-friendly error message for common Mercado Pago API errors.
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      // Check for fetch/network errors
      if (error.message.includes("fetch")) {
        return `Cannot connect to Mercado Pago API.`;
      }
      return error.message;
    }
    return String(error);
  }

  // ─── PaymentProvider Implementation ──────────────────────────────────────

  async createUSDTPurchase(
    data: PixPaymentRequest
  ): Promise<PixPaymentResponse> {
    try {
      // Ensure amount has 2 decimals maximum
      const amountValue = Math.round(data.amount * 100) / 100;

      const cleanDocument = data.customer.document.replace(/\D/g, "");

      // Map to Mercado Pago Payment API payload
      const payload = {
        transaction_amount: amountValue,
        description: `USDT purchase - ${data.usdtAmount} USDT`,
        payment_method_id: "pix",
        payer: {
          email: data.customer.email,
          first_name: data.customer.name.split(" ")[0] || "Cliente",
          last_name: data.customer.name.split(" ").slice(1).join(" ") || "BS Market",
          identification: {
            type: cleanDocument.length > 11 ? "CNPJ" : "CPF",
            number: cleanDocument,
          },
        },
        external_reference: data.externalId,
        notification_url: data.callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      };

      console.log("📤 Mercado Pago purchase request:", {
        externalReference: payload.external_reference,
        amount: payload.transaction_amount,
        cleanDocument,
      });

      const response = await fetch(`${this.baseUrl}/v1/payments`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;

        if (status === 429) {
          throw new Error("Mercado Pago API rate limit exceeded (429).");
        }
        if (status === 401) {
          throw new Error("Mercado Pago authentication failed. Check your credentials.");
        }
        if (status === 400) {
          let message = errorData?.message || errorData?.cause?.[0]?.description || JSON.stringify(errorData);
          
          if (message.includes("Collector user without key enabled")) {
            message = "Your Mercado Pago account does not have a PIX key enabled correctly. Please register a PIX key (Chave PIX) in your Mercado Pago account settings before trying again.";
          }
          
          throw new Error(`Mercado Pago validation error: ${message}`);
        }
        if (status >= 500) {
          throw new Error("Mercado Pago is temporarily unavailable. Please try again in a few minutes.");
        }

        const apiMessage = errorData?.message || errorData?.error || "";
        throw new Error(
          apiMessage
            ? `Mercado Pago API error: ${apiMessage}`
            : `Mercado Pago API error (${status})`
        );
      }

      const responseData = await response.json();

      // Mercado Pago returns PIX data in point_of_interaction.transaction_data
      const pixData = responseData.point_of_interaction?.transaction_data;
      const qrCode = pixData?.qr_code || null; // PIX copy-paste code (EMV)
      const qrCodeBase64 = pixData?.qr_code_base64 || null; // QR code image base64
      const ticketUrl = pixData?.ticket_url || null; // URL to payment page

      return {
        transactionId: responseData.id?.toString() || null, // Mercado Pago's payment ID
        status: responseData.status || "pending",
        pixCode: qrCode, // PIX copia e cola
        qrCodeUrl: ticketUrl, // Payment page URL
        qrCodeBase64: qrCodeBase64, // QR code image in base64
        raw: responseData,
      };
    } catch (error) {
      console.error("❌ Mercado Pago purchase creation error:", error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async createUSDTWithdrawal(
    _: WithdrawalRequest
  ): Promise<WithdrawalResponse> {
    // Mercado Pago doesn't support crypto withdrawals directly
    console.warn("⚠️ Mercado Pago does not support crypto withdrawals directly.");
    throw new Error("Mercado Pago does not support crypto withdrawals. Please contact support.");
  }

  async getTransactionStatus(
    transactionId: string
  ): Promise<PaymentStatusResponse | null> {
    try {
      console.log("🔍 Fetching transaction status from Mercado Pago:", transactionId);

      const endpoint = `${this.baseUrl}/v1/payments/${transactionId}`;

      try {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: this.getAuthHeaders(),
        });

        if (response.ok) {
          const raw = await response.json();
          const status = (raw.status as string) || "unknown";

          // Mercado Pago statuses: pending, approved, authorized, in_process, 
          // in_mediation, rejected, cancelled, refunded, charged_back
          return {
            status,
            isCompleted: status === "approved" || status === "authorized",
            isFailed: status === "rejected" || status === "cancelled" || status === "refunded" || status === "charged_back",
            raw,
          };
        }

        if (response.status >= 500) {
          console.warn(`⚠️ Mercado Pago server error (${response.status}) at ${endpoint}`);
        }
      } catch {
        // network issue
      }

      // Allow order to stay PENDING
      return null;
    } catch (error) {
      console.error("❌ Mercado Pago transaction status error:", error);
      return null;
    }
  }

  async getWithdrawalStatus(
    _: string
  ): Promise<PaymentStatusResponse | null> {
    throw new Error("Mercado Pago withdrawals not implemented.");
  }

  async getUSDTBalance(): Promise<BalanceResponse> {
    // Mercado Pago balance can be checked via /v1/account/balance
    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          balance: 0,
          currency: "BRL",
          available: 0,
          locked: 0,
          raw: { notice: "Use Mercado Pago dashboard for balance info", userId: data.id },
        };
      }
    } catch (error) {
      console.error("Error fetching Mercado Pago balance:", error);
    }

    return {
      balance: 0,
      currency: "BRL",
      available: 0,
      locked: 0,
      raw: { notice: "Mercado Pago balance check unavailable" },
    };
  }

  async verifyWebhookSignature(
    request: Request,
    body: string
  ): Promise<boolean> {
    // Mercado Pago webhook verification:
    // They send x-signature and x-request-id headers
    // The signature is calculated using HMAC-SHA256 with the webhook secret
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    
    if (!secret || secret === "placeholder-webhook-secret") {
      // If no secret configured or still using placeholder, accept and verify via API
      console.log("⚠️ Webhook secret not configured or placeholder used. Relying on API verification.");
      return true;
    }

    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");

    if (!xSignature || !xRequestId) {
      // If MP headers are not present, accept the webhook
      // (could be a test webhook or different format)
      return true;
    }

    try {
      // Parse the x-signature header
      // Format: "ts=<timestamp>,v1=<hash>"
      const parts: Record<string, string> = {};
      xSignature.split(",").forEach((part) => {
        const [key, value] = part.split("=");
        if (key && value) {
          parts[key.trim()] = value.trim();
        }
      });

      const ts = parts["ts"];
      const v1 = parts["v1"];

      if (!ts || !v1) {
        return true; // Accept if format doesn't match expected
      }

      // Parse the body to get the data.id
      const parsedBody = JSON.parse(body);
      const dataId = parsedBody?.data?.id;

      // Build the manifest string
      // manifest = "id:{data.id};request-id:{x-request-id};ts:{ts};"
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      
      console.log("🛠️ Webhook Signature Debug:", {
        manifest,
        ts,
        v1: v1.substring(0, 10) + "..."
      });


      // Calculate HMAC
      const hmac = crypto
        .createHmac("sha256", secret)
        .update(manifest)
        .digest("hex");

      return hmac === v1;
    } catch (error) {
      console.error("Error verifying Mercado Pago webhook signature:", error);
      return true; // Accept and verify via API
    }
  }
}

// Singleton instance
export const mercadoPagoService = new MercadoPagoService();
