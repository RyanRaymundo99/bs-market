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
  Plus,
  Wallet,
  TrendingUp,
  ArrowDownRight,
  Activity,
  DollarSign,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import NavbarNew from "@/components/ui/navbar-new";
import KYCBanner from "@/components/ui/kyc-banner";
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([]);
  const [showBalances, setShowBalances] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [latestDeposit, setLatestDeposit] = useState<Deposit | null>(null);
  const [latestWithdrawal, setLatestWithdrawal] = useState<Withdrawal | null>(null);
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
    } else if (userStatus?.kycStatus && userStatus.kycStatus !== "APPROVED") {
      // For PENDING and REJECTED, show banner normally
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
    } else {
      // For other statuses, just hide temporarily
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

  // Fetch user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user status
        const userStatusResponse = await fetch("/api/user/status");
        if (userStatusResponse.ok) {
          const userStatusData = await userStatusResponse.json();
          setUserStatus(userStatusData.user);
        }

        // Fetch balances
        const balanceResponse = await fetch("/api/balance");
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

          // Generate chart data (last 7 days)
          const brlBalance =
            balanceData.balances?.find((b: Balance) => b.currency === "BRL")
              ?.amount || 0;
          const usdtBalance =
            balanceData.balances?.find((b: Balance) => b.currency === "USDT")
              ?.amount || 0;

          const chartDataArray = [];
          const today = new Date();
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            });

            // Generate progressive data (mock, based on current balance)
            const progressFactor = i / 6; // 0 to 1
            chartDataArray.push({
              date: dateStr,
              BRL: Math.max(0, brlBalance * (0.3 + progressFactor * 0.7)), // Start at 30% of current
              USDT: Math.max(0, usdtBalance * (0.3 + progressFactor * 0.7)), // Start at 30% of current
            });
          }
          setChartData(chartDataArray);
        }

        // Fetch transactions
        const transactionResponse = await fetch("/api/transactions?limit=50");
        if (transactionResponse.ok) {
          const transactionData = await transactionResponse.json();
          const allTransactions = transactionData.transactions || [];
          setTransactions(allTransactions);

          // Find latest deposit (BUY_CRYPTO or DEPOSIT)
          const deposits = allTransactions.filter(
            (t: Transaction) =>
              t.type === "DEPOSIT" || t.type === "BUY_CRYPTO"
          );
          if (deposits.length > 0) {
            setLatestDeposit(deposits[0]);
          }

          // Find latest withdrawal
          const withdrawals = allTransactions.filter(
            (t: Transaction) =>
              t.type === "WITHDRAWAL" || t.type === "WITHDRAW"
          );
          if (withdrawals.length > 0) {
            setLatestWithdrawal(withdrawals[0]);
          }
        }

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
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-300" />
          </div>
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

        {/* Main Balance Display - Hero Section */}
        <div className="mb-4 sm:mb-6">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-brand-500/20 via-purple-500/20 to-brand-600/20 backdrop-blur-xl border border-white/10 p-4 sm:p-6 md:p-8 shadow-2xl">
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4 sm:mb-6">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-300 mb-1">Saldo Total</p>
                  {(() => {
                    const usdtBalance = balances.find((b) => b.currency === "USDT");
                    const usdtAmount = usdtBalance?.amount || 0;
                    return (
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 break-words">
                        {showBalances
                          ? `U$ ${usdtAmount.toFixed(2)}`
                          : "U$ ••••••"}
                        <span className="text-lg sm:text-xl md:text-2xl text-gray-300 ml-1 sm:ml-2 block sm:inline">USDT</span>
                      </h2>
                    );
                  })()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBalances(!showBalances)}
                  className="text-white hover:bg-white/10 rounded-full w-9 h-9 sm:w-10 sm:h-10 p-0 flex-shrink-0 ml-2"
                >
                  {showBalances ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </Button>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                <Button
                  onClick={() => router.push("/trade")}
                  className="flex-1 aspect-square sm:aspect-auto sm:h-16 bg-white text-brand-600 hover:bg-gray-100 font-semibold rounded-xl shadow-lg text-xs sm:text-sm md:text-base flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4"
                  size="lg"
                >
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                  <span className="text-center leading-tight">Comprar USDT</span>
                </Button>
                <Button
                  onClick={() => router.push("/withdraw")}
                  variant="outline"
                  className="flex-1 aspect-square sm:aspect-auto sm:h-16 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 font-semibold rounded-xl text-xs sm:text-sm md:text-base flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4"
                  size="lg"
                >
                  <ArrowDownRight className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                  <span className="text-center leading-tight">Sacar</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Chart Card */}
        {chartData.length > 0 && (
          <Card className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
            <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                Evolução do Saldo
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="h-40 sm:h-48 w-full -ml-2 sm:-ml-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      style={{ fontSize: '10px' }}
                      tickLine={false}
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      style={{ fontSize: '10px' }}
                      tickFormatter={(value) => `U$ ${value.toFixed(0)}`}
                      tickLine={false}
                      tick={{ fill: '#6b7280' }}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid #374151',
                        borderRadius: '12px',
                        color: '#fff',
                        padding: '8px 12px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [`U$ ${value.toFixed(2)}`, "USDT"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="USDT"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          {(() => {
            const totalTransactions = transactions.length;
            const completedTransactions = transactions.filter(
              (t) => t.status === "COMPLETED"
            ).length;
            const successRate = totalTransactions > 0
              ? ((completedTransactions / totalTransactions) * 100).toFixed(0)
              : "0";
            
            return (
              <>
                <Card className="rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                  <CardContent className="p-3 sm:p-4 text-center">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-brand-400 mx-auto mb-1 sm:mb-2" />
                    <p className="text-xl sm:text-2xl font-bold text-white">{totalTransactions}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Transações</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                  <CardContent className="p-3 sm:p-4 text-center">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 mx-auto mb-1 sm:mb-2" />
                    <p className="text-xl sm:text-2xl font-bold text-white">{successRate}%</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Taxa Sucesso</p>
                  </CardContent>
                </Card>
                {latestDeposit && (
                  <Card className="rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                    <CardContent className="p-3 sm:p-4 text-center">
                      <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 mx-auto mb-1 sm:mb-2" />
                      <p className="text-base sm:text-lg font-bold text-white break-words">
                        +{latestDeposit.currency === "BRL"
                          ? formatCurrency(Number(latestDeposit.amount))
                          : `${Number(latestDeposit.amount).toFixed(2)}`}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Último Depósito</p>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </div>

        {/* Recent Activity */}
        <Card className="rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                Atividade Recente
              </CardTitle>
              {transactions.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
                >
                  Ver todas
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
                  const time = date.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const dateStr = date.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  });

                  let icon = <ArrowUpRight className="w-4 h-4" />;
                  let bgColor = "bg-green-500/10";
                  let iconColor = "text-green-400";
                  let title = "";
                  let amountColor = "text-green-400";
                  let prefix = "+";

                  const formattedAmount =
                    transaction.currency === "BRL"
                      ? formatCurrency(transaction.amount)
                      : `${transaction.amount.toFixed(8)} ${transaction.currency || "USDT"}`;

                  if (transaction.type === "DEPOSIT" || transaction.type === "BUY_CRYPTO") {
                    icon = <ArrowUpRight className="w-4 h-4" />;
                    bgColor = "bg-green-500/10";
                    iconColor = "text-green-400";
                    amountColor = "text-green-400";
                    title = transaction.type === "BUY_CRYPTO" ? "Compra USDT" : "Depósito";
                    prefix = "+";
                  } else if (
                    transaction.type === "WITHDRAWAL" ||
                    transaction.type === "WITHDRAW"
                  ) {
                    icon = <ArrowDownRight className="w-4 h-4" />;
                    bgColor = "bg-red-500/10";
                    iconColor = "text-red-400";
                    amountColor = "text-red-400";
                    title = "Saque";
                    prefix = "-";
                  } else if (transaction.type === "SELL") {
                    icon = <TrendingDown className="w-4 h-4" />;
                    bgColor = "bg-orange-500/10";
                    iconColor = "text-orange-400";
                    amountColor = "text-orange-400";
                    title = "Venda";
                    prefix = "-";
                  } else {
                    title = transaction.type;
                  }

                  return (
                    <div
                      key={transaction.id || index}
                      className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-gray-800/30 hover:bg-gray-800/50 transition-colors active:bg-gray-800/60"
                    >
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
                        <div className={iconColor}>{icon}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 mb-0.5">
                          <h4 className="font-medium text-white text-xs sm:text-sm truncate">
                            {title}
                          </h4>
                          <p className={`font-semibold text-xs sm:text-sm ${amountColor} whitespace-nowrap`}>
                            {prefix}{formattedAmount}
                          </p>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          {dateStr} às {time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <Wallet className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-sm sm:text-base text-gray-400 mb-4">Nenhuma transação recente</p>
                <Button
                  onClick={() => router.push("/trade")}
                  className="bg-brand-500 hover:bg-brand-600 h-10 sm:h-11 text-sm sm:text-base"
                >
                  Fazer primeira compra
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
