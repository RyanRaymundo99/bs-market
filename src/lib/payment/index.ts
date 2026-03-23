/**
 * Payment Provider Entry Point
 *
 * Exports the active payment service based on environment config.
 * All routes should import from this file, not directly from provider files.
 *
 * Usage:
 *   import { paymentService } from "@/lib/payment";
 *   const result = await paymentService.createUSDTPurchase(data);
 */

export * from "./types";

import type { PaymentProvider } from "./types";
import { getActiveProviderName } from "./types";
import { mercadoPagoService } from "./mercadopago";

/**
 * Get the active payment provider instance.
 * Currently only supports "mercadopago".
 * Add new providers here as they are implemented.
 */
function getPaymentProvider(): PaymentProvider {
  const providerName = getActiveProviderName();

  switch (providerName) {
    case "mercadopago":
      return mercadoPagoService;
    default:
      console.warn(
        `Unknown payment provider "${providerName}", falling back to mercadopago`
      );
      return mercadoPagoService;
  }
}

/** The active payment service singleton */
export const paymentService: PaymentProvider = getPaymentProvider();
