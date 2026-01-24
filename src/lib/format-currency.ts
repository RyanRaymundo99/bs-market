/**
 * Formats a number intelligently, removing trailing zeros
 * @param value - The number to format
 * @param currency - The currency code (USDT, BRL, etc.)
 * @param options - Optional formatting options
 * @returns Formatted string without trailing zeros
 */
export function formatCurrency(
  value: number | string,
  currency: string = "USDT",
  options?: {
    minDecimals?: number;
    maxDecimals?: number;
    showCurrency?: boolean;
  }
): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return options?.showCurrency !== false ? `0 ${currency}` : "0";
  }

  const { minDecimals = 0, maxDecimals = 8, showCurrency = true } = options || {};

  // For BRL, use Brazilian currency formatting
  if (currency === "BRL") {
    // Remove trailing zeros but keep at least minDecimals
    const formatted = numValue.toFixed(maxDecimals);
    const trimmed = formatted.replace(/\.?0+$/, "");
    const parts = trimmed.split(".");
    const decimals = parts[1] || "";
    
    // Ensure minimum decimals
    const finalDecimals = decimals.length < minDecimals 
      ? decimals.padEnd(minDecimals, "0")
      : decimals;
    
    const finalValue = finalDecimals 
      ? `${parts[0]}.${finalDecimals}`
      : parts[0];
    
    return showCurrency ? `R$ ${finalValue}` : finalValue;
  }

  // For USDT and other cryptocurrencies
  // Remove trailing zeros but keep at least minDecimals
  const formatted = numValue.toFixed(maxDecimals);
  const trimmed = formatted.replace(/\.?0+$/, "");
  const parts = trimmed.split(".");
  const decimals = parts[1] || "";
  
  // Ensure minimum decimals
  const finalDecimals = decimals.length < minDecimals 
    ? decimals.padEnd(minDecimals, "0")
    : decimals;
  
  const finalValue = finalDecimals 
    ? `${parts[0]}.${finalDecimals}`
    : parts[0];
  
  return showCurrency ? `${finalValue} ${currency}` : finalValue;
}

/**
 * Formats a number for display in tables/lists (shorter format)
 * @param value - The number to format
 * @param currency - The currency code
 * @returns Formatted string
 */
export function formatCurrencyCompact(
  value: number | string,
  currency: string = "USDT"
): string {
  return formatCurrency(value, currency, {
    minDecimals: 0,
    maxDecimals: 2,
    showCurrency: true,
  });
}

/**
 * Formats a number for USDT display (up to 4 decimals)
 * @param value - The number to format
 * @returns Formatted string
 */
export function formatUSDT(value: number | string): string {
  return formatCurrency(value, "USDT", {
    minDecimals: 0,
    maxDecimals: 4,
    showCurrency: true,
  });
}

/**
 * Formats a number for BRL display (up to 2 decimals)
 * @param value - The number to format
 * @returns Formatted string
 */
export function formatBRL(value: number | string): string {
  return formatCurrency(value, "BRL", {
    minDecimals: 0,
    maxDecimals: 2,
    showCurrency: true,
  });
}
