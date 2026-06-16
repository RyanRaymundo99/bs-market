"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { readSessionCache, writeSessionCache } from "@/lib/utils";

export interface WalletBalance {
  currency: string;
  amount: number;
  locked: number;
}

const POLL_MS = 10_000;
const BALANCE_CACHE_MS = 120_000;
const BALANCE_CACHE_KEY = "balance";

type BalanceContextValue = {
  balances: WalletBalance[];
  /** True only on the very first load with no cached rows yet */
  isLoading: boolean;
  error: string | null;
  refresh: (silent?: boolean) => Promise<void>;
};

const BalanceContext = createContext<BalanceContextValue | null>(null);

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedInitialFetch, setHasCompletedInitialFetch] =
    useState(false);
  const lastSerializedRef = useRef<string>("");

  useLayoutEffect(() => {
    const cached = readSessionCache<WalletBalance[]>(
      BALANCE_CACHE_KEY,
      BALANCE_CACHE_MS
    );
    if (cached?.length) {
      setBalances(cached);
      setHasCompletedInitialFetch(true);
      lastSerializedRef.current = JSON.stringify(cached);
    }
  }, []);

  const fetchBalances = useCallback(async (silent = false) => {
    try {
      const response = await fetch("/api/balance", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const next: WalletBalance[] = data.balances || [];
        setBalances(next);
        setError(null);
        writeSessionCache(BALANCE_CACHE_KEY, next);

        const serialized = JSON.stringify(next);
        if (serialized !== lastSerializedRef.current) {
          lastSerializedRef.current = serialized;
          window.dispatchEvent(
            new CustomEvent("balance-updated", {
              detail: { balances: next },
            })
          );
        }
      } else {
        if (response.status === 401) {
          setBalances([]);
          setError(null);
          lastSerializedRef.current = "";
        } else if (!silent) {
          setError("Failed to fetch balances");
        }
      }
    } catch (err) {
      if (!silent) {
        setError("Error loading balances");
        console.error("Error fetching balances:", err);
      }
    } finally {
      setHasCompletedInitialFetch(true);
    }
  }, []);

  useEffect(() => {
    void fetchBalances(false);
    const interval = window.setInterval(() => {
      void fetchBalances(true);
    }, POLL_MS);
    const onRefresh = () => void fetchBalances(true);
    window.addEventListener("refresh-balance", onRefresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("refresh-balance", onRefresh);
    };
  }, [fetchBalances]);

  const value = useMemo<BalanceContextValue>(() => {
    const isLoading =
      !hasCompletedInitialFetch && balances.length === 0 && !error;
    return {
      balances,
      isLoading,
      error,
      refresh: fetchBalances,
    };
  }, [balances, error, fetchBalances, hasCompletedInitialFetch]);

  return (
    <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>
  );
}

export function useWalletBalances(): BalanceContextValue {
  const ctx = useContext(BalanceContext);
  if (!ctx) {
    throw new Error("useWalletBalances must be used within BalanceProvider");
  }
  return ctx;
}