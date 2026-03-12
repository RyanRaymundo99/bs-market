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
import { nupayService } from "./nubank";

/**
 * Get the active payment provider instance.
 * Currently only supports "nupay".
 * Add new providers here as they are implemented.
 */
function getPaymentProvider(): PaymentProvider {
  const providerName = getActiveProviderName();

  switch (providerName) {
    case "nupay":
      return nupayService;
    default:
      console.warn(
        `Unknown payment provider "${providerName}", falling back to nupay`
      );
      return nupayService;
  }
}

/** The active payment service singleton */
export const paymentService: PaymentProvider = getPaymentProvider();
