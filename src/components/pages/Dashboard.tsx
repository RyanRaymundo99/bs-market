"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Bitcoin,
  BarChart3,
  ArrowUpRight,
  Eye,
  EyeOff,
  RefreshCw,
  Activity,
  Globe,
  Clock,
  Plus,
  User,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import NavbarNew from "@/components/ui/navbar-new";
import KYCBanner from "@/components/ui/kyc-banner";

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
  const [latestDeposit, setLatestDeposit] = useState<any>(null);
  const [latestWithdrawal, setLatestWithdrawal] = useState<any>(null);
  const [showKYCBanner, setShowKYCBanner] = useState(() => {
    // Check localStorage to see if banner was dismissed
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("kyc-banner-dismissed");
      return dismissed !== "true";
    }
    return true;
  });
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
      // Show banner if redirected from KYC submission, even if previously dismissed
      setShowKYCBanner(true);
      localStorage.removeItem("kyc-banner-dismissed");
    }
  }, [searchParams]);

  // Handler to dismiss banner and save to localStorage
  const handleDismissKYCBanner = () => {
    setShowKYCBanner(false);
    localStorage.setItem("kyc-banner-dismissed", "true");
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

        // Fetch crypto prices
        const btcResponse = await fetch("/api/crypto/price?symbol=BTCBRL");
        const ethResponse = await fetch("/api/crypto/price?symbol=ETHBRL");

        if (btcResponse.ok && ethResponse.ok) {
          const btcData = await btcResponse.json();
          const ethData = await ethResponse.json();

          // Mock data for demonstration - replace with real API data
          const mockCryptoData: CryptoPrice[] = [
            {
              symbol: "BTC",
              price: btcData.price || 350000,
              change24h: 2500,
              changePercent: 0.72,
              volume: 1250000000,
              marketCap: 6800000000000,
            },
            {
              symbol: "ETH",
              price: ethData.price || 18500,
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
        } else {
          // If API calls fail, clear crypto prices
          setCryptoPrices([]);
        }
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
        <div className="container mx-auto px-4 py-6 mobile-page-padding">
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

      <div className="container mx-auto px-4 py-6 mobile-page-padding">
        {/* KYC Status Banner */}
        {showKYCBanner && userStatus && (
          <KYCBanner
            status={userStatus.kycStatus as "PENDING" | "APPROVED" | "REJECTED"}
            onDismiss={handleDismissKYCBanner}
            showDismiss={userStatus.kycStatus !== "PENDING"}
          />
        )}

        {/* Welcome Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-500 via-purple-600 to-brand-600 bg-clip-text text-transparent mb-2">
            Bem-vindo a Build Strategy
          </h1>
          <p className="text-xl text-muted-foreground">
            Monitore seus investimentos e acompanhe o mercado crypto
          </p>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Saldo (Balance) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-foreground">
                  <Wallet className="w-5 h-5" />
                  Saldo
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBalances(!showBalances)}
                  className="text-foreground hover:text-brand-300 hover:bg-muted"
                >
                  {showBalances ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-8">
                {/* USDT Balance */}
                {(() => {
                  const usdtBalance = balances.find(
                    (b) => b.currency === "USDT"
                  );
                  return (
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center text-brand-500 font-bold text-2xl">
                        U$
                      </span>
                      <span className="text-2xl font-bold text-foreground">
                        {showBalances
                          ? usdtBalance
                            ? `${usdtBalance.amount.toFixed(2)} USDT`
                            : "0.00 USDT"
                          : "••••••"}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Latest Transaction */}
              {(() => {
                // Determine which is more recent: deposit or withdrawal
                let latestItem = null;
                let isDeposit = false;

                if (latestDeposit && latestWithdrawal) {
                  const depositDate = new Date(latestDeposit.createdAt);
                  const withdrawalDate = new Date(latestWithdrawal.createdAt);
                  if (depositDate > withdrawalDate) {
                    latestItem = latestDeposit;
                    isDeposit = true;
                  } else {
                    latestItem = latestWithdrawal;
                    isDeposit = false;
                  }
                } else if (latestDeposit) {
                  latestItem = latestDeposit;
                  isDeposit = true;
                } else if (latestWithdrawal) {
                  latestItem = latestWithdrawal;
                  isDeposit = false;
                }

                if (latestItem) {
                  return (
                    <div className="mt-6 flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full ${
                          isDeposit
                            ? "bg-green-500/20 text-green-500"
                            : "bg-red-500/20 text-red-500"
                        }`}
                      >
                        {isDeposit ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <TrendingDown className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {isDeposit ? "Último Depósito" : "Último Saque"}
                        </p>
                        <p
                          className={`text-lg font-semibold ${
                            isDeposit ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {isDeposit ? "+" : "-"}
                          {latestItem.currency === "BRL" || (!latestItem.currency && isDeposit)
                            ? formatCurrency(Number(latestItem.amount))
                            : `${Number(latestItem.amount).toFixed(2)} ${latestItem.currency || "USDT"}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(latestItem.createdAt).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Clock className="w-5 h-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="relative">
                  {/* Vertical Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-700"></div>

                  <div className="space-y-6">
                    {transactions.map((transaction, index) => {
                      const date = new Date(transaction.createdAt);
                      const time = date.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const dateStr = date.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      });

                      // Determine color and title based on transaction type
                      let color = "#10b981"; // default green
                      let title = "";
                      let description = "";

                      // Format amount based on currency
                      const formattedAmount =
                        transaction.currency === "BRL"
                          ? formatCurrency(transaction.amount)
                          : `${transaction.amount.toFixed(8)} ${
                              transaction.currency
                            }`;

                      if (transaction.type === "DEPOSIT") {
                        color = "#10b981"; // green
                        title = "DEPÓSITO";
                        description = `Depósito de ${formattedAmount}`;
                      } else if (
                        transaction.type === "WITHDRAWAL" ||
                        transaction.type === "WITHDRAW"
                      ) {
                        color = "#f59e0b"; // orange/yellow
                        title = "SAQUE";
                        description = `Saque de ${formattedAmount}`;
                      } else if (
                        transaction.type === "BUY"
                      ) {
                        color = "#3b82f6"; // blue
                        title = "COMPRA";
                        description = `Compra de ${formattedAmount}`;
                      } else if (transaction.type === "SELL") {
                        color = "#ef4444"; // red
                        title = "VENDA";
                        description = `Venda de ${formattedAmount}`;
                      } else {
                        title = transaction.type.toUpperCase();
                        description = formattedAmount;
                      }

                      // Status-based color override
                      if (transaction.status === "PENDING") {
                        color = "#f59e0b"; // orange for pending
                      } else if (
                        transaction.status === "FAILED" ||
                        transaction.status === "REJECTED"
                      ) {
                        color = "#ef4444"; // red for failed
                      }

                      return (
                        <div
                          key={transaction.id || index}
                          className="relative flex items-start"
                        >
                          {/* Time */}
                          <div className="text-xs text-muted-foreground w-16 text-right pr-3 pt-1">
                            {time}
                          </div>

                          {/* Circle */}
                          <div
                            className="absolute left-[22px] top-2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 z-10"
                            style={{ backgroundColor: color }}
                          ></div>

                          {/* Content */}
                          <div className="flex-1 pl-8">
                            <h4 className="font-semibold text-foreground text-sm mb-1">
                              {title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {dateStr}
                            </p>
                            <Badge
                              variant="secondary"
                              className={`text-xs mt-2 ${
                                transaction.status === "COMPLETED"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                  : transaction.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                              }`}
                            >
                              {transaction.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma transação recente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 gap-6">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Clock className="w-5 h-5" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.length > 0 ? (
                  transactions.map((transaction, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            transaction.type === "DEPOSIT"
                              ? "bg-green-100"
                              : "bg-red-100"
                          }`}
                        >
                          {transaction.type === "DEPOSIT" ? (
                            <Plus className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {transaction.type.toLowerCase()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(transaction.createdAt).toLocaleDateString(
                              "pt-BR"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {transaction.type === "DEPOSIT" ? "+" : "-"}
                          {transaction.currency === "BRL"
                            ? formatCurrency(transaction.amount)
                            : `${transaction.amount.toFixed(8)} BTC`}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            transaction.status === "COMPLETED"
                              ? "bg-green-100 text-green-700"
                              : transaction.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma transação recente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
