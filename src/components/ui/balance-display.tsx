"use client";
import React, { useEffect, useRef, useState } from "react";
import { Wallet } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWalletBalances } from "@/contexts/BalanceContext";

interface BalanceDisplayProps {
  className?: string;
  compact?: boolean;
}

export function BalanceDisplay({
  className,
  compact = false,
}: BalanceDisplayProps) {
  const { balances, isLoading, error } = useWalletBalances();
  const { language } = useLanguage();
  const [balanceChange, setBalanceChange] = useState<{
    direction: "up" | "down";
    amount: number;
  } | null>(null);
  const previousUsdtBalanceRef = useRef<number | null>(null);
  const balanceChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    const nextUsdtBalance =
      balances.find((b) => b.currency === "USDT")?.amount ?? 0;
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
  }, [balances]);

  useEffect(() => {
    return () => {
      if (balanceChangeTimeoutRef.current) {
        clearTimeout(balanceChangeTimeoutRef.current);
      }
    };
  }, []);

  const formatBalance = (amount: number) =>
    new Intl.NumberFormat(language === "pt" ? "pt-BR" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const getBalance = (currency: string) => {
    const balance = balances.find((b) => b.currency === currency);
    return balance ? balance.amount : 0;
  };

  const pillBase = compact
    ? "flex items-center rounded-xl border border-white/10 bg-white/[0.04] transition-colors duration-200"
    : "flex items-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card shadow-[0_0_24px_rgba(34,197,94,0.08)] transition-all duration-300";
  const pillSize = compact ? "h-10 gap-2 px-2.5" : "h-11 gap-3 px-3.5";
  const iconBoxSize = compact ? "h-7 w-7" : "h-8 w-8";
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const amountSize = compact ? "text-sm font-semibold" : "text-base";
  const currencySize = compact ? "text-xs" : "text-sm";

  if (isLoading && balances.length === 0) {
    return (
      <div className={`${pillBase} ${pillSize} ${className || ""}`}>
        <div className={`${iconBoxSize} shrink-0 rounded-xl bg-muted animate-pulse`} />
        <div className={`${compact ? "h-3.5 w-16" : "h-4 w-24"} rounded bg-muted animate-pulse`} />
      </div>
    );
  }

  if (error && balances.length === 0) {
    return (
      <div className={`${pillBase} ${pillSize} ${className || ""}`}>
        <div
          className={`flex ${iconBoxSize} shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20`}
        >
          <Wallet className={`${iconSize} text-primary`} />
        </div>
        <p className={`${amountSize} font-black text-primary tabular-nums`}>$ 0.00</p>
      </div>
    );
  }

  const usdtBalance = getBalance("USDT");

  return (
    <div className={className || ""}>
      <div
        className={`${pillBase} relative ${pillSize} overflow-visible ${
          compact
            ? ""
            : "hover:border-primary/40 hover:shadow-[0_0_32px_rgba(34,197,94,0.14)] active:scale-95 cursor-default"
        } ${
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
          className={`flex ${iconBoxSize} shrink-0 items-center justify-center rounded-lg ring-1 ${
            compact
              ? "bg-primary/10 ring-primary/20"
              : balanceChange?.direction === "down"
                ? "bg-destructive/15 ring-destructive/30"
                : "bg-primary/15 ring-primary/25"
          }`}
        >
          <Wallet
            className={`${iconSize} ${
              balanceChange?.direction === "down"
                ? "text-destructive"
                : "text-primary"
            }`}
          />
        </div>
        <div className="flex min-w-0 items-baseline gap-1 leading-none">
          <span
            className={`${currencySize} font-bold ${
              balanceChange?.direction === "down"
                ? "text-destructive/80"
                : "text-primary/80"
            }`}
          >
            $
          </span>
          <span
            className={`${amountSize} font-black tabular-nums animate-in fade-in duration-500 ${
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
