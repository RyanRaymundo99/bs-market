import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeStablecoinLedgerDebits,
  getUsdtDebitedPerUnitWithdrawnServer,
  usdcWithdrawalCapacityUsdt,
} from "./stablecoin-withdraw";

describe("getUsdtDebitedPerUnitWithdrawnServer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 1 for USDT", () => {
    expect(getUsdtDebitedPerUnitWithdrawnServer("USDT")).toBe(1);
  });

  it("reads STABLECOIN_USDC_DEBIT_USDT_PER_USDC for USDC", () => {
    vi.stubEnv("STABLECOIN_USDC_DEBIT_USDT_PER_USDC", "1.02");
    expect(getUsdtDebitedPerUnitWithdrawnServer("USDC")).toBeCloseTo(1.02);
  });

  it("falls back to 1 for invalid env", () => {
    vi.stubEnv("STABLECOIN_USDC_DEBIT_USDT_PER_USDC", "not-a-number");
    expect(getUsdtDebitedPerUnitWithdrawnServer("USDC")).toBe(1);
  });
});

describe("usdcWithdrawalCapacityUsdt", () => {
  it("sums USDT balance and USDC converted at rate", () => {
    expect(usdcWithdrawalCapacityUsdt(100, 50, 2)).toBe(200);
  });
});

describe("computeStablecoinLedgerDebits", () => {
  it("debits USDT only for USDT withdrawal", () => {
    const r = computeStablecoinLedgerDebits("USDT", 10, 100, 100, 1.2);
    expect(r).toEqual({
      dUsdt: 10,
      dUsdc: 0,
      usdtNeeded: 10,
    });
  });

  it("uses only USDT when balance covers USDC-equivalent need", () => {
    const r = computeStablecoinLedgerDebits("USDC", 10, 20, 100, 2);
    expect(r.usdtNeeded).toBeCloseTo(20);
    expect(r.dUsdt).toBeCloseTo(20);
    expect(r.dUsdc).toBeCloseTo(0);
  });

  it("uses USDC when USDT balance is insufficient", () => {
    const r = computeStablecoinLedgerDebits("USDC", 10, 5, 100, 2);
    expect(r.dUsdt).toBeCloseTo(5);
    expect(r.dUsdc).toBeCloseTo(7.5);
    expect(r.usdtNeeded).toBeCloseTo(20);
  });
});