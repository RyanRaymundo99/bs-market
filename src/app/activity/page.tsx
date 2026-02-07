"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  FileText,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import NavbarNew from "@/components/ui/navbar-new";
import { PageLoader, Spinner } from "@/components/ui/loading";
import { GlobalKYCBanner } from "@/components/GlobalKYCBanner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMobileMenuOpen } from "@/hooks/useMobileMenuOpen";
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

export default function ActivityPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const mobileMenuOpen = useMobileMenuOpen();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      localStorage.removeItem("auth-session");
      localStorage.removeItem("user");
      sessionStorage.clear();
      window.location.href = "/";
    } catch {
      localStorage.removeItem("auth-session");
      localStorage.removeItem("user");
      sessionStorage.clear();
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        "/api/user/activity-summary?pendingLimit=50&notificationLimit=50"
      );
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    try {
      await fetch("/api/user/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      fetchSummary();
    } catch {
      // ignore
    } finally {
      setMarkingRead(false);
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(
      language === "pt" ? "pt-BR" : "en-US",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-background">
        <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
        <GlobalKYCBanner />
        <div className="container mx-auto px-4 py-8">
          <PageLoader
            message={
              language === "pt"
                ? "Carregando atividade..."
                : "Loading activity..."
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
      <GlobalKYCBanner />
      <div
        className={`container mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6 ${
          mobileMenuOpen ? "pb-8" : ""
        }`}
      >
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("activityPage")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("viewReceipts")}
          </p>
        </div>

        {error ? (
          <Card className="border-border bg-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              {language === "pt"
                ? "Não foi possível carregar. Tente novamente."
                : "Could not load. Please try again."}
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fetchSummary()}
              >
                {language === "pt" ? "Tentar de novo" : "Retry"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Pending transactions */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Clock className="h-5 w-5 text-primary" />
                  {t("pendingTransactions")}
                  {summary && summary.pendingTransactionsCount > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      ({summary.pendingTransactionsCount})
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {language === "pt"
                    ? "Depósitos e saques aguardando confirmação"
                    : "Deposits and withdrawals awaiting confirmation"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summary?.recentPending.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {t("noPending")}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {summary?.recentPending.map((tx) => (
                      <li key={tx.id}>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              tx.type === "WITHDRAWAL" ? "/withdraw" : "/trade"
                            )
                          }
                          className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-3">
                            {tx.type === "WITHDRAWAL" ? (
                              <ArrowDownRight className="h-5 w-5 text-destructive" />
                            ) : (
                              <ArrowUpRight className="h-5 w-5 text-primary" />
                            )}
                            <div>
                              <p className="font-medium text-foreground">
                                {getPendingTypeLabel(tx.type)} ·{" "}
                                {formatAmount(tx.amount, tx.currency)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(tx.createdAt)}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {summary && summary.pendingTransactionsCount > 0 && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/trade")}
                    >
                      {language === "pt" ? "Depositar" : "Deposit"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/withdraw")}
                    >
                      {language === "pt" ? "Sacar" : "Withdraw"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <FileText className="h-5 w-5 text-primary" />
                      {t("notifications")}
                      {summary && summary.unreadNotificationCount > 0 && (
                        <span className="text-sm font-normal text-muted-foreground">
                          ({summary.unreadNotificationCount}{" "}
                          {language === "pt" ? "não lidas" : "unread"})
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {language === "pt"
                        ? "Recibos e avisos da sua conta"
                        : "Receipts and account notices"}
                    </CardDescription>
                  </div>
                  {summary && summary.unreadNotificationCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllRead}
                      disabled={markingRead}
                      className="text-primary"
                    >
                      {markingRead ? (
                        <Spinner size="sm" />
                      ) : (
                        t("markAllAsRead")
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {summary?.recentNotifications.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {t("noNotifications")}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {summary?.recentNotifications.map((n) => (
                      <li
                        key={n.id}
                        className={`rounded-lg border px-4 py-3 ${
                          !n.read
                            ? "border-primary/30 bg-primary/5"
                            : "border-border bg-muted/20"
                        }`}
                      >
                        <p className="font-medium text-foreground">{n.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {n.message}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(n.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                onClick={() => router.push("/dashboard")}
                className="min-w-[200px]"
              >
                {t("dashboard")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
