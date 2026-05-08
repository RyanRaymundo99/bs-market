"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  TrendingDown,
  ArrowUpRight,
  Eye,
  EyeOff,
  RotateCcw,
  Clock,
  Wallet,
  ArrowDownRight,
  ArrowRight,
  Home,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMobileMenuOpen } from "@/hooks/useMobileMenuOpen";
import { DESKTOP_SHELL_PL } from "@/constants/layout-shell";
import { WelcomeTutorial } from "@/components/ui/welcome-tutorial";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePrimaryColor } from "@/hooks/use-primary-color";
import { formatUSDT } from "../../lib/format-currency";
import {
  buildUsdtBalanceSeries,
  getUsdtChartDaySpan,
} from "@/lib/dashboard-balance-series";

const DashboardChart = dynamic(
  () =>
    import("./DashboardChart").then((m) => ({ default: m.DashboardChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 sm:h-80 w-full rounded-xl bg-muted animate-pulse" />
    ),
  }
);

/** How many transactions to show on the dashboard (grid fits up to 5 per row on xl). */
const DASHBOARD_RECENT_ACTIVITY_PREVIEW = 10;

interface Balance {
  currency: string;
  amount: number;
  locked: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface UserStatus {
  id: string;
  name: string;
  email: string;
  approvalStatus: string;
  kycStatus: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  kycRejectionReason: string | null;
}



export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showBalances, setShowBalances] = useState(true);
  /** First non-silent fetch finished — show real values vs inline skeletons */
  const [dashboardReady, setDashboardReady] = useState(false);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [chartData, setChartData] = useState<
    Array<{ date: string; BRL: number; USDT: number; timestamp: number }>
  >([]);

  const [isMobile, setIsMobile] = useState(false);
  const mobileMenuOpen = useMobileMenuOpen();
  const primaryHex = usePrimaryColor();
  const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false);
  const [welcomeTutorialName, setWelcomeTutorialName] = useState("");

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth <= 768
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Show welcome tutorial after signup redirect (pre-load dashboard then show tutorial)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const show = sessionStorage.getItem("show-welcome-tutorial");
    const name = sessionStorage.getItem("welcome-tutorial-name") || "";
    if (show === "1") {
      setShowWelcomeTutorial(true);
      setWelcomeTutorialName(name);
    }
  }, []);

  const handleWelcomeTutorialClose = () => {
    sessionStorage.removeItem("show-welcome-tutorial");
    sessionStorage.removeItem("welcome-tutorial-name");
    setShowWelcomeTutorial(false);
  };

  // Check authentication: rely on cookie session (better-auth); keep localStorage in sync for legacy code
  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem("just-logged-in");
    if (justLoggedIn) {
      sessionStorage.removeItem("just-logged-in");
    }

    let cancelled = false;

    const gateSession = async () => {
      try {
        const res = await fetch("/api/auth/validate-session", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json()) as { authenticated?: boolean };
        if (cancelled) return;
        if (data.authenticated) {
          try {
            localStorage.setItem("auth-session", "true");
          } catch {
            /* quota / blocked storage — cookie session still holds */
          }
          return;
        }
        try {
          localStorage.removeItem("auth-session");
          localStorage.removeItem("auth-user");
        } catch {
          /* ignore */
        }
        router.replace("/");
      } catch {
        if (cancelled) return;
        // Offline or transient failure: legacy flag avoids booting logged-in users
        if (!localStorage.getItem("auth-session")) {
          router.replace("/");
        }
      }
    };

    void gateSession();

    const handlePopState = () => {
      // If user tries to go back, redirect to home instead
      if (window.location.pathname === "/login") {
        window.history.pushState(null, "", "/");
        router.replace("/");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  // Format currency in Brazilian Real
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Check if user is rejected and logout if so
  useEffect(() => {
    const checkAndLogoutIfRejected = async () => {
      if (userStatus?.approvalStatus === "REJECTED") {
        try {
          // Call logout API
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });

          // Clear local storage
          localStorage.removeItem("auth-session");
          localStorage.removeItem("user");
          sessionStorage.clear();

          // Show rejection message and redirect to home
          const message =
            language === "pt"
              ? "Sua conta foi rejeitada. Entre em contato com o suporte."
              : "Your account has been rejected. Please contact support.";

          // Store rejection message in sessionStorage to show on home page
          sessionStorage.setItem("rejectionMessage", message);

          // Redirect to home page
          window.location.href = "/";
        } catch (error) {
          console.error("Error during logout:", error);
          // Even if logout fails, clear storage and redirect
          localStorage.removeItem("auth-session");
          localStorage.removeItem("user");
          sessionStorage.clear();
          sessionStorage.setItem(
            "rejectionMessage",
            language === "pt"
              ? "Sua conta foi rejeitada. Entre em contato com o suporte."
              : "Your account has been rejected. Please contact support."
          );
          window.location.href = "/";
        }
      }
    };

    checkAndLogoutIfRejected();
  }, [userStatus, language]);


  // Fetch user data - OPTIMIZED: parallel API calls
  const fetchData = useCallback(async (isSilent = false) => {
    try {
      // Fetch all data in parallel for faster loading
      const [userStatusResponse, balanceResponse, transactionResponse] =
        await Promise.all([
          fetch("/api/user/status", { cache: "no-store" }),
          fetch("/api/balance", { cache: "no-store" }),
          fetch("/api/transactions?limit=300", { cache: "no-store" }),
        ]);

      // Process user status
      let currentUserStatus = null;
      if (userStatusResponse.ok) {
        const userStatusData = await userStatusResponse.json();
        currentUserStatus = userStatusData.user;
        setUserStatus(currentUserStatus);
      }

      // Process balances
      let currentUsdtBalance = 0;
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalances(balanceData.balances || []);



        currentUsdtBalance =
          balanceData.balances?.find((b: Balance) => b.currency === "USDT")
            ?.amount || 0;
      }

      // Process transactions
      let allTransactions: Transaction[] = [];
      if (transactionResponse.ok) {
        const transactionData = await transactionResponse.json();
        allTransactions = transactionData.transactions || [];
        setTransactions(allTransactions);
      }


      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const spanDays = getUsdtChartDaySpan(allTransactions);
      const chartDataArray = buildUsdtBalanceSeries(
        allTransactions,
        currentUsdtBalance,
        today,
        spanDays
      );

      setChartData(chartDataArray);


    } catch (error) {
      console.error("Failed to fetch data:", error);
      if (!isSilent) {
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados do dashboard.",
          variant: "destructive",
        });
      }
    } finally {
      if (!isSilent) setDashboardReady(true);
    }
  }, [toast]);

  // Initial load and background polling setup
  useEffect(() => {
    fetchData();

    // Constant background polling for data freshness
    const interval = setInterval(() => {
      fetchData(true);
    }, 20000);

    // Listen for manual balance updates (e.g. from payments)
    const handleBalanceUpdate = () => fetchData(true);
    window.addEventListener("balance-updated", handleBalanceUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("balance-updated", handleBalanceUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categorySummary = useMemo(() => {
    const deposits = transactions.filter(
      (t) => t.type === "DEPOSIT" || t.type === "BUY_CRYPTO"
    );
    const withdrawals = transactions.filter(
      (t) => t.type === "WITHDRAWAL" || t.type === "WITHDRAW"
    );
    const refunds = transactions.filter((t) => t.type === "REFUND");

    const totalDeposits = deposits.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );
    const totalWithdrawals = withdrawals.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );
    const totalRefunds = refunds.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    const maxValue = Math.max(
      totalDeposits,
      totalWithdrawals,
      totalRefunds,
      1
    );

    const txWord = (n: number) =>
      n === 1
        ? language === "pt"
          ? "transação"
          : "transaction"
        : language === "pt"
        ? "transações"
        : "transactions";

    const categories = [
      {
        name: t("deposit"),
        icon: ArrowUpRight,
        value: totalDeposits,
        bgColor: "bg-primary/15",
        iconColor: "text-primary",
        progressColor: "bg-primary",
        count: deposits.length,
      },
      {
        name: t("withdrawal"),
        icon: ArrowDownRight,
        value: totalWithdrawals,
        bgColor: "bg-destructive/15",
        iconColor: "text-destructive",
        progressColor: "bg-destructive",
        count: withdrawals.length,
      },
      {
        name: language === "pt" ? "Reembolso" : "Refund",
        icon: RotateCcw,
        value: totalRefunds,
        bgColor: "bg-accent/15",
        iconColor: "text-accent",
        progressColor: "bg-accent",
        count: refunds.length,
      },
    ].map((c) => ({
      ...c,
      progressPct: Math.min((c.value / maxValue) * 100, 100),
      txLabel: `${c.count} ${txWord(c.count)}`,
    }));

    return { categories };
  }, [transactions, t, language]);

  return (
    <div
      className={`min-h-screen bg-background text-foreground ${DESKTOP_SHELL_PL}`}
    >
      <WelcomeTutorial
        isOpen={showWelcomeTutorial}
        onClose={handleWelcomeTutorialClose}
        userName={welcomeTutorialName}
      />

      <div
        className={`mx-auto w-full max-w-[1800px] px-3 sm:px-5 xl:px-8 py-4 sm:py-6 ${
          isMobile ? "pb-16" : ""
        }`}
        style={
          isMobile
            ? { paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }
            : undefined
        }
      >

        {/* Header: balance first (left), category stats (right) */}
        <header
          className="mb-6 sm:mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8"
          aria-label={language === "pt" ? "Resumo do painel" : "Dashboard summary"}
        >
          <div className="flex min-w-0 flex-col gap-3 border-b border-white/10 pb-4 lg:max-w-[min(100%,42rem)] lg:flex-row lg:items-center lg:gap-5 lg:border-b-0 lg:border-r lg:border-white/10 lg:pb-0 lg:pr-8">
            {(() => {
              const usdtBalance = balances.find((b) => b.currency === "USDT");
              const usdtAmount = usdtBalance?.amount || 0;
              if (!dashboardReady) {
                return (
                  <div
                    className="flex items-center gap-2"
                    role="status"
                    aria-busy
                    aria-label={
                      language === "pt" ? "Carregando saldo" : "Loading balance"
                    }
                  >
                    <span className="inline-block h-9 w-36 max-w-[70vw] rounded-xl bg-white/10 animate-pulse sm:h-10 sm:w-44" />
                  </div>
                );
              }
              return (
                <div className="flex items-center gap-2">
                  <h2
                    className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl"
                    aria-label={
                      showBalances
                        ? `${t("totalBalance")}, ${formatUSDT(usdtAmount)}`
                        : language === "pt"
                        ? `${t("totalBalance")}, oculto`
                        : `${t("totalBalance")}, hidden`
                    }
                  >
                    {showBalances
                      ? `U$ ${formatUSDT(usdtAmount).replace(" USDT", "")}`
                      : "U$ ••••••"}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBalances(!showBalances)}
                    className="text-white hover:bg-white/10 rounded-full w-8 h-8 sm:w-9 sm:h-9 p-0 shrink-0"
                    aria-pressed={showBalances}
                  >
                    {showBalances ? (
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </Button>
                </div>
              );
            })()}

            <div className="relative inline-flex w-full max-w-md items-center rounded-xl border border-white/10 bg-black/40 p-1 shadow-lg backdrop-blur-sm lg:w-auto lg:max-w-none lg:shrink-0">
              <button
                type="button"
                onClick={() => router.push("/withdraw")}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-all hover:bg-white/5 hover:text-white sm:flex-none sm:px-6"
              >
                {t("withdraw")}
              </button>
              <div className="h-6 w-px shrink-0 bg-white/10" />
              <button
                type="button"
                onClick={() => router.push("/trade")}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-all hover:bg-white/5 hover:text-white sm:flex-none sm:px-6"
              >
                {t("deposit")}
              </button>
            </div>
          </div>

          <div
            className="flex min-w-0 flex-1 flex-nowrap items-stretch justify-start gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-end sm:overflow-visible [&::-webkit-scrollbar]:hidden lg:justify-end"
          >
            {!dashboardReady
              ? [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex w-[7.75rem] shrink-0 flex-col gap-2 sm:w-auto"
                    aria-hidden
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-white/10 animate-pulse" />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="h-3.5 w-16 rounded bg-white/10 animate-pulse" />
                        <div className="h-2.5 w-20 rounded bg-white/10 animate-pulse" />
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-white/5">
                      <div className="hidden h-full w-1/3 rounded-full bg-white/10 sm:block" />
                    </div>
                  </div>
                ))
              : categorySummary.categories.map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <div
                      key={index}
                      className="flex w-[7.75rem] shrink-0 flex-col gap-2 sm:w-[9.5rem]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${category.bgColor}`}
                        >
                          <Icon className={`h-4 w-4 ${category.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight text-foreground">
                            {category.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground sm:text-xs">
                            {category.txLabel}
                          </p>
                        </div>
                      </div>
                      <div className="h-1 w-full rounded-full bg-muted/80 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${category.progressColor} transition-all duration-300`}
                          style={{ width: `${category.progressPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
          </div>
        </header>

        {/* Balance chart — skeleton until first fetch; then show chart if there is series data */}
        {!dashboardReady ? (
          <Card className="mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl border-gray-800 bg-black/40 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div
                className="h-64 sm:h-80 w-full rounded-xl bg-white/5 animate-pulse"
                aria-hidden
              />
            </CardContent>
          </Card>
        ) : chartData.length > 0 ? (
          <Card className="mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl border-gray-800 bg-black/40 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <DashboardChart
                data={chartData}
                primaryHex={primaryHex}
                t={t}
                language={language}
              />
            </CardContent>
          </Card>
        ) : null}

        {/* Recent Activity */}
        <Card className="rounded-xl sm:rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                {t("recentActivity")}
              </CardTitle>
              {dashboardReady &&
                transactions.length > DASHBOARD_RECENT_ACTIVITY_PREVIEW && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
                  asChild
                >
                  <Link href="/activity">
                    {t("seeAll")} →
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {!dashboardReady ? (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3"
                role="status"
                aria-busy
                aria-label={
                  language === "pt"
                    ? "Carregando atividade"
                    : "Loading activity"
                }
              >
                {Array.from({ length: DASHBOARD_RECENT_ACTIVITY_PREVIEW }).map(
                  (_, i) => (
                    <div
                      key={i}
                      className="flex min-h-[6.5rem] flex-col gap-2 rounded-lg sm:rounded-xl bg-muted/30 p-2.5 sm:p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="h-8 w-8 rounded-lg bg-muted animate-pulse shrink-0" />
                        <div className="h-4 w-14 rounded bg-muted animate-pulse" />
                      </div>
                      <div className="h-3.5 w-[70%] rounded bg-muted animate-pulse" />
                      <div className="mt-auto flex gap-2">
                        <div className="h-2.5 w-16 rounded bg-muted animate-pulse" />
                        <div className="h-2.5 w-12 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : transactions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                {transactions
                  .slice(0, DASHBOARD_RECENT_ACTIVITY_PREVIEW)
                  .map((transaction, index) => {
                  const date = new Date(transaction.createdAt);
                  const time = date.toLocaleTimeString(
                    language === "pt" ? "pt-BR" : "en-US",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  );
                  const dateStr = date.toLocaleDateString(
                    language === "pt" ? "pt-BR" : "en-US",
                    {
                      day: "2-digit",
                      month: "2-digit",
                    }
                  );

                  let icon = <ArrowUpRight className="w-4 h-4" />;
                  let bgColor = "bg-primary/10";
                  let iconColor = "text-primary";
                  let title = "";
                  let amountColor = "text-primary";
                  let prefix = "+";

                  const formattedAmount =
                    transaction.currency === "BRL"
                      ? formatCurrency(transaction.amount)
                      : formatUSDT(transaction.amount).replace(
                          " USDT",
                          ` ${transaction.currency || "USDT"}`
                        );

                  if (
                    transaction.type === "DEPOSIT" ||
                    transaction.type === "BUY_CRYPTO"
                  ) {
                    icon = <ArrowUpRight className="w-4 h-4" />;
                    bgColor = "bg-primary/10";
                    iconColor = "text-primary";
                    amountColor = "text-primary";
                    title =
                      transaction.type === "BUY_CRYPTO"
                        ? t("buyUSDTTransaction")
                        : t("deposit");
                    prefix = "+";
                  } else if (
                    transaction.type === "WITHDRAWAL" ||
                    transaction.type === "WITHDRAW"
                  ) {
                    icon = <ArrowDownRight className="w-4 h-4" />;
                    bgColor = "bg-destructive/10";
                    iconColor = "text-destructive";
                    amountColor = "text-destructive";
                    title = t("withdrawal");
                    prefix = "-";
                  } else if (transaction.type === "SELL") {
                    icon = <TrendingDown className="w-4 h-4" />;
                    bgColor = "bg-orange-500/10";
                    iconColor = "text-orange-400";
                    amountColor = "text-orange-400";
                    title = t("sell");
                    prefix = "-";
                  } else {
                    title = transaction.type;
                  }

                  const tileClass =
                    "flex h-full min-h-[6.5rem] flex-col gap-2 rounded-lg sm:rounded-xl bg-muted/30 p-2.5 sm:p-3 transition-colors hover:bg-muted/50 active:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-foreground no-underline [color:inherit]";

                  const tileInner = (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl ${bgColor}`}
                        >
                          <div className={iconColor}>{icon}</div>
                        </div>
                        <p
                          className={`text-right text-xs font-semibold tabular-nums ${amountColor} shrink-0 leading-tight`}
                        >
                          {prefix}
                          {formattedAmount}
                        </p>
                      </div>
                      <h4 className="line-clamp-2 text-xs font-medium leading-snug text-foreground sm:text-sm">
                        {title}
                      </h4>
                      <div className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <p className="text-[10px] text-muted-foreground sm:text-xs">
                          {dateStr} {language === "pt" ? "às" : "at"} {time}
                        </p>
                        {transaction.status && (
                          <span
                            className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded ${
                              transaction.status === "COMPLETED" ||
                              transaction.status === "APPROVED" ||
                              transaction.status === "CONFIRMED"
                                ? "bg-primary/20 text-primary"
                                : transaction.status === "PENDING" ||
                                  transaction.status === "Pendente"
                                ? "bg-warning/20 text-warning"
                                : transaction.status === "FAILED" ||
                                  transaction.status === "REJECTED"
                                ? "bg-destructive/20 text-destructive"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {transaction.status === "PENDING"
                              ? language === "pt"
                                ? "Pendente"
                                : "Pending"
                              : transaction.status === "COMPLETED"
                              ? language === "pt"
                                ? "Concluído"
                                : "Completed"
                              : transaction.status === "APPROVED"
                              ? language === "pt"
                                ? "Aprovado"
                                : "Approved"
                              : transaction.status === "FAILED"
                              ? language === "pt"
                                ? "Falhou"
                                : "Failed"
                              : transaction.status}
                          </span>
                        )}
                      </div>
                    </>
                  );

                  return transaction.id ? (
                    <Link
                      key={transaction.id}
                      href={`/transaction/${transaction.id}`}
                      prefetch
                      className={tileClass}
                    >
                      {tileInner}
                    </Link>
                  ) : (
                    <div key={index} className={tileClass}>
                      {tileInner}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <Wallet className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  Nenhuma transação recente
                </p>
                <Button
                  onClick={() => router.push("/trade")}
                  className="h-10 sm:h-11 text-sm sm:text-base"
                >
                  {t("makeFirstPurchase")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile Page Indicator - Bottom Navigation (hidden when mobile menu is open) */}
      {isMobile && !mobileMenuOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
        >
          <div className="flex justify-center pb-2 px-4">
            <div className="relative inline-flex items-center bg-card/95 backdrop-blur-sm border border-border rounded-full px-1 py-1.5 shadow-lg">
              <button
                onClick={() => router.push("/trade")}
                className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation ${
                  pathname === "/trade"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground active:bg-muted"
                }`}
                style={{ minWidth: "44px", minHeight: "44px" }}
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>

              <button
                onClick={() => router.push("/dashboard")}
                className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation ${
                  pathname === "/dashboard"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground active:bg-muted"
                }`}
                style={{ minWidth: "44px", minHeight: "44px" }}
              >
                <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>

              <button
                onClick={() => router.push("/withdraw")}
                className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation ${
                  pathname === "/withdraw"
                    ? "bg-destructive text-destructive-foreground"
                    : "text-muted-foreground hover:text-foreground active:bg-muted"
                }`}
                style={{ minWidth: "44px", minHeight: "44px" }}
              >
                <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
