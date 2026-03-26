// Format USDT input value for display, using Brazilian number format.
export const formatUSDTInput = (value: string): string => {
  // Keep only digits, comma, and dot
  const cleaned = value.replace(/[^\d,.]/g, "");
  if (!cleaned) return "";

  // Split by comma to handle decimal part separately
  const [intPartStr, ...decParts] = cleaned.split(",");
  const decimalPart = (decParts.join("") || "").replace(/\D/g, "").slice(0, 4);

  // Format integer part with thousand separators
  const integerDigits = (intPartStr || "").replace(/\D/g, "");
  const formattedInteger = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (decimalPart) {
    return `${formattedInteger},${decimalPart}`;
  }
  if (cleaned.includes(",")) {
    return `${formattedInteger},`;
  }
  return formattedInteger;
};

// Parse the formatted USDT input string back into a number.
export const parseUSDTInput = (value: string): number => {
  if (!value) return 0;
  // Convert from Brazilian format (1.234,56) to standard format (1234.56)
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};
