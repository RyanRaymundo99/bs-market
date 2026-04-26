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

// Generate WhatsApp URL with pre-filled message for deposits > 2k
export const getWhatsAppUrlForLargeDeposit = (
  usdtAmount: number,
  language: string
) => {
  const whatsappNumber =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5511984284867";
  const message =
    language === "pt"
      ? `Olá! Tenho interesse em fazer um depósito de ${usdtAmount.toLocaleString(
          "pt-BR",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )} USDT. Gostaria de mais informações.`
      : `Hello! I'm interested in making a deposit of ${usdtAmount.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )} USDT. I'd like more information.`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
};

// Format BRL value for display
export const formatBRL = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Format USDT value for display (4 decimal places)
export const formatUSDT = (value: number) => {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
};
