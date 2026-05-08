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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatUSDT, formatBRL } from "@/lib/format-currency";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

type NotificationItem = ActivitySummary["recentNotifications"][number];

function getNotificationMetadata(
  metadata: unknown
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return metadata as Record<string, unknown>;
}

export type UserNotificationBellProps = {
  triggerClassName?: string;
  iconClassName?: string;
};

export function UserNotificationBell({
  triggerClassName,
  iconClassName,
}: UserNotificationBellProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null);

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
    fetchSummary(true);

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

  useEffect(() => {
    const rejectionNotification = summary?.recentNotifications.find(
      (notification) =>
        notification.type === "withdrawal_rejected" && !notification.read
    );

    if (!rejectionNotification) return;

    const storageKey = `shown-notification-${rejectionNotification.id}`;
    if (sessionStorage.getItem(storageKey)) return;

    sessionStorage.setItem(storageKey, "true");
    toast({
      title: rejectionNotification.title,
      description: rejectionNotification.message,
      variant: "destructive",
      duration: 12000,
    });
  }, [summary, toast]);

  const unreadBadge = summary?.unreadNotificationCount ?? 0;

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

  const handleOpenNotification = async (notification: NotificationItem) => {
    setSelectedNotification(notification);
    setOpen(false);

    if (notification.read) return;

    setSummary((current) => {
      if (!current) return current;

      return {
        ...current,
        unreadNotificationCount: Math.max(
          0,
          current.unreadNotificationCount - 1
        ),
        recentNotifications: current.recentNotifications.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item
        ),
      };
    });

    try {
      await fetch("/api/user/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notification.id }),
      });
    } catch {
      fetchSummary(true);
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

  const selectedMetadata = getNotificationMetadata(
    selectedNotification?.metadata
  );

  return (
    <>
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-10 w-10 shrink-0 rounded-xl text-foreground/80 hover:bg-muted hover:text-primary",
            triggerClassName
          )}
          aria-label={t("activityNotifications")}
        >
          <Bell className={cn("h-5 w-5", iconClassName)} />
          {unreadBadge > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadBadge > 99 ? "99+" : unreadBadge}
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
                      <button
                        type="button"
                        onClick={() => handleOpenNotification(n)}
                        className={`w-full rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/60 ${
                          !n.read ? "bg-primary/5 ring-1 ring-primary/10" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-foreground">
                            {n.title}
                          </p>
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.message}
                        </p>
                      </button>
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
    <Dialog
      open={Boolean(selectedNotification)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setSelectedNotification(null);
      }}
    >
      <DialogContent className="max-w-md border-border bg-card text-foreground">
        {selectedNotification ? (
          <>
            <DialogHeader>
              <DialogTitle>{selectedNotification.title}</DialogTitle>
              <DialogDescription>
                {new Date(selectedNotification.createdAt).toLocaleString(
                  language === "pt" ? "pt-BR" : "en-US"
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {selectedNotification.message}
                </p>
              </div>

              {Boolean(
                selectedMetadata && typeof selectedMetadata.reason === "string"
              ) && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                      {language === "pt" ? "Motivo" : "Reason"}
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {String(selectedMetadata?.reason)}
                    </p>
                  </div>
                )}

              {Boolean(
                selectedMetadata?.refundAmount ||
                  selectedMetadata?.refundCurrency
              ) && (
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === "pt" ? "Reembolso" : "Refund"}
                    </p>
                    <p className="font-semibold text-foreground">
                      {typeof selectedMetadata?.refundAmount === "number"
                        ? selectedMetadata.refundAmount.toLocaleString(
                            language === "pt" ? "pt-BR" : "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === "pt" ? "Moeda" : "Currency"}
                    </p>
                    <p className="font-semibold text-foreground">
                      {String(selectedMetadata?.refundCurrency ?? "-")}
                    </p>
                  </div>
                </div>
              )}

              {Boolean(selectedMetadata?.transactionId) && (
                <div className="rounded-lg bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    ID da transação
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-foreground">
                    {String(selectedMetadata?.transactionId)}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
    </>
  );
}
