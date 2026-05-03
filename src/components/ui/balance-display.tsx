"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Wallet } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Balance {
  currency: string;
  amount: number;
  locked: number;
}

interface BalanceDisplayProps {
  className?: string;
  pollingInterval?: number; // allow custom interval (default 10s)
}

export function BalanceDisplay({ className, pollingInterval = 10000 }: BalanceDisplayProps) {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balanceChange, setBalanceChange] = useState<{
    direction: "up" | "down";
    amount: number;
  } | null>(null);
  const lastBalanceRef = useRef<string>("");
  const previousUsdtBalanceRef = useRef<number | null>(null);
  const balanceChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const { language } = useLanguage();

  const fetchBalances = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      const response = await fetch("/api/balance", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const newBalances = data.balances || [];
        const nextUsdtBalance =
          newBalances.find((b: Balance) => b.currency === "USDT")?.amount || 0;
        const previousUsdtBalance = previousUsdtBalanceRef.current;

        if (
          previousUsdtBalance !== null &&
          nextUsdtBalance !== previousUsdtBalance
        ) {
          const delta = nextUsdtBalance - previousUsdtBalance;

          setBalanceChange({
            direction: delta < 0 ? "down" : "up",
            amount: Math.abs(delta),
          });

          if (balanceChangeTimeoutRef.current) {
            clearTimeout(balanceChangeTimeoutRef.current);
          }

          balanceChangeTimeoutRef.current = setTimeout(() => {
            setBalanceChange(null);
          }, 2200);
        }

        previousUsdtBalanceRef.current = nextUsdtBalance;
        setBalances(newBalances);
        
        // Notify other components if balance changed
        const balanceStr = JSON.stringify(newBalances);
        if (balanceStr !== lastBalanceRef.current) {
          lastBalanceRef.current = balanceStr;
          window.dispatchEvent(new CustomEvent("balance-updated", { detail: { balances: newBalances } }));
        }
        
        setError(null);
      } else {
        if (!isSilent) setError("Failed to fetch balances");
      }
    } catch (err) {
      if (!isSilent) {
        setError("Error loading balances");
        console.error("Error fetching balances:", err);
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchBalances();

    // Set up polling
    const interval = setInterval(() => {
      fetchBalances(true); // silent fetch
    }, pollingInterval);

    // Listen for external requests to refresh balance
    const handleRefresh = () => fetchBalances(true);
    window.addEventListener("refresh-balance", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("refresh-balance", handleRefresh);
      if (balanceChangeTimeoutRef.current) {
        clearTimeout(balanceChangeTimeoutRef.current);
      }
    };
  }, [fetchBalances, pollingInterval]);

  const formatBalance = (amount: number) =>
    new Intl.NumberFormat(language === "pt" ? "pt-BR" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const getBalance = (currency: string) => {
    const balance = balances.find((b) => b.currency === currency);
    return balance ? balance.amount : 0;
  };

  const pillBase =
    "flex items-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card shadow-[0_0_24px_rgba(34,197,94,0.08)] transition-all duration-300";

  if (isLoading && balances.length === 0) {
    return (
      <div className={`${pillBase} h-11 gap-3 px-3 ${className || ""}`}>
        <div className="h-8 w-8 shrink-0 rounded-xl bg-muted animate-pulse" />
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (error && balances.length === 0) {
    return (
      <div className={`${pillBase} h-11 gap-3 px-3 ${className || ""}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <p className="text-base font-black text-primary tabular-nums">$ 0.00</p>
      </div>
    );
  }

  const usdtBalance = getBalance("USDT");

  return (
    <div className={className || ""}>
      <div
        className={`${pillBase} relative h-11 gap-3 overflow-visible px-3.5 hover:border-primary/40 hover:shadow-[0_0_32px_rgba(34,197,94,0.14)] active:scale-95 cursor-default ${
          balanceChange?.direction === "down"
            ? "border-destructive/60 bg-gradient-to-br from-destructive/20 via-card to-card shadow-[0_0_34px_rgba(239,68,68,0.22)]"
            : balanceChange?.direction === "up"
            ? "border-primary/60 shadow-[0_0_34px_rgba(34,197,94,0.22)]"
            : ""
        }`}
        aria-label={`${language === "pt" ? "Saldo disponível" : "Available balance"}: ${formatBalance(usdtBalance)} USDT`}
      >
        {balanceChange ? (
          <span
            className={`pointer-events-none absolute -top-5 right-3 rounded-full border px-2 py-0.5 text-[11px] font-black tabular-nums shadow-lg animate-in fade-in slide-in-from-bottom-1 ${
              balanceChange.direction === "down"
                ? "border-destructive/30 bg-destructive/15 text-destructive"
                : "border-primary/30 bg-primary/15 text-primary"
            }`}
          >
            {balanceChange.direction === "down" ? "-" : "+"} $
            {formatBalance(balanceChange.amount)}
          </span>
        ) : null}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${
            balanceChange?.direction === "down"
              ? "bg-destructive/15 ring-destructive/30"
              : "bg-primary/15 ring-primary/25"
          }`}
        >
          <Wallet
            className={`h-4 w-4 ${
              balanceChange?.direction === "down"
                ? "text-destructive"
                : "text-primary"
            }`}
          />
        </div>
        <div className="flex min-w-0 items-baseline gap-1.5 leading-none">
          <span
            className={`text-sm font-bold ${
              balanceChange?.direction === "down"
                ? "text-destructive/80"
                : "text-primary/80"
            }`}
          >
            $
          </span>
          <span
            className={`text-base font-black tabular-nums animate-in fade-in duration-500 ${
              balanceChange?.direction === "down"
                ? "text-destructive"
                : "text-primary"
            }`}
          >
            {formatBalance(usdtBalance)}
          </span>
        </div>
      </div>
    </div>
  );
}
