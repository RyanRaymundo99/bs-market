"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
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
import NavbarNew from "@/components/ui/navbar-new";
import { GlobalKYCBanner } from "@/components/GlobalKYCBanner";
import { WelcomeTutorial } from "@/components/ui/welcome-tutorial";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePrimaryColor } from "@/hooks/use-primary-color";
import { formatUSDT } from "../../lib/format-currency";
import { handleLogout as performLogout } from "../../lib/auth-utils";

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showBalances, setShowBalances] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [chartData, setChartData] = useState<
    Array<{ date: string; BRL: number; USDT: number }>
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

  // Check if user is authenticated
  useEffect(() => {
    const authSession = localStorage.getItem("auth-session");
    const justLoggedIn = sessionStorage.getItem("just-logged-in");

    // If user just logged in, clear the flag
    if (justLoggedIn) {
      sessionStorage.removeItem("just-logged-in");
    }

    // Only redirect to home if user is not authenticated
    if (!authSession) {
      router.replace("/");
      return;
    }

    const handlePopState = () => {
      // If user tries to go back, redirect to home instead
      if (window.location.pathname === "/login") {
        window.history.pushState(null, "", "/");
        router.replace("/");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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
      if (!isSilent) setIsLoading(true);
      // Fetch all data in parallel for faster loading
      const [userStatusResponse, balanceResponse, transactionResponse] =
        await Promise.all([
          fetch("/api/user/status", { cache: "no-store" }),
          fetch("/api/balance", { cache: "no-store" }),
          fetch("/api/transactions?limit=50", { cache: "no-store" }),
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


      // Generate chart data from previous balance to current balance
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const sixDaysAgo = new Date(today);
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
      sixDaysAgo.setHours(0, 0, 0, 0);

      // Helper function to format date as DD/MM
      const formatDate = (date: Date): string => {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        return `${day}/${month}`;
      };

      // Filter transactions from last 7 days
      const relevantTransactions = allTransactions.filter(
        (t: Transaction) => {
          const transactionDate = new Date(t.createdAt);
          return transactionDate >= sixDaysAgo && transactionDate <= today;
        }
      );

      // Calculate previous balance (6 days ago) by reversing all transactions
      let previousUsdtBalance = currentUsdtBalance;
      relevantTransactions.forEach((t: Transaction) => {
        if (t.currency === "USDT" || !t.currency) {
          // Reverse the transaction to get the balance before it
          if (t.type === "DEPOSIT" || t.type === "BUY_CRYPTO") {
            previousUsdtBalance -= Number(t.amount);
          } else if (
            t.type === "WITHDRAWAL" ||
            t.type === "WITHDRAW" ||
            t.type === "SELL"
          ) {
            previousUsdtBalance += Number(t.amount);
          }
        }
      });
      previousUsdtBalance = Math.max(0, previousUsdtBalance);

      // Group transactions by day
      const transactionsByDay: { [key: string]: Transaction[] } = {};
      relevantTransactions.forEach((t: Transaction) => {
        const transactionDate = new Date(t.createdAt);
        const dayKey = formatDate(transactionDate);
        if (!transactionsByDay[dayKey]) {
          transactionsByDay[dayKey] = [];
        }
        transactionsByDay[dayKey].push(t);
      });

      // Build chart data from previous balance to current balance
      const chartDataArray = [];
      let runningBalance = previousUsdtBalance;

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = formatDate(date);

        // Apply transactions for this day
        if (transactionsByDay[dateStr]) {
          transactionsByDay[dateStr].forEach((t: Transaction) => {
            if (t.currency === "USDT" || !t.currency) {
              if (t.type === "DEPOSIT" || t.type === "BUY_CRYPTO") {
                runningBalance += Number(t.amount);
              } else if (
                t.type === "WITHDRAWAL" ||
                t.type === "WITHDRAW" ||
                t.type === "SELL"
              ) {
                runningBalance -= Number(t.amount);
              }
            }
          });
        }

        // For the last day (today), ensure we use the actual current balance
        if (i === 0) {
          runningBalance = currentUsdtBalance;
        }

        const balanceValue = Math.max(0, runningBalance);

        chartDataArray.push({
          date: dateStr,
          BRL: 0,
          USDT: balanceValue,
        });
      }

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
      if (!isSilent) setIsLoading(false);
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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await performLogout();
    // The page will redirect, so no need to setIsLoggingOut(false)
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
        <GlobalKYCBanner />
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
          {/* Skeleton loader for balance section */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-xl animate-pulse">
              <div className="text-center">
                <div className="h-4 w-32 bg-gray-700 rounded mx-auto mb-4"></div>
                <div className="h-12 w-48 bg-gray-700 rounded mx-auto mb-2"></div>
                <div className="h-3 w-24 bg-gray-700 rounded mx-auto"></div>
              </div>
            </div>
          </div>

          {/* Skeleton loader for cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <Card
                key={i}
                className="bg-gray-900 border-gray-800 animate-pulse"
              >
                <CardHeader className="pb-2">
                  <div className="h-4 w-24 bg-gray-700 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-32 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 w-20 bg-gray-700 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Skeleton for chart */}
          <Card className="bg-gray-900 border-gray-800 mb-6 animate-pulse">
            <CardHeader>
              <div className="h-5 w-40 bg-gray-700 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-800 rounded"></div>
            </CardContent>
          </Card>

          {/* Skeleton for transactions */}
          <Card className="bg-gray-900 border-gray-800 animate-pulse">
            <CardHeader>
              <div className="h-5 w-48 bg-gray-700 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                      <div>
                        <div className="h-4 w-24 bg-gray-700 rounded mb-1"></div>
                        <div className="h-3 w-16 bg-gray-700 rounded"></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 w-20 bg-gray-700 rounded mb-1"></div>
                      <div className="h-3 w-12 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WelcomeTutorial
        isOpen={showWelcomeTutorial}
        onClose={handleWelcomeTutorialClose}
        userName={welcomeTutorialName}
      />
      <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
      <GlobalKYCBanner />

      <div
        className={`container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl ${
          isMobile ? "pb-16" : ""
        }`}
        style={
          isMobile
            ? { paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }
            : undefined
        }
      >

        {/* Main Balance Display - Centered Hero Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col items-center text-center">
            {/* Total Balance Label */}
            <p className="text-sm sm:text-base text-gray-400 mb-2">
              {t("totalBalance")}
            </p>

            {/* Balance Amount */}
            {(() => {
              const usdtBalance = balances.find((b) => b.currency === "USDT");
              const usdtAmount = usdtBalance?.amount || 0;
              return (
                <div className="flex items-center justify-center gap-2 mb-6">
                  <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white">
                    {showBalances
                      ? `U$ ${formatUSDT(usdtAmount).replace(" USDT", "")}`
                      : "U$ ••••••"}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBalances(!showBalances)}
                    className="text-white hover:bg-white/10 rounded-full w-8 h-8 sm:w-9 sm:h-9 p-0"
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

            {/* Deposits/Withdrawals Toggle */}
            <div className="relative inline-flex items-center bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-1 shadow-lg">
              <button
                onClick={() => router.push("/withdraw")}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-all text-gray-400 hover:text-white hover:bg-white/5"
              >
                {t("withdraw")}
              </button>
              <div className="h-6 w-px bg-white/10 mx-1"></div>
              <button
                onClick={() => router.push("/trade")}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-all text-gray-400 hover:text-white hover:bg-white/5"
              >
                {t("deposit")}
              </button>
            </div>
          </div>
        </div>

        {/* Balance Chart Card - lazy loaded for faster initial paint */}
        {chartData.length > 0 && (
          <Card className="mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl border-gray-800 bg-black/40 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <DashboardChart data={chartData} primaryHex={primaryHex} />
            </CardContent>
          </Card>
        )}

        {/* Category Cards - Grid Layout */}
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            {(() => {
              // Calculate category stats
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

              const categories = [
                {
                  name: t("deposit"),
                  icon: ArrowUpRight,
                  value: totalDeposits,
                  color: "text-primary",
                  bgColor: "bg-primary/10",
                  progressColor: "bg-primary",
                  count: deposits.length,
                },
                {
                  name: t("withdrawal"),
                  icon: ArrowDownRight,
                  value: totalWithdrawals,
                  color: "text-destructive",
                  bgColor: "bg-destructive/10",
                  progressColor: "bg-destructive",
                  count: withdrawals.length,
                },
                {
                  name: "Reembolso",
                  icon: RotateCcw,
                  value: totalRefunds,
                  color: "text-accent",
                  bgColor: "bg-accent/10",
                  progressColor: "bg-accent",
                  count: refunds.length,
                },
              ];

              return categories.map((category, index) => {
                const Icon = category.icon;
                const progress = (category.value / maxValue) * 100;

                return (
                  <Card
                    key={index}
                    className="rounded-xl border-border bg-card/60 backdrop-blur-sm shadow-lg"
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div
                        className={`w-12 h-12 rounded-xl ${category.bgColor} flex items-center justify-center mb-3`}
                      >
                        <Icon className={`w-6 h-6 ${category.color}`} />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-foreground mb-2">
                        {category.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {category.count}{" "}
                        {category.count === 1
                          ? language === "pt"
                            ? "transação"
                            : "transaction"
                          : language === "pt"
                          ? "transações"
                          : "transactions"}
                      </p>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${category.progressColor} transition-all duration-300`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="rounded-xl sm:rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                {t("recentActivity")}
              </CardTitle>
              {transactions.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
                >
                  {t("seeAll")} →
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.slice(0, 5).map((transaction, index) => {
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

                  return (
                    <div
                      key={transaction.id || index}
                      className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors active:bg-muted/60"
                    >
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}
                      >
                        <div className={iconColor}>{icon}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 mb-0.5">
                          <h4 className="font-medium text-foreground text-xs sm:text-sm truncate">
                            {title}
                          </h4>
                          <p
                            className={`font-semibold text-xs sm:text-sm ${amountColor} whitespace-nowrap`}
                          >
                            {prefix}
                            {formattedAmount}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
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
                      </div>
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
