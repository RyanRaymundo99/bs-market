"use client";
import React, { useState, useEffect } from "react";
import { Wallet } from "lucide-react";
import { formatUSDT, formatBRL } from "@/lib/format-currency";

interface Balance {
  currency: string;
  amount: number;
  locked: number;
}

interface BalanceDisplayProps {
  className?: string;
}

export function BalanceDisplay({ className }: BalanceDisplayProps) {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/balance");
        if (response.ok) {
          const data = await response.json();
          setBalances(data.balances || []);
        } else {
          setError("Failed to fetch balances");
        }
      } catch (err) {
        setError("Error loading balances");
        console.error("Error fetching balances:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalances();
  }, []);

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
    "flex items-center h-10 rounded-xl bg-muted/50 border border-border";

  if (isLoading) {
    return (
      <div className={`${pillBase} gap-2.5 px-3 ${className}`}>
        <div className="w-8 h-8 rounded-lg bg-muted animate-pulse shrink-0" />
        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (error || balances.length === 0) {
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
      <div className={`${pillBase} gap-2.5 px-3 hover:border-primary/30 transition-all duration-200`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-primary tabular-nums">
          {formatBalance(usdtBalance, "USDT")}
        </span>
      </div>
    </div>
  );
}
