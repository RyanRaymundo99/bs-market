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
  const [userName, setUserName] = useState<string | null>(null);

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

    const fetchUserName = async () => {
      try {
        const response = await fetch("/api/user/status");
        if (response.ok) {
          const data = await response.json();
          setUserName(data.user?.name || null);
        }
      } catch (err) {
        console.error("Error fetching user name:", err);
      }
    };

    fetchBalances();
    fetchUserName();
  }, []);

  const formatBalance = (amount: number, currency: string) => {
    if (currency === "BRL") {
      return formatBRL(amount);
    } else {
      // For USDT and other cryptos
      return formatUSDT(amount);
    }
  };

  const getBalance = (currency: string) => {
    const balance = balances.find((b) => b.currency === currency);
    return balance ? balance.amount : 0;
  };

  // Extract first name from full name
  const getFirstName = (fullName: string | null) => {
    if (!fullName) return null;
    return fullName.split(" ")[0];
  };

  const firstName = getFirstName(userName);

  if (isLoading) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white/70 ${className}`}
      >
        <Wallet className="w-4 h-4 animate-pulse" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (error || balances.length === 0) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-300 ${className}`}
      >
        <Wallet className="w-4 h-4" />
        <span className="text-sm">No balance</span>
      </div>
    );
  }

  const usdtBalance = getBalance("USDT");

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
        <Wallet className="w-4 h-4 text-brand-300" />
        {firstName && (
          <span className="text-sm font-medium">{firstName}</span>
        )}
        <span className="text-sm font-semibold text-brand-300">
          {formatBalance(usdtBalance, "USDT")}
        </span>
      </div>
    </div>
  );
}
