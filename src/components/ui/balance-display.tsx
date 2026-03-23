"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Wallet } from "lucide-react";
import { formatUSDT, formatBRL } from "@/lib/format-currency";

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
  const lastBalanceRef = useRef<string>("");

  const fetchBalances = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      const response = await fetch("/api/balance", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const newBalances = data.balances || [];
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
    };
  }, [fetchBalances, pollingInterval]);

  const formatBalance = (amount: number, currency: string) => {
    if (currency === "BRL") {
      return formatBRL(amount);
    }
    // USDT/crypto: show as $ (no "USDT" suffix)
    const formatted = formatUSDT(amount);
    return formatted.replace(/\s*USDT\s*$/i, "").trim().replace(/^/, "$ ");
  };

  const getBalance = (currency: string) => {
    const balance = balances.find((b) => b.currency === currency);
    return balance ? balance.amount : 0;
  };

  const pillBase =
    "flex items-center h-10 rounded-xl bg-muted/50 border border-border transition-all duration-300";

  if (isLoading && balances.length === 0) {
    return (
      <div className={`${pillBase} gap-2.5 px-3 ${className}`}>
        <div className="w-8 h-8 rounded-lg bg-muted animate-pulse shrink-0" />
        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (error && balances.length === 0) {
    return (
      <div className={`${pillBase} gap-2.5 px-3 ${className}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-primary tabular-nums">$ 0</span>
      </div>
    );
  }

  const usdtBalance = getBalance("USDT");

  return (
    <div className={`${className}`}>
      <div className={`${pillBase} gap-2.5 px-3 hover:border-primary/30 active:scale-95 cursor-pointer`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-primary tabular-nums animate-in fade-in duration-500">
          {formatBalance(usdtBalance, "USDT")}
        </span>
      </div>
    </div>
  );
}
