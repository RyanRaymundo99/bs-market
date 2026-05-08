import type { CryptoCurrency } from "./crypto-assets";

export function getUsdtDebitedPerUnitWithdrawnServer(
  currency: CryptoCurrency
): number {
  if (currency === "USDT") return 1;
  const raw =
    process.env.STABLECOIN_USDC_DEBIT_USDT_PER_USDC ??
    process.env.NEXT_PUBLIC_STABLECOIN_USDC_DEBIT_USDT_PER_USDC ??
    "1";
  const r = parseFloat(raw);
  return Number.isFinite(r) && r > 0 ? r : 1;
}

export function getUsdtDebitedPerUnitWithdrawnClient(
  currency: CryptoCurrency
): number {
  if (currency === "USDT") return 1;
  const raw =
    process.env.NEXT_PUBLIC_STABLECOIN_USDC_DEBIT_USDT_PER_USDC ?? "1";
  const r = parseFloat(raw);
  return Number.isFinite(r) && r > 0 ? r : 1;
}

export function usdcWithdrawalCapacityUsdt(
  usdtBal: number,
  usdcBal: number,
  rate: number
): number {
  return usdtBal + usdcBal * rate;
}

export function computeStablecoinLedgerDebits(
  currency: CryptoCurrency,
  grossAmount: number,
  usdtBal: number,
  usdcBal: number,
  rate: number
): { dUsdt: number; dUsdc: number; usdtNeeded: number } {
  if (currency === "USDT") {
    return {
      dUsdt: grossAmount,
      dUsdc: 0,
      usdtNeeded: grossAmount,
    };
  }

  const usdtNeeded = grossAmount * rate;
  let need = usdtNeeded;
  const dUsdt = Math.min(need, usdtBal);
  need -= dUsdt;
  const dUsdc = rate > 0 ? need / rate : 0;

  return {
    dUsdt: roundCrypto(dUsdt),
    dUsdc: roundCrypto(dUsdc),
    usdtNeeded: roundCrypto(usdtNeeded),
  };
}

function roundCrypto(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}
