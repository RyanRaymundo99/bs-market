/**
 * Payment Provider Abstraction Layer
 *
 * This module defines the canonical interfaces for payment providers.
 * Any provider (Mercado Pago, etc.) must implement the PaymentProvider interface.
 */

// ─── Canonical Request/Response Types ────────────────────────────────────────

export interface PixPaymentRequest {
  /** Amount in BRL */
  amount: number;
  /** Amount in USDT */
  usdtAmount: number;
  /** Customer information */
  customer: {
    name: string;
    document: string; // CPF/CNPJ
    email: string;
  };
  /** External reference ID (our side) */
  externalId: string;
  /** Webhook callback URL */
  callbackUrl: string;
}

export interface PixPaymentResponse {
  /** Provider's transaction ID */
  transactionId: string | null;
  /** Payment status from provider */
  status: string;
  /** PIX copy-paste code / copia e cola */
  pixCode: string | null;
  /** QR code image URL (if available) */
  qrCodeUrl: string | null;
  /** QR code base64 image (if available) */
  qrCodeBase64: string | null;
  /** Raw provider response (for debugging/logging) */
  raw: Record<string, unknown>;
}

export interface PaymentStatusResponse {
  /** Provider status string */
  status: string;
  /** Whether the payment is confirmed/completed */
  isCompleted: boolean;
  /** Whether the payment is expired/cancelled */
  isFailed: boolean;
  /** Raw provider response */
  raw: Record<string, unknown> | null;
}

export interface WithdrawalRequest {
  /** Amount in the respective currency */
  amount: number;
  /** Recipient address (for crypto) */
  recipientAddress: string;
  /** Network (e.g. TRC20, ERC20) */
  recipientNetwork: string;
  /** Description */
  description?: string;
  /** External reference ID */
  externalId?: string;
  /** Webhook callback URL */
  callbackUrl?: string;
}

export interface WithdrawalResponse {
  /** Provider's transaction ID */
  transactionId: string | null;
  /** Status */
  status: string;
  /** Raw provider response */
  raw: Record<string, unknown>;
}

export interface BalanceResponse {
  /** Available balance */
  balance: number;
  /** Currency */
  currency: string;
  /** Available for withdrawal */
  available: number;
  /** Locked/reserved amount */
  locked: number;
  /** Raw provider response (for additional data like deposit addresses) */
  raw?: Record<string, unknown>;
}

export interface PixPayoutRequest {
  /** Amount in BRL */
  amount: number;
  /** PIX key of recipient */
  recipientKey: string;
  /** PIX key type */
  recipientKeyType?: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";
  /** Recipient name */
  recipientName: string;
  /** Description */
  description?: string;
  /** External reference ID */
  externalId?: string;
  /** Webhook callback URL */
  callbackUrl?: string;
}

// ─── Fee Calculation ─────────────────────────────────────────────────────────

export interface FeeConfig {
  /** Total fee percentage charged to customer (e.g. 0.03 = 3%) */
  totalFeeRate: number;
  /** Platform commission percentage on base amount (e.g. 0.018 = 1.8%) */
  platformCommissionRate: number;
}

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  totalFeeRate: 0.03,
  platformCommissionRate: 0.018,
};

/**
 * Calculate fee breakdown from a total amount that already includes the fee.
 * @param totalAmount Amount paid by user (includes fee)
 * @param config Fee configuration
 */
export function calculateFeeBreakdown(
  totalAmount: number,
  config: FeeConfig = DEFAULT_FEE_CONFIG
) {
  const baseAmount = totalAmount / (1 + config.totalFeeRate);
  const totalFee = totalAmount - baseAmount;
  const platformCommission = baseAmount * config.platformCommissionRate;

  return {
    /** The base amount before fee */
    baseAmount: Math.round(baseAmount * 100) / 100,
    /** The full fee charged (e.g. 3%) */
    totalFee: Math.round(totalFee * 100) / 100,
    /** Our platform commission portion */
    platformCommission: Math.round(platformCommission * 100) / 100,
    /** The total paid by user */
    totalPaid: totalAmount,
  };
}

// ─── Payment Provider Interface ──────────────────────────────────────────────

export interface PaymentProvider {
  /** Provider name (e.g. "mercadopago", "stripe") */
  readonly name: string;

  /**
   * Create a USDT purchase via PIX.
   * Generates a PIX QR code / copy-paste code for the customer.
   */
  createUSDTPurchase(data: PixPaymentRequest): Promise<PixPaymentResponse>;

  /**
   * Create a USDT withdrawal (send USDT to an external address).
   */
  createUSDTWithdrawal(data: WithdrawalRequest): Promise<WithdrawalResponse>;

  /**
   * Get the status of a purchase transaction.
   * Returns null if provider is temporarily unavailable (keep order PENDING).
   */
  getTransactionStatus(
    transactionId: string
  ): Promise<PaymentStatusResponse | null>;

  /**
   * Get the status of a withdrawal transaction.
   * Returns null if provider is temporarily unavailable.
   */
  getWithdrawalStatus(
    transactionId: string
  ): Promise<PaymentStatusResponse | null>;

  /**
   * Get USDT balance from the provider account.
   */
  getUSDTBalance(): Promise<BalanceResponse>;

  /**
   * Verify the signature of an incoming webhook request.
   * @param request The raw Request object
   * @param body The raw body string (for HMAC calculation)
   * @returns true if signature is valid
   */
  verifyWebhookSignature(request: Request, body: string): Promise<boolean>;
}

// ─── Provider Registry ───────────────────────────────────────────────────────

/** The currently active payment provider name */
export type ProviderName = "mercadopago"; // Future: | "stripe" etc.

/**
 * Get the current active provider name from env.
 * Defaults to "mercadopago".
 */
export function getActiveProviderName(): ProviderName {
  return (
    (process.env.PAYMENT_PROVIDER as ProviderName) || "mercadopago"
  );
}
