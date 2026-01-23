"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TrendingDown,
  Bitcoin,
  ArrowUpRight,
  Eye,
  EyeOff,
  RefreshCw,
  Globe,
  Clock,
  Wallet,
  TrendingUp,
  ArrowDownRight,
  Activity,
  DollarSign,
  ArrowRight,
  CheckCircle,
  Users,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import NavbarNew from "@/components/ui/navbar-new";
import KYCBanner from "@/components/ui/kyc-banner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}

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

interface Deposit {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([]);
  const [showBalances, setShowBalances] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [latestDeposit, setLatestDeposit] = useState<Deposit | null>(null);
  const [latestWithdrawal, setLatestWithdrawal] = useState<Withdrawal | null>(
    null
  );
  const [showKYCBanner, setShowKYCBanner] = useState(true);
  const [chartData, setChartData] = useState<
    Array<{ date: string; BRL: number; USDT: number }>
  >([]);

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

    // Prevent back navigation to login page
    const handlePopState = (event: PopStateEvent) => {
      // If user tries to go back, redirect to home instead
      if (window.location.pathname === "/login") {
        window.history.pushState(null, "", "/");
        router.replace("/");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router]);

  // Check if redirected from KYC submission
  useEffect(() => {
    const kycParam = searchParams.get("kyc");
    if (kycParam === "pending") {
      // Show banner if redirected from KYC submission
      setShowKYCBanner(true);
    }
  }, [searchParams]);

  // Check if APPROVED banner was already dismissed for this user
  useEffect(() => {
    if (userStatus?.id && userStatus?.kycStatus === "APPROVED") {
      const dismissedKey = `kyc-approved-banner-dismissed-${userStatus.id}`;
      const wasDismissed = localStorage.getItem(dismissedKey) === "true";
      if (wasDismissed) {
        setShowKYCBanner(false);
      } else {
        setShowKYCBanner(true);
      }
    } else if (userStatus?.kycStatus === "PENDING") {
      // For PENDING, always show banner (permanent)
      setShowKYCBanner(true);
    } else if (userStatus?.kycStatus && userStatus.kycStatus !== "APPROVED") {
      // For REJECTED, show banner normally
      setShowKYCBanner(true);
    }
  }, [userStatus]);

  // Handler to dismiss banner and save to localStorage with user ID
  const handleDismissKYCBanner = () => {
    if (userStatus?.id && userStatus?.kycStatus === "APPROVED") {
      // For APPROVED status, mark as dismissed permanently for this user
      const dismissedKey = `kyc-approved-banner-dismissed-${userStatus.id}`;
      localStorage.setItem(dismissedKey, "true");
      setShowKYCBanner(false);
    } else if (userStatus?.kycStatus === "PENDING") {
      // For PENDING status, do not allow dismissal (permanent banner)
      return;
    } else {
      // For other statuses (REJECTED), just hide temporarily
      setShowKYCBanner(false);
    }
  };

  // Format currency in Brazilian Real
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Format crypto price
  const formatCryptoPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  // Get crypto logo
  const getCryptoLogo = (symbol: string) => {
    switch (symbol) {
      case "BTC":
        return <Bitcoin className="w-8 h-8 text-orange-500" />;
      case "ETH":
        return <Globe className="w-8 h-8 text-brand-300" />;
      case "BNB":
        return (
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
            BNB
          </div>
        );
      case "ADA":
        return (
          <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
            ADA
          </div>
        );
      case "SOL":
        return (
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
            SOL
          </div>
        );
      default:
        return <Bitcoin className="w-8 h-8 text-orange-500" />;
    }
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
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data in parallel for faster loading
        const [userStatusResponse, balanceResponse, transactionResponse] = await Promise.all([
          fetch("/api/user/status"),
          fetch("/api/balance"),
          fetch("/api/transactions?limit=50"),
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

          const total =
            balanceData.balances?.reduce((sum: number, balance: Balance) => {
              if (balance.currency === "BRL") {
                return sum + balance.amount;
              }
              return sum;
            }, 0) || 0;
          setTotalBalance(total);

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

          // Find latest deposit (BUY_CRYPTO or DEPOSIT)
          const deposits = allTransactions.filter(
            (t: Transaction) => t.type === "DEPOSIT" || t.type === "BUY_CRYPTO"
          );
          if (deposits.length > 0) {
            setLatestDeposit(deposits[0]);
          }

          // Find latest withdrawal
          const withdrawals = allTransactions.filter(
            (t: Transaction) => t.type === "WITHDRAWAL" || t.type === "WITHDRAW"
          );
          if (withdrawals.length > 0) {
            setLatestWithdrawal(withdrawals[0]);
          }
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

        // Mock crypto prices (price API removed)
        const mockCryptoData: CryptoPrice[] = [
          {
            symbol: "BTC",
            price: 350000,
            change24h: 2500,
            changePercent: 0.72,
            volume: 1250000000,
            marketCap: 6800000000000,
          },
          {
            symbol: "ETH",
            price: 18500,
            change24h: -150,
            changePercent: -0.8,
            volume: 850000000,
            marketCap: 2200000000000,
          },
          {
            symbol: "BNB",
            price: 3200,
            change24h: 45,
            changePercent: 1.43,
            volume: 320000000,
            marketCap: 480000000000,
          },
          {
            symbol: "ADA",
            price: 2.85,
            change24h: -0.12,
            changePercent: -4.04,
            volume: 85000000,
            marketCap: 100000000000,
          },
          {
            symbol: "SOL",
            price: 450,
            change24h: 12.5,
            changePercent: 2.86,
            volume: 180000000,
            marketCap: 180000000000,
          },
        ];

        setCryptoPrices(mockCryptoData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados do dashboard.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Call logout API to clear session
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Clear local storage
      localStorage.removeItem("auth-session");
      localStorage.removeItem("user");
      sessionStorage.clear();

      // Force redirect to home page using window.location for reliability
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API fails, clear local storage and redirect
      localStorage.removeItem("auth-session");
      localStorage.removeItem("user");
      sessionStorage.clear();
      // Force redirect using window.location
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
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
              <Card key={i} className="bg-gray-900 border-gray-800 animate-pulse">
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
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
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
      <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        {/* KYC Status Banner */}
        {showKYCBanner && userStatus && (
          <KYCBanner
            status={userStatus.kycStatus as "PENDING" | "APPROVED" | "REJECTED"}
            onDismiss={handleDismissKYCBanner}
            showDismiss={userStatus.kycStatus !== "PENDING"}
          />
        )}

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
                    {showBalances ? `U$ ${usdtAmount.toFixed(2)}` : "U$ ••••••"}
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

        {/* Balance Chart Card with Area Chart */}
        {chartData.length > 0 && (
          <Card className="mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl border-gray-800 bg-black/40 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="h-64 sm:h-80 w-full relative">
                {/* Floating info card - Desktop version */}
                {(() => {
                  const lastDataPoint = chartData[chartData.length - 1];
                  const firstDataPoint = chartData[0];
                  const change = lastDataPoint.USDT - firstDataPoint.USDT;
                  const changePercent =
                    firstDataPoint.USDT > 0
                      ? ((change / firstDataPoint.USDT) * 100).toFixed(1)
                      : "0";
                  const isPositive = change >= 0;

                  return (
                    <>
                      {/* Mobile - Simple version */}
                      <div className="md:hidden absolute top-2 right-2 z-10 bg-black/90 backdrop-blur-sm border border-brand-500/30 rounded-lg px-2.5 py-1.5 shadow-xl">
                        <div className="text-xs text-brand-300 font-bold">
                          U$ {lastDataPoint.USDT.toFixed(2)}
                        </div>
                      </div>

                      {/* Desktop - Full version */}
                      <div className="hidden md:block absolute top-4 left-4 z-10 bg-black/90 backdrop-blur-sm border border-brand-500/30 rounded-lg p-3 shadow-xl min-w-[140px]">
                        <div className="space-y-2">
                          <div className="text-xs text-gray-400 font-medium">
                            Data
                          </div>
                          <div className="text-sm text-white font-semibold">
                            {lastDataPoint.date}
                          </div>
                          <div className="border-t border-gray-700 pt-2">
                            <div className="text-xs text-gray-400 font-medium mb-1">
                              Saldo
                            </div>
                            <div className="text-base text-brand-300 font-bold">
                              U$ {lastDataPoint.USDT.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              USDT
                            </div>
                          </div>
                          {chartData.length >= 2 && (
                            <div className="border-t border-gray-700 pt-2">
                              <div className="flex items-center gap-1.5">
                                <TrendingUp
                                  className={`w-3 h-3 ${
                                    isPositive
                                      ? "text-green-400"
                                      : "text-red-400 rotate-180"
                                  }`}
                                />
                                <span
                                  className={`text-xs font-medium ${
                                    isPositive
                                      ? "text-green-400"
                                      : "text-red-400"
                                  }`}
                                >
                                  {isPositive ? "+" : ""}
                                  {changePercent}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="areaGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#12E0A1"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="50%"
                          stopColor="#12E0A1"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="100%"
                          stopColor="#12E0A1"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    {/* Simplified grid - only horizontal lines */}
                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="#1f2937"
                      vertical={false}
                      horizontal={true}
                    />
                    {/* Hide X and Y axes */}
                    <XAxis hide />
                    <YAxis hide />
                    {/* Enhanced tooltip with all information */}
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const value = payload[0].value as number;
                          // Ensure label is formatted as DD/MM
                          const formattedDate =
                            typeof label === "string"
                              ? label
                              : (() => {
                                  if (!label) return "";
                                  const date = new Date(label);
                                  const day = String(date.getDate()).padStart(
                                    2,
                                    "0"
                                  );
                                  const month = String(
                                    date.getMonth() + 1
                                  ).padStart(2, "0");
                                  return `${day}/${month}`;
                                })();

                          return (
                            <div className="bg-black/90 backdrop-blur-sm border border-brand-500/30 rounded-lg p-3 shadow-xl">
                              <div className="space-y-2">
                                <div className="text-xs text-gray-400 font-medium">
                                  Data
                                </div>
                                <div className="text-sm text-white font-semibold">
                                  {formattedDate}
                                </div>
                                <div className="border-t border-gray-700 pt-2">
                                  <div className="text-xs text-gray-400 font-medium mb-1">
                                    Saldo
                                  </div>
                                  <div className="text-base text-brand-300 font-bold">
                                    U$ {value.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    USDT
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Smooth animated area */}
                    <Area
                      type="monotone"
                      dataKey="USDT"
                      stroke="#12E0A1"
                      strokeWidth={2.5}
                      fill="url(#areaGradient)"
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: "#12E0A1",
                        strokeWidth: 2,
                        stroke: "#000",
                      }}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
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
                  color: "text-green-400",
                  bgColor: "bg-green-500/10",
                  progressColor: "bg-green-500",
                  count: deposits.length,
                },
                {
                  name: t("withdrawal"),
                  icon: ArrowDownRight,
                  value: totalWithdrawals,
                  color: "text-red-400",
                  bgColor: "bg-red-500/10",
                  progressColor: "bg-red-500",
                  count: withdrawals.length,
                },
                {
                  name: "Reembolso",
                  icon: RotateCcw,
                  value: totalRefunds,
                  color: "text-purple-400",
                  bgColor: "bg-purple-500/10",
                  progressColor: "bg-purple-500",
                  count: refunds.length,
                },
              ];

              return categories.map((category, index) => {
                const Icon = category.icon;
                const progress = (category.value / maxValue) * 100;

                return (
                  <Card
                    key={index}
                    className="rounded-xl border-gray-800 bg-black/40 backdrop-blur-sm shadow-lg"
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div
                        className={`w-12 h-12 rounded-xl ${category.bgColor} flex items-center justify-center mb-3`}
                      >
                        <Icon className={`w-6 h-6 ${category.color}`} />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-white mb-2">
                        {category.name}
                      </h3>
                      <p className="text-xs text-gray-400 mb-3">
                        {category.count}{" "}
                        {category.count === 1
                          ? language === "pt"
                            ? "transação"
                            : "transaction"
                          : language === "pt"
                          ? "transações"
                          : "transactions"}
                      </p>
                      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
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
        <Card className="rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                {t("recentActivity")}
              </CardTitle>
              {transactions.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
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
                  let bgColor = "bg-green-500/10";
                  let iconColor = "text-green-400";
                  let title = "";
                  let amountColor = "text-green-400";
                  let prefix = "+";

                  const formattedAmount =
                    transaction.currency === "BRL"
                      ? formatCurrency(transaction.amount)
                      : `${transaction.amount.toFixed(8)} ${
                          transaction.currency || "USDT"
                        }`;

                  if (
                    transaction.type === "DEPOSIT" ||
                    transaction.type === "BUY_CRYPTO"
                  ) {
                    icon = <ArrowUpRight className="w-4 h-4" />;
                    bgColor = "bg-green-500/10";
                    iconColor = "text-green-400";
                    amountColor = "text-green-400";
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
                    bgColor = "bg-red-500/10";
                    iconColor = "text-red-400";
                    amountColor = "text-red-400";
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
                      className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-gray-800/30 hover:bg-gray-800/50 transition-colors active:bg-gray-800/60"
                    >
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}
                      >
                        <div className={iconColor}>{icon}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 mb-0.5">
                          <h4 className="font-medium text-white text-xs sm:text-sm truncate">
                            {title}
                          </h4>
                          <p
                            className={`font-semibold text-xs sm:text-sm ${amountColor} whitespace-nowrap`}
                          >
                            {prefix}
                            {formattedAmount}
                          </p>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          {dateStr} {language === "pt" ? "às" : "at"} {time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <Wallet className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-sm sm:text-base text-gray-400 mb-4">
                  Nenhuma transação recente
                </p>
                <Button
                  onClick={() => router.push("/trade")}
                  className="bg-brand-500 hover:bg-brand-600 h-10 sm:h-11 text-sm sm:text-base"
                >
                  {t("makeFirstPurchase")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
