"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  FileText,
  ChevronRight,
  Receipt,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatUSDT, formatBRL } from "@/lib/format-currency";

interface ActivitySummary {
  pendingTransactionsCount: number;
  unreadNotificationCount: number;
  recentPending: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    createdAt: string;
  }>;
  recentNotifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    metadata: unknown;
    createdAt: string;
  }>;
}

export function UserNotificationBell() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchSummary = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/user/activity-summary", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        if (!isSilent) setError(true);
      }
    } catch {
      if (!isSilent) setError(true);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch if open
    if (open) fetchSummary();
  }, [open, fetchSummary]);

  useEffect(() => {
    // Background polling every 30 seconds
    const interval = setInterval(() => {
      fetchSummary(true);
    }, 30000);

    // Refresh when balance changes
    const handleBalanceUpdate = () => fetchSummary(true);
    window.addEventListener("balance-updated", handleBalanceUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("balance-updated", handleBalanceUpdate);
    };
  }, [fetchSummary]);

  const totalBadge =
    (summary?.pendingTransactionsCount ?? 0) +
    (summary?.unreadNotificationCount ?? 0);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/user/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      fetchSummary();
    } catch {
      // ignore
    }
  };

  const formatAmount = (amount: number, currency: string) =>
    currency === "BRL" ? formatBRL(amount) : formatUSDT(amount);

  const getPendingTypeLabel = (type: string) => {
    if (type === "BUY_CRYPTO" || type === "DEPOSIT")
      return language === "pt" ? "Depósito" : "Deposit";
    if (type === "WITHDRAWAL") return language === "pt" ? "Saque" : "Withdrawal";
    return type;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-xl text-foreground/80 hover:text-primary hover:bg-muted"
          aria-label={t("activityNotifications")}
        >
          <Bell className="h-5 w-5" />
          {totalBadge > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[320px] max-w-[calc(100vw-2rem)] p-0"
        sideOffset={8}
      >
        <div className="border-b border-border px-3 py-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t("activityNotifications")}
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="default" />
          </div>
        ) : error ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {language === "pt"
              ? "Não foi possível carregar."
              : "Could not load."}
          </div>
        ) : summary ? (
          <div className="max-h-[60vh] overflow-y-auto">
            {/* Pending transactions */}
            <div className="border-b border-border p-2">
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t("pendingTransactions")}
                  {(summary.pendingTransactionsCount ?? 0) > 0 &&
                    ` (${summary.pendingTransactionsCount})`}
                </span>
                {(summary.pendingTransactionsCount ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push("/trade");
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t("viewAll")} →
                  </button>
                )}
              </div>
              {summary.recentPending.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  {t("noPending")}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {summary.recentPending.map((tx) => (
                    <li key={tx.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          router.push(
                            tx.type === "WITHDRAWAL" ? "/withdraw" : "/trade"
                          );
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/60"
                      >
                        <span className="text-foreground">
                          {getPendingTypeLabel(tx.type)} ·{" "}
                          {formatAmount(tx.amount, tx.currency)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Notifications (receipts, balance, etc.) */}
            <div className="p-2">
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {t("notifications")}
                  {(summary.unreadNotificationCount ?? 0) > 0 &&
                    ` (${summary.unreadNotificationCount})`}
                </span>
                {(summary.unreadNotificationCount ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t("markAllAsRead")}
                  </button>
                )}
              </div>
              {summary.recentNotifications.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  {t("noNotifications")}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {summary.recentNotifications.map((n) => (
                    <li key={n.id}>
                      <div
                        className={`rounded-lg px-2 py-2 text-sm ${
                          !n.read ? "bg-primary/5" : ""
                        }`}
                      >
                        <p className="font-medium text-foreground">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.message}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        {/* Footer CTA - Ver tudo page */}
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/activity");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 py-2.5 text-sm font-medium text-primary hover:bg-primary/20"
          >
            <Receipt className="h-4 w-4" />
            {t("activityPage")}
          </button>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            {t("viewReceipts")}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
