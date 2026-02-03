"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Search,
  ArrowUpDown,
  X,
  Wifi,
  WifiOff,
  Mail,
  Send,
  Plus,
  Minus,
  Wallet,
  FileDown,
  Calendar,
  Webhook,
  RefreshCw,
  Activity,
  AlertCircle,
  ScrollText,
  CheckCircle2,
  Zap,
  UserPlus,
  TrendingDown,
  Eye,
  Filter,
  Download,
  Settings,
  Database,
  Server,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/components/admin/NotificationBell";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Tooltip as CustomTooltip } from "@/components/ui/tooltip";
import { formatUSDT } from "@/lib/format-currency";

interface DashboardStats {
  totalUsers: number;
  pendingApprovals: number;
  approvedUsers: number;
  rejectedUsers: number;
  pendingKYC: number;
  approvedKYC: number;
  rejectedKYC: number;
}

interface FinanceStats {
  totalDeposits: number;
  totalWithdrawals: number;
  totalTrades: number;
  totalCommissions: number;
  averageUserBalance: number;
  depositsChange: number;
  withdrawalsChange: number;
  tradesChange: number;
  commissionsChange: number;
  balanceChange: number;
}

interface Transaction {
  id: string;
  date: string;
  type:
    | "DEPOSIT"
    | "WITHDRAWAL"
    | "FEE"
    | "BUY_CRYPTO"
    | "SELL_CRYPTO"
    | "REFUND";
  user: string | { name: string; email: string } | null; // Can be string or object for backward compatibility
  userId?: string;
  value: number;
  currency?: string;
  amount?: number;
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "COMPLETED"
    | "CONFIRMED"
    | "PROCESSING"
    | "EXECUTING"
    | "FAILED"
    | "CANCELLED";
  metadata?: Record<string, unknown> | null;
  orderId?: string | null;
  depositId?: string | null;
  withdrawalId?: string | null;
}

interface ChartData {
  date: string;
  deposits: number;
  withdrawals: number;
  trades: number;
}

interface ApiUserRecord {
  id: string;
  name?: string;
  email?: string;
  createdAt?: string;
  totalBalance?: number;
  kycSubmittedAt?: string;
}

interface ApiTxRecord {
  type: string;
  value?: number;
  user?: { name?: string; email?: string };
  date?: string;
}

interface ApiBalanceRecord {
  amount?: number;
}

interface ActivityFeedItem {
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  link: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}

interface QuickSearchResultItem {
  type: string;
  title: string;
  subtitle?: string;
  link: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AdminLogItem {
  type: string;
  description: string;
  timestamp: string;
}

interface TransactionDetails {
  id: string;
  type: string;
  amount: number;
  currency: string;
  balance: number;
  description: string;
  metadata?: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    cpf?: string | null;
    phone?: string | null;
  };
  deposit?: {
    id: string;
    status: string;
    amount: string | number;
    externalId?: string | null;
    confirmedAt?: string | null;
  } | null;
  withdrawal?: {
    id: string;
    status: string;
    amount: string | number;
    hash?: string | null;
    protocol?: string | null;
    walletAddress?: string | null;
    network?: string | null;
  } | null;
  order?: {
    id: string;
    status: string;
    externalOrderId?: string | null;
    createdAt?: string | null;
    executedAt?: string | null;
    amount: string | number;
    total: string | number;
  } | null;
}

function AdminDashboardContent() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingApprovals: 0,
    approvedUsers: 0,
    rejectedUsers: 0,
    pendingKYC: 0,
    approvedKYC: 0,
    rejectedKYC: 0,
  });
  const [financeStats, setFinanceStats] = useState<FinanceStats>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalTrades: 0,
    totalCommissions: 0,
    averageUserBalance: 0,
    depositsChange: 0,
    withdrawalsChange: 0,
    tradesChange: 0,
    commissionsChange: 0,
    balanceChange: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Transaction>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [, setLoading] = useState(true);
  const [, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionDetails, setTransactionDetails] =
    useState<TransactionDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [resendingReceipt, setResendingReceipt] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [markingCompleted, setMarkingCompleted] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [showBalanceConfirmDialog, setShowBalanceConfirmDialog] =
    useState(false);
  const [balanceConfirmStep, setBalanceConfirmStep] = useState(1);
  const [balanceUserId, setBalanceUserId] = useState("");
  const [balanceCurrency, setBalanceCurrency] = useState<"USDT" | "BRL">(
    "USDT",
  );
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceOperation, setBalanceOperation] = useState<"CREDIT" | "DEDUCT">(
    "CREDIT",
  );
  const [balanceReason, setBalanceReason] = useState("");
  const [usersList, setUsersList] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [processingBalance, setProcessingBalance] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Global switch: disable deposits/withdrawals + show maintenance message
  const [moneyControlsLoading, setMoneyControlsLoading] = useState(true);
  const [depositsDisabled, setDepositsDisabled] = useState(false);
  const [withdrawalsDisabled, setWithdrawalsDisabled] = useState(false);
  const [depositsDisabledMessage, setDepositsDisabledMessage] = useState("");
  const [withdrawalsDisabledMessage, setWithdrawalsDisabledMessage] =
    useState("");
  const [savingMoneyControls, setSavingMoneyControls] = useState(false);
  const [moneyControlsMeta, setMoneyControlsMeta] = useState<{
    updatedAt: string;
    updatedBy: string | null;
  } | null>(null);
  const [maxDepositUsdt, setMaxDepositUsdt] = useState(2000);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceStartAt, setMaintenanceStartAt] = useState("");
  const [maintenanceEndAt, setMaintenanceEndAt] = useState("");

  // Historical data states for hover tooltips
  const [historyData, setHistoryData] = useState<
    Record<string, Array<{ date: string; value: number }>>
  >({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>(
    {},
  );

  // New features states
  const [recentActivity, setRecentActivity] = useState<ActivityFeedItem[]>([]);
  const [topUsers, setTopUsers] = useState<(ApiUserRecord & { totalBalance?: number })[]>([]);
  const [systemHealth, setSystemHealth] = useState({
    database: "checking",
    api: "checking",
  });
  const [quickSearchQuery, setQuickSearchQuery] = useState("");
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [quickSearchResults, setQuickSearchResults] = useState<QuickSearchResultItem[]>([]);
  const [loadingQuickSearch, setLoadingQuickSearch] = useState(false);

  // Transaction table enhancements
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set(),
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [processingTransaction, setProcessingTransaction] = useState<
    string | null
  >(null);
  const [chartDateRange, setChartDateRange] = useState<number>(30);
  const [adminActivityLog, setAdminActivityLog] = useState<AdminLogItem[]>([]);

  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Open transaction details from URL (e.g. from webhook logs: /admin?openTransaction=<id_or_external_id>)
  useEffect(() => {
    const openId = searchParams.get("openTransaction");
    if (!openId) return;
    const url = `/api/admin/transactions/${encodeURIComponent(openId)}`;
    setShowDetailsDialog(true);
    setDetailsLoading(true);
    setTransactionDetails(null);
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.transaction) {
          setTransactionDetails(data.transaction);
          router.replace("/admin", { scroll: false });
        } else {
          setTransactionDetails(null);
          toast({
            variant: "destructive",
            title: "Erro",
            description: data.error || "Transação não encontrada",
          });
        }
      })
      .catch(() => {
        setTransactionDetails(null);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha ao carregar detalhes da transação",
        });
      })
      .finally(() => setDetailsLoading(false));
  }, [searchParams, router]);

  useEffect(() => {
    const loadMoneyControls = async () => {
      setMoneyControlsLoading(true);
      try {
        const response = await fetch("/api/admin/site-settings/money", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (data?.moneyControls) {
          setDepositsDisabled(Boolean(data.moneyControls.depositsDisabled));
          setWithdrawalsDisabled(
            Boolean(data.moneyControls.withdrawalsDisabled),
          );
          setDepositsDisabledMessage(
            String(data.moneyControls.depositsDisabledMessage || ""),
          );
          setWithdrawalsDisabledMessage(
            String(data.moneyControls.withdrawalsDisabledMessage || ""),
          );
          setMaxDepositUsdt(Number(data.moneyControls.maxDepositUsdt) || 2000);
          setMaintenanceMessage(
            String(data.moneyControls.maintenanceMessage || ""),
          );
          setMaintenanceStartAt(
            data.moneyControls.maintenanceStartAt
              ? new Date(data.moneyControls.maintenanceStartAt)
                  .toISOString()
                  .slice(0, 16)
              : "",
          );
          setMaintenanceEndAt(
            data.moneyControls.maintenanceEndAt
              ? new Date(data.moneyControls.maintenanceEndAt)
                  .toISOString()
                  .slice(0, 16)
              : "",
          );
          setMoneyControlsMeta({
            updatedAt: String(data.moneyControls.updatedAt),
            updatedBy: data.moneyControls.updatedBy ?? null,
          });
        }
      } catch (error) {
        console.error("Failed to load money controls:", error);
      } finally {
        setMoneyControlsLoading(false);
      }
    };

    loadMoneyControls();
  }, []);

  const saveMoneyControls = async () => {
    setSavingMoneyControls(true);
    try {
      const response = await fetch("/api/admin/site-settings/money", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          depositsDisabled,
          withdrawalsDisabled,
          depositsDisabledMessage,
          withdrawalsDisabledMessage,
          notifyUsers: true,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update settings");
      }

      if (data?.moneyControls) {
        setDepositsDisabled(Boolean(data.moneyControls.depositsDisabled));
        setWithdrawalsDisabled(Boolean(data.moneyControls.withdrawalsDisabled));
        setDepositsDisabledMessage(
          String(data.moneyControls.depositsDisabledMessage || ""),
        );
        setWithdrawalsDisabledMessage(
          String(data.moneyControls.withdrawalsDisabledMessage || ""),
        );
        setMaxDepositUsdt(Number(data.moneyControls.maxDepositUsdt) || 2000);
        setMaintenanceMessage(
          String(data.moneyControls.maintenanceMessage || ""),
        );
        setMaintenanceStartAt(
          data.moneyControls.maintenanceStartAt
            ? new Date(data.moneyControls.maintenanceStartAt)
                .toISOString()
                .slice(0, 16)
            : "",
        );
        setMaintenanceEndAt(
          data.moneyControls.maintenanceEndAt
            ? new Date(data.moneyControls.maintenanceEndAt)
                .toISOString()
                .slice(0, 16)
            : "",
        );
        setMoneyControlsMeta({
          updatedAt: String(data.moneyControls.updatedAt),
          updatedBy: data.moneyControls.updatedBy ?? null,
        });
      }

      toast({
        title: "Atualizado",
        description: `Configuração salva. Usuários notificados: ${Number(
          data?.notifiedUsers || 0,
        )}.`,
      });
    } catch (error) {
      console.error("Failed to save money controls:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Falha ao salvar configuração",
        variant: "destructive",
      });
    } finally {
      setSavingMoneyControls(false);
    }
  };

  // Real-time transaction updates (lightweight, fast)
  const fetchRealtimeTransactions = useCallback(async (since?: Date) => {
    try {
      if (!since) {
        setTransactionsLoading(true);
      }

      const url = new URL(
        "/api/admin/transactions/realtime",
        window.location.origin,
      );
      url.searchParams.set("limit", "50");
      if (since) {
        url.searchParams.set("since", since.toISOString());
      }

      const response = await fetch(url.toString(), {
        cache: "no-store", // Always fetch fresh data
      });

      if (!response.ok) {
        throw new Error("Failed to fetch realtime transactions");
      }

      const data = await response.json();

      if (data.success && data.transactions) {
        if (since) {
          // Incremental update - prepend new transactions
          setTransactions((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const newTransactions = data.transactions.filter(
              (t: Transaction) => !existingIds.has(t.id),
            );
            return [...newTransactions, ...prev].slice(0, 100); // Keep max 100
          });
        } else {
          // Full refresh
          setTransactions(data.transactions);
        }
        setLastUpdateTime(new Date());
      }
    } catch (error) {
      console.error("Error fetching realtime transactions:", error);
      // Don't show toast for polling errors to avoid spam
    } finally {
      if (!since) {
        setTransactionsLoading(false);
      }
    }
  },
    [typeFilter, dateFrom, dateTo, amountMin, amountMax],
  );

  const fetchFinanceData = useCallback(async () => {
    try {
      setFinanceLoading(true);
      const response = await fetch("/api/admin/finance", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch finance data");
      }

      const data = await response.json();

      if (data.success) {
        setFinanceStats(data.financeStats);
        // Only set transactions if we don't have realtime updates yet
        if (transactions.length === 0) {
          setTransactions(data.transactions);
          setTransactionsLoading(false);
        }
        setChartData(data.chartData);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error fetching finance data:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar dados financeiros",
      });
    } finally {
      setFinanceLoading(false);
    }
  }, [toast, transactions.length]);

  const [statsLoading, setStatsLoading] = useState(true);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);

      // Use optimized stats endpoint that uses COUNT queries instead of fetching all records
      const response = await fetch("/api/admin/stats", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();

      if (data.success && data.stats) {
        setStats(data.stats);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard statistics",
      });
    } finally {
      setStatsLoading(false);
    }
  }, [toast]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Agora";
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return `${Math.floor(diffInMinutes / 1440)}d atrás`;
  };

  const fetchHistory = useCallback(
    async (metric: string, days: number = 7) => {
      if (historyData[metric] && historyData[metric].length > 0) {
        return; // Already loaded
      }

      setLoadingHistory((prev) => ({ ...prev, [metric]: true }));
      try {
        const response = await fetch(
          `/api/admin/finance/history?metric=${metric}&days=${days}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }

        const data = await response.json();

        if (data.success && data.history) {
          setHistoryData((prev) => ({ ...prev, [metric]: data.history }));
        }
      } catch (error) {
        console.error(`Error fetching ${metric} history:`, error);
      } finally {
        setLoadingHistory((prev) => ({ ...prev, [metric]: false }));
      }
    },
    [historyData],
  );

  const HistoryTooltipContent = ({
    metric,
    title,
  }: {
    metric: string;
    title: string;
  }) => {
    const data = historyData[metric] || [];
    const loading = loadingHistory[metric];

    if (loading) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl min-w-[280px]">
          <div className="text-sm font-semibold text-white mb-2">{title}</div>
          <div className="text-xs text-gray-400">Carregando...</div>
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl min-w-[280px]">
          <div className="text-sm font-semibold text-white mb-2">{title}</div>
          <div className="text-xs text-gray-400">Sem dados históricos</div>
        </div>
      );
    }

    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const avg = total / data.length;

    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl min-w-[280px] max-w-[320px]">
        <div className="text-sm font-semibold text-white mb-3">
          {title} - Últimos {data.length} dias
        </div>
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Total:</span>
            <span className="text-white font-medium">
              {formatCurrency(total)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Média diária:</span>
            <span className="text-white font-medium">
              {formatCurrency(avg)}
            </span>
          </div>
        </div>
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {data
            .slice()
            .reverse()
            .map((item, index) => {
              const date = new Date(item.date);
              const dateStr = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
              const percentage =
                maxValue > 0 ? (item.value / maxValue) * 100 : 0;

              return (
                <div key={index} className="flex items-center gap-2">
                  <div className="text-xs text-gray-400 w-12">{dateStr}</div>
                  <div className="flex-1 bg-gray-700 rounded-full h-2 relative overflow-hidden">
                    <div
                      className="bg-green-500 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-white font-medium w-20 text-right">
                    {formatCurrency(item.value)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      DEPOSIT: "Depósito",
      WITHDRAWAL: "Saque",
      FEE: "Comissão",
      BUY_CRYPTO: "Compra Crypto",
      SELL_CRYPTO: "Venda Crypto",
      REFUND: "Reembolso",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const handleTransactionClick = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsDialog(true);
    setDetailsLoading(true);
    setTransactionDetails(null);

    const detailsUrl =
      transaction.id.startsWith("order_") &&
      transaction.id.length > "order_".length
        ? `/api/admin/transactions/order/${transaction.id.slice("order_".length)}`
        : `/api/admin/transactions/${transaction.id}`;

    try {
      const response = await fetch(detailsUrl);
      let data: { success?: boolean; transaction?: TransactionDetails; error?: string } = {};
      try {
        data = await response.json();
      } catch {
        // Non-JSON response (e.g. 404 HTML page)
      }
      if (response.ok && data.success && data.transaction) {
        setTransactionDetails(data.transaction);
      } else {
        const userObj =
          transaction.user && typeof transaction.user === "object"
            ? transaction.user
            : { name: "—", email: "—" };
        const fallback: TransactionDetails = {
          id: transaction.id,
          type: transaction.type,
          amount: Math.abs(transaction.value ?? transaction.amount ?? 0),
          currency: transaction.currency ?? "BRL",
          balance: 0,
          description: "",
          status: transaction.status,
          createdAt:
            typeof transaction.date === "string"
              ? transaction.date
              : new Date().toISOString(),
          user: {
            name: userObj.name ?? "—",
            email: userObj.email ?? "—",
          },
        };
        setTransactionDetails(fallback);
        const apiMessage = data.error
          ? `${data.error} Exibindo informações da lista.`
          : "Detalhes completos não carregaram. Exibindo informações da lista.";
        toast({
          variant: "destructive",
          title: "Erro",
          description: apiMessage,
        });
      }
    } catch (error) {
      console.error("Error fetching transaction details:", error);
      const userObj =
        transaction.user && typeof transaction.user === "object"
          ? transaction.user
          : { name: "—", email: "—" };
      const fallback: TransactionDetails = {
        id: transaction.id,
        type: transaction.type,
        amount: Math.abs(transaction.value ?? transaction.amount ?? 0),
        currency: transaction.currency ?? "BRL",
        balance: 0,
        description: "",
        status: transaction.status,
        createdAt:
          typeof transaction.date === "string"
            ? transaction.date
            : new Date().toISOString(),
        user: {
          name: userObj.name ?? "—",
          email: userObj.email ?? "—",
        },
      };
      setTransactionDetails(fallback);
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          "Falha ao carregar detalhes da transação. Exibindo informações da lista.",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      PENDING: "Pendente",
      APPROVED: "Aprovado",
      REJECTED: "Rejeitado",
      COMPLETED: "Aprovado", // Map COMPLETED to Aprovado for consistency
      CONFIRMED: "Aprovado", // Map CONFIRMED to Aprovado for consistency
      FAILED: "Falhou",
      CANCELLED: "Cancelado",
      PROCESSING: "Processando",
      EXECUTING: "Executando",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const handleSyncStatus = async () => {
    if (!transactionDetails) return;
    if (transactionDetails.id.startsWith("order_")) return;

    setSyncingStatus(true);
    try {
      const response = await fetch(
        `/api/admin/transactions/${transactionDetails.id}/sync-status`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Status Sincronizado",
          description: data.message || "Status atualizado com sucesso",
        });
        // Refresh transaction details by fetching from API
        const detailsResponse = await fetch(
          `/api/admin/transactions/${transactionDetails.id}`,
        );
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          if (detailsData.success) {
            setTransactionDetails(detailsData.transaction);
          }
        }
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description:
            data.message || data.error || "Falha ao sincronizar status",
        });
      }
    } catch (error) {
      console.error("Error syncing status:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao sincronizar status",
      });
    } finally {
      setSyncingStatus(false);
    }
  };

  const handleResendReceipt = async () => {
    if (!transactionDetails) return;
    if (transactionDetails.id.startsWith("order_")) return;

    setResendingReceipt(true);
    try {
      const response = await fetch(
        `/api/admin/transactions/${transactionDetails.id}/resend-receipt`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Sucesso",
          description: "Recibo enviado com sucesso!",
          variant: "default",
        });

        // Refresh transaction details to update receipt status
        const detailsResponse = await fetch(
          `/api/admin/transactions/${transactionDetails.id}`,
        );
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          if (detailsData.success) {
            setTransactionDetails(detailsData.transaction);
          }
        }
      } else {
        throw new Error(data.error || "Failed to send receipt");
      }
    } catch (error) {
      console.error("Error resending receipt:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Falha ao reenviar recibo",
      });
    } finally {
      setResendingReceipt(false);
    }
  };

  const handleMarkAsCompleted = async () => {
    if (!transactionDetails) return;
    if (transactionDetails.id.startsWith("order_")) return;

    // Confirm action
    if (
      !confirm("Tem certeza que deseja marcar esta transação como concluída?")
    ) {
      return;
    }

    setMarkingCompleted(true);
    try {
      const response = await fetch(
        `/api/admin/transactions/${transactionDetails.id}/mark-completed`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Sucesso",
          description: "Transação marcada como concluída com sucesso!",
          variant: "default",
        });

        // Refresh transaction details
        const detailsResponse = await fetch(
          `/api/admin/transactions/${transactionDetails.id}`,
        );
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          if (detailsData.success) {
            setTransactionDetails(detailsData.transaction);
            // Also refresh the transactions list
            fetchRealtimeTransactions();
          }
        }
      } else {
        throw new Error(
          data.error || "Failed to mark transaction as completed",
        );
      }
    } catch (error) {
      console.error("Error marking transaction as completed:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Falha ao marcar transação como concluída",
      });
    } finally {
      setMarkingCompleted(false);
    }
  };

  // Get receipt status from metadata
  const getReceiptStatus = () => {
    if (!transactionDetails?.metadata) return null;

    const metadata = transactionDetails.metadata as Record<string, unknown>;
    const receiptHistory = metadata.receiptHistory as
      | Array<{
          sentAt: string;
          success: boolean;
          error?: string;
        }>
      | undefined;

    if (!receiptHistory || receiptHistory.length === 0) {
      return null;
    }

    const lastReceipt = receiptHistory[receiptHistory.length - 1];
    return {
      sent: lastReceipt.success,
      sentAt: lastReceipt.sentAt,
      error: lastReceipt.error,
      count: receiptHistory.length,
    };
  };

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle transaction approval/rejection (skipConfirm = true when called from bulk action)
  const handleTransactionAction = async (
    transactionId: string,
    action: "approve" | "reject",
    options?: { skipConfirm?: boolean },
  ) => {
    if (action === "approve" && !options?.skipConfirm) {
      const first = window.confirm(
        "Tem certeza que deseja aprovar esta transação?",
      );
      if (!first) return;
      const second = window.confirm(
        "Confirmar novamente: deseja realmente marcar esta transação como concluída?",
      );
      if (!second) return;
    }

    setProcessingTransaction(transactionId);
    try {
      // For now, use mark-completed endpoint. In the future, we might need separate approve/reject endpoints
      const response = await fetch(
        `/api/admin/transactions/${transactionId}/mark-completed`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Sucesso",
          description:
            data.message ||
            `Transação ${action === "approve" ? "aprovada" : "processada"} com sucesso!`,
        });
        await fetchRealtimeTransactions();
        setAdminActivityLog((prev) => [
          {
            type: `transaction_${action}`,
            description: `Transação ${transactionId.substring(0, 8)}... ${action === "approve" ? "aprovada" : "processada"}`,
            timestamp: new Date().toISOString(),
          },
          ...prev.slice(0, 49),
        ]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update transaction");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : `Falha ao ${action === "approve" ? "aprovar" : "processar"} transação`,
      });
    } finally {
      setProcessingTransaction(null);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: "approve" | "reject") => {
    if (selectedTransactions.size === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione pelo menos uma transação",
      });
      return;
    }

    const firstConfirm = window.confirm(
      `Tem certeza que deseja ${action === "approve" ? "aprovar" : "rejeitar"} ${selectedTransactions.size} transação(ões)?`,
    );
    if (!firstConfirm) return;

    if (action === "approve") {
      const secondConfirm = window.confirm(
        `Confirmar novamente: deseja realmente aprovar ${selectedTransactions.size} transação(ões)?`,
      );
      if (!secondConfirm) return;
    }

    // Only real transactions can be marked completed; exclude orphan orders (order_xxx)
    const idsToProcess =
      action === "approve"
        ? Array.from(selectedTransactions).filter((id) => !id.startsWith("order_"))
        : Array.from(selectedTransactions);
    if (action === "approve" && idsToProcess.length < selectedTransactions.size) {
      const skipped = selectedTransactions.size - idsToProcess.length;
      toast({
        title: "Aviso",
        description: `${skipped} item(ns) ignorado(s) (ordem sem transação vinculada).`,
        variant: "default",
      });
    }

    const promises = idsToProcess.map((id) =>
      handleTransactionAction(id, action, { skipConfirm: true }),
    );

    await Promise.all(promises);
    setSelectedTransactions(new Set());
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Data", "Tipo", "Usuário", "Valor", "Status"];
    const rows = filteredAndSortedTransactions.map((tx) => [
      new Date(tx.date).toLocaleString("pt-BR"),
      getTransactionTypeLabel(tx.type),
      typeof tx.user === "string"
        ? tx.user
        : tx.user
          ? `${tx.user.name} (${tx.user.email})`
          : "N/A",
      formatCurrency(tx.value || 0),
      getStatusLabel(tx.status),
    ]);

    const csvContent =
      headers.join(",") +
      "\n" +
      rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: "Exportado",
      description: "Arquivo CSV gerado com sucesso!",
    });
  };

  // Toggle transaction selection
  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all filtered transactions
  const toggleSelectAll = () => {
    if (selectedTransactions.size === filteredAndSortedTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(
        new Set(filteredAndSortedTransactions.map((tx) => tx.id)),
      );
    }
  };

  // Handle metric card click to filter
  const handleMetricCardClick = (type: string) => {
    setTypeFilter(type);
    setSearchTerm("");
  };

  const filteredAndSortedTransactions = transactions
    .filter((transaction) => {
      const userString =
        typeof transaction.user === "string"
          ? transaction.user
          : transaction.user
            ? `${transaction.user.name} ${transaction.user.email}`
            : "";

      // Search filter
      const matchesSearch =
        userString.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getTransactionTypeLabel(transaction.type)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        getStatusLabel(transaction.status)
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === "all" ||
        transaction.status === statusFilter ||
        (statusFilter === "PENDING" &&
          (transaction.status === "PENDING" ||
            transaction.status === "PROCESSING" ||
            transaction.status === "EXECUTING")) ||
        (statusFilter === "APPROVED" &&
          (transaction.status === "APPROVED" ||
            transaction.status === "COMPLETED" ||
            transaction.status === "CONFIRMED")) ||
        (statusFilter === "REJECTED" &&
          (transaction.status === "REJECTED" ||
            transaction.status === "FAILED" ||
            transaction.status === "CANCELLED"));

      // Type filter
      const matchesType =
        typeFilter === "all" || transaction.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

  const fetchUsersList = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch("/api/admin/users?limit=1000");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsersList(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar lista de usuários",
      });
    } finally {
      setLoadingUsers(false);
    }
  }, [toast]);

  const handleOpenBalanceDialog = () => {
    setShowBalanceDialog(true);
    fetchUsersList();
  };

  const handleBalanceAdjustmentClick = (e?: React.MouseEvent) => {
    // Prevent any default form submission behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!balanceUserId || !balanceAmount || parseFloat(balanceAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos corretamente",
      });
      return;
    }

    setShowBalanceConfirmDialog(true);
    setBalanceConfirmStep(1);
  };

  const handleBalanceConfirm = () => {
    if (balanceConfirmStep === 1) {
      setBalanceConfirmStep(2);
    } else {
      setShowBalanceConfirmDialog(false);
      setBalanceConfirmStep(1);
      handleBalanceAdjustment();
    }
  };

  const handleBalanceAdjustment = async () => {
    if (!balanceUserId || !balanceAmount || parseFloat(balanceAmount) <= 0) {
      return;
    }

    try {
      setProcessingBalance(true);
      const response = await fetch("/api/admin/balance/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: balanceUserId,
          currency: balanceCurrency,
          amount: parseFloat(balanceAmount),
          operation: balanceOperation,
          reason: balanceReason || null,
        }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = "Falha ao ajustar saldo";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parse JSON response
      const data = await response.json();

      // Check for success in response data
      if (!data.success) {
        throw new Error(data.error || data.message || "Falha ao ajustar saldo");
      }

      toast({
        title: "✅ Sucesso",
        description: `Saldo ${
          balanceOperation === "CREDIT" ? "creditado" : "deduzido"
        } com sucesso! ${data.data?.userName ? `(${data.data.userName})` : ""}`,
      });

      // Reset form
      setBalanceUserId("");
      setBalanceAmount("");
      setBalanceReason("");
      setShowBalanceDialog(false);

      // Refresh transactions and finance data
      await Promise.all([fetchFinanceData(), fetchRealtimeTransactions()]);
    } catch (error) {
      console.error("Balance adjustment error:", error);
      toast({
        variant: "destructive",
        title: "❌ Erro",
        description:
          error instanceof Error ? error.message : "Falha ao ajustar saldo",
      });
    } finally {
      setProcessingBalance(false);
    }
  };

  const handleLogout = async () => {
    try {
      document.cookie =
        "better-auth.session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      router.push("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleResetFinance = async () => {
    try {
      const confirmed = window.confirm(
        "⚠️ ATENÇÃO: Esta ação irá resetar TODOS os dados financeiros da plataforma!\n\n" +
          "Isso inclui:\n" +
          "• Todos os depósitos\n" +
          "• Todos os saques\n" +
          "• Todas as transações\n" +
          "• Todos os saldos dos usuários\n\n" +
          "Esta ação NÃO pode ser desfeita!\n\n" +
          "Tem certeza que deseja continuar?",
      );

      if (!confirmed) {
        return;
      }

      const response = await fetch("/api/admin/reset-finance", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reset finance data");
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Reset Concluído",
          description: "Dados financeiros resetados com sucesso!",
        });

        // Refresh the dashboard data
        await fetchStats();
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Reset finance error:", error);
      toast({
        variant: "destructive",
        title: "❌ Erro no Reset",
        description: "Falha ao resetar dados financeiros",
      });
    }
  };

  const handleDownloadReport = async (format: "pdf" | "excel") => {
    try {
      setDownloadingReport(true);
      const url = `/api/admin/reports/monthly-${format}?month=${selectedMonth}&year=${selectedYear}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to generate ${format.toUpperCase()} report`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `transactions-${selectedMonth}-${selectedYear}.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "✅ Download Iniciado",
        description: `Relatório ${format.toUpperCase()} gerado com sucesso!`,
      });
    } catch (error) {
      console.error(`Error downloading ${format} report:`, error);
      toast({
        variant: "destructive",
        title: "❌ Erro",
        description: `Falha ao gerar relatório ${format.toUpperCase()}`,
      });
    } finally {
      setDownloadingReport(false);
    }
  };

  // Fetch recent activity
  const fetchRecentActivity = useCallback(async () => {
    try {
      const [usersRes, transactionsRes, kycRes] = await Promise.all([
        fetch("/api/admin/users?limit=5&sort=createdAt:desc"),
        fetch("/api/admin/transactions/realtime?limit=5"),
        fetch("/api/admin/kyc?limit=5&status=PENDING"),
      ]);

      const activities: ActivityFeedItem[] = [];

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        usersData.users?.forEach((user: ApiUserRecord) => {
          activities.push({
            type: "user_registered",
            title: "Novo usuário registrado",
            description: `${user.name} (${user.email})`,
            timestamp: user.createdAt ?? "",
            link: `/admin/users/${user.id}`,
            icon: UserPlus,
            color: "blue",
          });
        });
      }

      if (transactionsRes.ok) {
        const txData = await transactionsRes.json();
        txData.transactions?.slice(0, 3).forEach((tx: ApiTxRecord) => {
          activities.push({
            type: "transaction",
            title: `Transação ${tx.type}`,
            description: `${formatCurrency(tx.value || 0)} - ${tx.user?.name || "N/A"}`,
            timestamp: tx.date ?? "",
            link: "#",
            icon: DollarSign,
            color: tx.type === "DEPOSIT" ? "green" : "red",
          });
        });
      }

      if (kycRes.ok) {
        const kycData = await kycRes.json();
        kycData.users?.slice(0, 2).forEach((user: ApiUserRecord) => {
          activities.push({
            type: "kyc_submitted",
            title: "KYC submetido",
            description: `${user.name} aguardando revisão`,
            timestamp: user.kycSubmittedAt ?? "",
            link: `/admin/kyc`,
            icon: FileText,
            color: "orange",
          });
        });
      }

      activities.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  }, []);

  // Fetch top users
  const fetchTopUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users?limit=100");
      if (response.ok) {
        const data = await response.json();
        const usersWithBalances = await Promise.all(
          (data.users || []).slice(0, 20).map(async (user: ApiUserRecord) => {
            try {
              const balanceRes = await fetch(
                `/api/admin/users/${user.id}?include=balance`,
              );
              if (balanceRes.ok) {
                const balanceData = await balanceRes.json();
                const totalBalance =
                  (balanceData.balances || []).reduce(
                    (sum: number, b: ApiBalanceRecord) => sum + (b.amount || 0),
                    0,
                  ) || 0;
                return { ...user, totalBalance };
              }
              return { ...user, totalBalance: 0 };
            } catch {
              return { ...user, totalBalance: 0 };
            }
          }),
        );

        usersWithBalances.sort((a, b) => b.totalBalance - a.totalBalance);
        setTopUsers(usersWithBalances.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching top users:", error);
    }
  }, []);

  // Check system health
  const checkSystemHealth = useCallback(async () => {
    try {
      // Check database
      const dbCheck = await fetch("/api/admin/stats");
      setSystemHealth((prev) => ({
        ...prev,
        database: dbCheck.ok ? "healthy" : "unhealthy",
      }));

      // Check API (simple ping)
      setSystemHealth((prev) => ({
        ...prev,
        api: "healthy",
      }));
    } catch (error) {
      setSystemHealth({
        database: "unhealthy",
        api: "unhealthy",
      });
    }
  }, []);

  // Quick search
  const performQuickSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setQuickSearchResults([]);
      return;
    }

    setLoadingQuickSearch(true);
    try {
      const [usersRes, transactionsRes] = await Promise.all([
        fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=5`),
        fetch(`/api/admin/transactions/realtime?limit=5`),
      ]);

      const results: QuickSearchResultItem[] = [];

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        usersData.users?.forEach((user: ApiUserRecord) => {
          if (
            user.name?.toLowerCase().includes(query.toLowerCase()) ||
            user.email?.toLowerCase().includes(query.toLowerCase())
          ) {
            results.push({
              type: "user",
              title: user.name ?? "",
              subtitle: user.email,
              link: `/admin/users/${user.id}`,
              icon: Users,
            });
          }
        });
      }

      if (transactionsRes.ok) {
        const txData = await transactionsRes.json();
        txData.transactions
          ?.filter(
            (tx: ApiTxRecord) =>
              tx.user?.name?.toLowerCase().includes(query.toLowerCase()) ||
              tx.user?.email?.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 3)
          .forEach((tx: ApiTxRecord) => {
            results.push({
              type: "transaction",
              title: `${getTransactionTypeLabel(tx.type)} - ${formatCurrency(tx.value || 0)}`,
              subtitle: tx.user?.name || "N/A",
              link: "#",
              icon: DollarSign,
            });
          });
      }

      setQuickSearchResults(results);
    } catch (error) {
      console.error("Error performing quick search:", error);
    } finally {
      setLoadingQuickSearch(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performQuickSearch(quickSearchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [quickSearchQuery, performQuickSearch]);

  // Close quick search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".quick-search-container")) {
        setShowQuickSearch(false);
      }
    };

    if (showQuickSearch) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showQuickSearch]);

  // Load all initial data in parallel for faster page load
  useEffect(() => {
    setLoading(true);
    setTransactionsLoading(true);

    // Fetch all initial data in parallel
    Promise.all([
      fetchStats(),
      fetchFinanceData(),
      fetchRealtimeTransactions(),
      fetchRecentActivity(),
      fetchTopUsers(),
      checkSystemHealth(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [
    fetchStats,
    fetchFinanceData,
    fetchRealtimeTransactions,
    fetchRecentActivity,
    fetchTopUsers,
    checkSystemHealth,
  ]);

  // Real-time polling for transactions (every 5 seconds)
  useEffect(() => {
    setIsPolling(true);
    const interval = setInterval(() => {
      // Only fetch new transactions since last update
      fetchRealtimeTransactions(lastUpdateTime);
    }, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [fetchRealtimeTransactions, lastUpdateTime]);

  // Don't block the entire page - show skeleton loaders instead

  return (
    <div className="min-h-full bg-black text-white">
      <div className="max-w-[1920px] mx-auto space-y-8">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Visão geral e configurações
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative quick-search-container order-first w-full sm:order-none sm:w-52">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={quickSearchQuery}
                onChange={(e) => {
                  setQuickSearchQuery(e.target.value);
                  setShowQuickSearch(true);
                }}
                onFocus={() => setShowQuickSearch(true)}
                className="h-9 pl-9 pr-8 bg-gray-900 border-gray-700 text-white placeholder-gray-400 text-sm"
              />
              {quickSearchQuery && (
                <X
                  className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-white"
                  onClick={() => {
                    setQuickSearchQuery("");
                    setShowQuickSearch(false);
                    setQuickSearchResults([]);
                  }}
                />
              )}
              {showQuickSearch &&
                (quickSearchQuery.length >= 2 ||
                  quickSearchResults.length > 0) && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
                    {loadingQuickSearch ? (
                      <div className="flex items-center justify-center p-4">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      </div>
                    ) : quickSearchResults.length > 0 ? (
                      <div className="py-1">
                        {quickSearchResults.map((result, idx) => {
                          const Icon = result.icon;
                          return (
                            <div
                              key={idx}
                              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-800"
                              onClick={() => {
                                router.push(result.link);
                                setShowQuickSearch(false);
                                setQuickSearchQuery("");
                              }}
                            >
                              <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm text-white">
                                  {result.title}
                                </p>
                                {result.subtitle && (
                                  <p className="truncate text-xs text-gray-400">
                                    {result.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : quickSearchQuery.length >= 2 ? (
                      <p className="p-3 text-center text-sm text-gray-400">
                        Nenhum resultado
                      </p>
                    ) : null}
                  </div>
                )}
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900/80 px-2 py-1.5">
              {isPolling ? (
                <>
                  <Wifi className="h-4 w-4 text-green-400 animate-pulse" />
                  <span className="text-xs text-gray-300">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Offline</span>
                </>
              )}
            </div>
            <Button
              size="sm"
              onClick={fetchStats}
              variant="outline"
              className="h-9 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Atualizar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  disabled={downloadingReport}
                >
                  <FileDown className="h-4 w-4 mr-1.5" />
                  {downloadingReport ? "…" : "Relatórios"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border-gray-700 bg-gray-900"
              >
                <DropdownMenuLabel className="text-white">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Período
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                <div className="space-y-2 p-2">
                  <div className="flex gap-2">
                    <Select
                      value={String(selectedMonth)}
                      onValueChange={(v) => setSelectedMonth(parseInt(v))}
                    >
                      <SelectTrigger className="h-8 w-24 border-gray-700 bg-gray-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-gray-700 bg-gray-900">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                          (m) => (
                            <SelectItem
                              key={m}
                              value={String(m)}
                              className="text-white hover:bg-gray-800"
                            >
                              {String(m).padStart(2, "0")}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(selectedYear)}
                      onValueChange={(v) => setSelectedYear(parseInt(v))}
                    >
                      <SelectTrigger className="h-8 w-28 border-gray-700 bg-gray-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-gray-700 bg-gray-900">
                        {Array.from(
                          { length: 10 },
                          (_, i) => new Date().getFullYear() - i,
                        ).map((y) => (
                          <SelectItem
                            key={y}
                            value={String(y)}
                            className="text-white hover:bg-gray-800"
                          >
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem
                  onClick={() => handleDownloadReport("pdf")}
                  disabled={downloadingReport}
                  className="cursor-pointer text-gray-300 hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDownloadReport("excel")}
                  disabled={downloadingReport}
                  className="cursor-pointer text-gray-300 hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              onClick={handleResetFinance}
              variant="outline"
              className="h-9 border-red-800/50 text-red-400 hover:bg-red-900/30 hover:text-red-300"
            >
              <Shield className="h-4 w-4 mr-1.5" />
              Reset Finance
            </Button>
          </div>
        </div>

        {/* Métricas */}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
            Métricas
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {/* Total Users */}
          <Link href="/admin/users">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-blue-500 transition-all duration-200 cursor-pointer group h-full">
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-4 w-4 text-blue-400 group-hover:text-blue-300" />
                  {statsLoading ? (
                    <div className="h-5 w-8 bg-gray-700 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-xl lg:text-2xl font-bold text-white">
                      {stats.totalUsers}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400">Total Users</p>
              </CardContent>
            </Card>
          </Link>

          {/* Pending Approvals */}
          <Link href="/admin/users">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-yellow-500 transition-all duration-200 cursor-pointer group h-full">
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-4 w-4 text-yellow-400 group-hover:text-yellow-300" />
                  {statsLoading ? (
                    <div className="h-5 w-8 bg-gray-700 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-xl lg:text-2xl font-bold text-yellow-400">
                      {stats.pendingApprovals}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400">Pendentes</p>
              </CardContent>
            </Card>
          </Link>

          {/* Approved Users */}
          <Link href="/admin/users">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-green-500 transition-all duration-200 cursor-pointer group h-full">
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="h-4 w-4 text-green-400 group-hover:text-green-300" />
                  {statsLoading ? (
                    <div className="h-5 w-8 bg-gray-700 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-xl lg:text-2xl font-bold text-green-400">
                      {stats.approvedUsers}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400">Aprovados</p>
              </CardContent>
            </Card>
          </Link>

          {/* Rejected Users */}
          <Link href="/admin/users">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-red-500 transition-all duration-200 cursor-pointer group h-full">
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center justify-between mb-2">
                  <X className="h-4 w-4 text-red-400 group-hover:text-red-300" />
                  {statsLoading ? (
                    <div className="h-5 w-8 bg-gray-700 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-xl lg:text-2xl font-bold text-red-400">
                      {stats.rejectedUsers}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400">Rejeitados</p>
              </CardContent>
            </Card>
          </Link>

          {/* Pending KYC */}
          <Link href="/admin/kyc">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-orange-500 transition-all duration-200 cursor-pointer group h-full">
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="h-4 w-4 text-orange-400 group-hover:text-orange-300" />
                  {statsLoading ? (
                    <div className="h-5 w-8 bg-gray-700 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-xl lg:text-2xl font-bold text-orange-400">
                      {stats.pendingKYC}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400">KYC Pendente</p>
              </CardContent>
            </Card>
          </Link>

          {/* Approved KYC */}
          <Link href="/admin/kyc">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-green-500 transition-all duration-200 cursor-pointer group h-full">
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center justify-between mb-2">
                  <Shield className="h-4 w-4 text-green-400 group-hover:text-green-300" />
                  {statsLoading ? (
                    <div className="h-5 w-8 bg-gray-700 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-xl lg:text-2xl font-bold text-green-400">
                      {stats.approvedKYC}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400">KYC Aprovado</p>
              </CardContent>
            </Card>
          </Link>

          {/* Rejected KYC */}
          <Link href="/admin/kyc">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-red-500 transition-all duration-200 cursor-pointer group h-full">
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center justify-between mb-2">
                  <Shield className="h-4 w-4 text-red-400 group-hover:text-red-300" />
                  {statsLoading ? (
                    <div className="h-5 w-8 bg-gray-700 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-xl lg:text-2xl font-bold text-red-400">
                      {stats.rejectedKYC}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400">KYC Rejeitado</p>
              </CardContent>
            </Card>
          </Link>
          </div>
        </section>

        {/* Atalhos */}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
            Atalhos
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
          <Link href="/admin/users">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-blue-500 transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[100px]">
                <Users className="w-6 h-6 text-blue-400 mb-2" />
                <CardTitle className="text-sm text-white mb-1">
                  Usuários
                </CardTitle>
                <p className="text-xs text-gray-400">Gerenciar usuários</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/kyc">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-green-500 transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[100px]">
                <FileText className="w-6 h-6 text-green-400 mb-2" />
                <CardTitle className="text-sm text-white mb-1">KYC</CardTitle>
                <p className="text-xs text-gray-400">Verificar documentos</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/notification-center">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-purple-500 transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[100px]">
                <Mail className="w-6 h-6 text-purple-400 mb-2" />
                <CardTitle className="text-sm text-white mb-1">
                  Notificações
                </CardTitle>
                <p className="text-xs text-gray-400">Enviar mensagens</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/webhook-logs">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-blue-500 transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[100px]">
                <Webhook className="w-6 h-6 text-blue-400 mb-2" />
                <CardTitle className="text-sm text-white mb-1">
                  Webhooks
                </CardTitle>
                <p className="text-xs text-gray-400">Ver logs</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/audit-log">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-amber-500 transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[100px]">
                <ScrollText className="w-6 h-6 text-amber-400 mb-2" />
                <CardTitle className="text-sm text-white mb-1">
                  Audit log
                </CardTitle>
                <p className="text-xs text-gray-400">Histórico de ações</p>
              </CardContent>
            </Card>
          </Link>
          </div>
        </section>

        {/* Configuração da plataforma */}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
            Configuração da plataforma
          </h2>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-base text-white">
                Depósitos e saques
                {depositsDisabled || withdrawalsDisabled ? (
                  <WifiOff className="h-4 w-4 text-red-400" />
                ) : (
                  <Wifi className="h-4 w-4 text-green-400" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Deposits Control */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={depositsDisabled}
                    onCheckedChange={(checked) =>
                      setDepositsDisabled(checked === true)
                    }
                    disabled={moneyControlsLoading || savingMoneyControls}
                    className="mt-1 border-gray-600 data-[state=checked]:bg-red-600"
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-gray-200">
                      Desativar depósitos
                    </p>
                    <p className="text-xs text-gray-400">
                      Bloqueia APIs de depósito e exibe a mensagem aos usuários.
                    </p>
                  </div>
                </div>

                {depositsDisabled && (
                  <div className="ml-7 space-y-2">
                    <Label className="text-xs text-gray-300">
                      Mensagem de depósito
                    </Label>
                    <Textarea
                      value={depositsDisabledMessage}
                      onChange={(e) =>
                        setDepositsDisabledMessage(e.target.value)
                      }
                      placeholder="Deposits are temporarily disabled..."
                      className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 text-sm"
                      rows={3}
                      disabled={moneyControlsLoading || savingMoneyControls}
                    />
                  </div>
                )}
              </div>

              {/* Withdrawals Control */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={withdrawalsDisabled}
                    onCheckedChange={(checked) =>
                      setWithdrawalsDisabled(checked === true)
                    }
                    disabled={moneyControlsLoading || savingMoneyControls}
                    className="mt-1 border-gray-600 data-[state=checked]:bg-red-600"
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-gray-200">
                      Desativar saques
                    </p>
                    <p className="text-xs text-gray-400">
                      Bloqueia APIs de saque e exibe a mensagem aos usuários.
                    </p>
                  </div>
                </div>

                {withdrawalsDisabled && (
                  <div className="ml-7 space-y-2">
                    <Label className="text-xs text-gray-300">
                      Mensagem de saque
                    </Label>
                    <Textarea
                      value={withdrawalsDisabledMessage}
                      onChange={(e) =>
                        setWithdrawalsDisabledMessage(e.target.value)
                      }
                      placeholder="Withdrawals are temporarily disabled..."
                      className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 text-sm"
                      rows={3}
                      disabled={moneyControlsLoading || savingMoneyControls}
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-gray-800 pt-6">
                <p className="mb-4 text-sm font-medium text-gray-300">
                  Limites e manutenção
                </p>
              </div>
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm font-medium">
                  Máx. depósito (USDT)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={100000}
                  value={maxDepositUsdt}
                  onChange={(e) =>
                    setMaxDepositUsdt(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  disabled={moneyControlsLoading || savingMoneyControls}
                  className="bg-gray-800/50 border-gray-700 text-white max-w-[160px]"
                />
                <p className="text-xs text-gray-500">
                  Above this limit users are directed to contact support via WhatsApp.
                </p>
              </div>

              {/* Manutenção programada */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-300">
                  Manutenção programada
                </Label>
                <Textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="e.g. Maintenance on Sunday 2am–4am BRT"
                  className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 text-sm"
                  rows={2}
                  disabled={moneyControlsLoading || savingMoneyControls}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-400">Início (local)</Label>
                    <Input
                      type="datetime-local"
                      value={maintenanceStartAt}
                      onChange={(e) => setMaintenanceStartAt(e.target.value)}
                      disabled={moneyControlsLoading || savingMoneyControls}
                      className="bg-gray-800/50 border-gray-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Fim (local)</Label>
                    <Input
                      type="datetime-local"
                      value={maintenanceEndAt}
                      onChange={(e) => setMaintenanceEndAt(e.target.value)}
                      disabled={moneyControlsLoading || savingMoneyControls}
                      className="bg-gray-800/50 border-gray-700 text-white text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Mensagem exibida na página de trade quando estiver no período.
                </p>
              </div>

              <Button
                onClick={saveMoneyControls}
                disabled={moneyControlsLoading || savingMoneyControls}
                className={`w-full ${
                  depositsDisabled || withdrawalsDisabled
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                } text-white`}
              >
                <Send className="mr-2 h-4 w-4" />
                {savingMoneyControls ? "Salvando…" : "Salvar e notificar usuários"}
              </Button>

              {moneyControlsMeta?.updatedAt ? (
                <p className="text-xs text-gray-500">
                  Última atualização:{" "}
                  {new Date(moneyControlsMeta.updatedAt).toLocaleString()}{" "}
                  {moneyControlsMeta.updatedBy
                    ? `(${moneyControlsMeta.updatedBy})`
                    : ""}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>

        {/* Atividade e transações */}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
            Atividade e transações
          </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="bg-gray-900 border-gray-800 lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-400" />
                  Atividade Recente
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchRecentActivity}
                  className="text-gray-400 hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma atividade recente</p>
                  </div>
                ) : (
                  recentActivity.map((activity, idx) => {
                    const Icon = activity.icon;
                    const timeAgo = formatTimeAgo(activity.timestamp);
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer"
                        onClick={() => router.push(activity.link)}
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            activity.color === "blue"
                              ? "bg-blue-900/30"
                              : activity.color === "green"
                                ? "bg-green-900/30"
                                : activity.color === "orange"
                                  ? "bg-orange-900/30"
                                  : "bg-gray-800"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${
                              activity.color === "blue"
                                ? "text-blue-400"
                                : activity.color === "green"
                                  ? "text-green-400"
                                  : activity.color === "orange"
                                    ? "text-orange-400"
                                    : "text-gray-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {timeAgo}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Users & System Health */}
          <div className="space-y-4">
            {/* Top Priority Users */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  Top Priority Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topUsers.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      Carregando...
                    </div>
                  ) : (
                    topUsers.map((user, idx) => (
                      <div
                        key={user.id}
                        className="flex items-center p-2 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/users/${user.id}`)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Server className="h-5 w-5 text-blue-400" />
                  Status do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-300">
                        Banco de Dados
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {systemHealth.database === "healthy" ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          <span className="text-xs text-green-400">Online</span>
                        </>
                      ) : systemHealth.database === "checking" ? (
                        <>
                          <Clock className="h-4 w-4 text-yellow-400 animate-pulse" />
                          <span className="text-xs text-yellow-400">
                            Verificando
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-400" />
                          <span className="text-xs text-red-400">Offline</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-300">API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {systemHealth.api === "healthy" ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          <span className="text-xs text-green-400">Online</span>
                        </>
                      ) : systemHealth.api === "checking" ? (
                        <>
                          <Clock className="h-4 w-4 text-yellow-400 animate-pulse" />
                          <span className="text-xs text-yellow-400">
                            Verificando
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-400" />
                          <span className="text-xs text-red-400">Offline</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkSystemHealth}
                    className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verificar Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </section>

        {/* Admin Activity Log */}
        {adminActivityLog.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-400" />
                Log de Atividades do Admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {adminActivityLog.slice(0, 10).map((log, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/30"
                  >
                    <div className="flex-shrink-0">
                      {log.type.includes("approve") ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : log.type.includes("reject") ? (
                        <X className="h-4 w-4 text-red-400" />
                      ) : (
                        <Activity className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{log.description}</p>
                      <p className="text-xs text-gray-400">
                        {formatTimeAgo(log.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visão financeira */}
        <section>
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-gray-500">
            Visão financeira
          </h2>
          <p className="mb-4 text-sm text-gray-400">
            Movimentação financeira em tempo real
          </p>
        <div className="space-y-4">

          {/* Finance Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {/* Total Deposits */}
            <CustomTooltip
              content={
                <HistoryTooltipContent
                  metric="deposits"
                  title="Histórico de Depósitos"
                />
              }
              side="top"
              hoverable
            >
              <Card
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-green-500 transition-all duration-200 cursor-pointer h-full"
                onMouseEnter={() => fetchHistory("deposits", 7)}
                onClick={() => handleMetricCardClick("DEPOSIT")}
              >
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    {financeLoading ? (
                      <div className="h-5 w-16 bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-lg lg:text-xl font-bold text-white">
                        {formatCurrency(financeStats.totalDeposits).replace(
                          "R$",
                          "R$",
                        ).length > 15
                          ? formatCurrency(
                              financeStats.totalDeposits,
                            ).substring(0, 12) + "..."
                          : formatCurrency(financeStats.totalDeposits)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Depósitos</p>
                    {!financeLoading && (
                      <div className="flex items-center">
                        {financeStats.depositsChange >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-green-400" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-400" />
                        )}
                        <span
                          className={`text-xs ml-0.5 ${
                            financeStats.depositsChange >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {formatPercentage(financeStats.depositsChange)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CustomTooltip>

            {/* Total Withdrawals */}
            <CustomTooltip
              content={
                <HistoryTooltipContent
                  metric="withdrawals"
                  title="Histórico de Saques"
                />
              }
              side="top"
              hoverable
            >
              <Card
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-red-500 transition-all duration-200 cursor-pointer h-full"
                onMouseEnter={() => fetchHistory("withdrawals", 7)}
                onClick={() => handleMetricCardClick("WITHDRAWAL")}
              >
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <ArrowDownRight className="h-4 w-4 text-red-400" />
                    {financeLoading ? (
                      <div className="h-5 w-16 bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-lg lg:text-xl font-bold text-white">
                        {formatCurrency(financeStats.totalWithdrawals).replace(
                          "R$",
                          "R$",
                        ).length > 15
                          ? formatCurrency(
                              financeStats.totalWithdrawals,
                            ).substring(0, 12) + "..."
                          : formatCurrency(financeStats.totalWithdrawals)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Saques</p>
                    {!financeLoading && (
                      <div className="flex items-center">
                        {financeStats.withdrawalsChange >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-green-400" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-400" />
                        )}
                        <span
                          className={`text-xs ml-0.5 ${
                            financeStats.withdrawalsChange >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {formatPercentage(financeStats.withdrawalsChange)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CustomTooltip>

            {/* Total Trades */}
            <CustomTooltip
              content={
                <HistoryTooltipContent
                  metric="trades"
                  title="Histórico de Trades"
                />
              }
              side="top"
              hoverable
            >
              <Card
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-blue-500 transition-all duration-200 cursor-pointer h-full"
                onMouseEnter={() => fetchHistory("trades", 7)}
              >
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                    {financeLoading ? (
                      <div className="h-5 w-16 bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-lg lg:text-xl font-bold text-white">
                        {formatCurrency(financeStats.totalTrades).replace(
                          "R$",
                          "R$",
                        ).length > 15
                          ? formatCurrency(financeStats.totalTrades).substring(
                              0,
                              12,
                            ) + "..."
                          : formatCurrency(financeStats.totalTrades)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Trades</p>
                    {!financeLoading && (
                      <div className="flex items-center">
                        {financeStats.tradesChange >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-green-400" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-400" />
                        )}
                        <span
                          className={`text-xs ml-0.5 ${
                            financeStats.tradesChange >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {formatPercentage(financeStats.tradesChange)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CustomTooltip>

            {/* Total Commissions */}
            <CustomTooltip
              content={
                <HistoryTooltipContent
                  metric="commissions"
                  title="Histórico de Comissões"
                />
              }
              side="top"
              hoverable
            >
              <Card
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-purple-500 transition-all duration-200 cursor-pointer h-full"
                onMouseEnter={() => fetchHistory("commissions", 7)}
              >
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <PieChart className="h-4 w-4 text-purple-400" />
                    {financeLoading ? (
                      <div className="h-5 w-16 bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-lg lg:text-xl font-bold text-white">
                        {formatCurrency(financeStats.totalCommissions).replace(
                          "R$",
                          "R$",
                        ).length > 15
                          ? formatCurrency(
                              financeStats.totalCommissions,
                            ).substring(0, 12) + "..."
                          : formatCurrency(financeStats.totalCommissions)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Comissões</p>
                    {!financeLoading && (
                      <div className="flex items-center">
                        {financeStats.commissionsChange >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-green-400" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-400" />
                        )}
                        <span
                          className={`text-xs ml-0.5 ${
                            financeStats.commissionsChange >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {formatPercentage(financeStats.commissionsChange)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CustomTooltip>

            {/* Average User Balance */}
            <CustomTooltip
              content={
                <HistoryTooltipContent
                  metric="balance"
                  title="Histórico de Saldo Médio"
                />
              }
              side="top"
              hoverable
            >
              <Card
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-yellow-500 transition-all duration-200 cursor-pointer h-full"
                onMouseEnter={() => fetchHistory("balance", 7)}
              >
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="h-4 w-4 text-yellow-400" />
                    {financeLoading ? (
                      <div className="h-5 w-16 bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-lg lg:text-xl font-bold text-white">
                        {formatCurrency(
                          financeStats.averageUserBalance,
                        ).replace("R$", "R$").length > 15
                          ? formatCurrency(
                              financeStats.averageUserBalance,
                            ).substring(0, 12) + "..."
                          : formatCurrency(financeStats.averageUserBalance)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Saldo Médio</p>
                    {!financeLoading && (
                      <div className="flex items-center">
                        {financeStats.balanceChange >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-green-400" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-400" />
                        )}
                        <span
                          className={`text-xs ml-0.5 ${
                            financeStats.balanceChange >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {formatPercentage(financeStats.balanceChange)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CustomTooltip>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Area Chart - Deposits and Withdrawals */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Evolução dos Depósitos e Saques
                  </CardTitle>
                  <Select
                    value={String(chartDateRange)}
                    onValueChange={(value) => setChartDateRange(Number(value))}
                  >
                    <SelectTrigger className="w-32 h-8 bg-gray-800 border-gray-700 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem
                        value="7"
                        className="text-white hover:bg-gray-800"
                      >
                        7 dias
                      </SelectItem>
                      <SelectItem
                        value="30"
                        className="text-white hover:bg-gray-800"
                      >
                        30 dias
                      </SelectItem>
                      <SelectItem
                        value="90"
                        className="text-white hover:bg-gray-800"
                      >
                        90 dias
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorDeposits"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#10B981"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10B981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="colorWithdrawals"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#EF4444"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#EF4444"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#374151"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="#9CA3AF"
                        fontSize={11}
                        tick={{ fill: "#9CA3AF" }}
                        tickLine={{ stroke: "#4B5563" }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        fontSize={11}
                        tick={{ fill: "#9CA3AF" }}
                        tickLine={{ stroke: "#4B5563" }}
                        width={70}
                        tickFormatter={(value) => {
                          if (value >= 1000000) {
                            return `R$${(value / 1000000).toFixed(1)}M`;
                          }
                          if (value >= 1000) {
                            return `R$${(value / 1000).toFixed(1)}k`;
                          }
                          return `R$${value}`;
                        }}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          border: "1px solid #4B5563",
                          borderRadius: "8px",
                          color: "#F3F4F6",
                          padding: "12px",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
                        }}
                        labelStyle={{
                          color: "#F3F4F6",
                          fontWeight: "600",
                          marginBottom: "8px",
                        }}
                        itemStyle={{
                          color: "#D1D5DB",
                          padding: "4px 0",
                        }}
                        labelFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          });
                        }}
                        formatter={(value: number, name: string) => {
                          const formatted =
                            value >= 1000
                              ? `R$ ${(value / 1000).toFixed(2)}k`
                              : `R$ ${value.toFixed(2)}`;
                          return [
                            formatted,
                            name === "deposits" ? "Depósitos" : "Saques",
                          ];
                        }}
                        cursor={{ stroke: "#6B7280", strokeWidth: 1 }}
                      />
                      <Legend
                        wrapperStyle={{ color: "#9CA3AF", paddingTop: "20px" }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Area
                        type="monotone"
                        dataKey="deposits"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        fill="url(#colorDeposits)"
                        name="Depósitos"
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: "#10B981",
                          stroke: "#10B981",
                          strokeWidth: 2,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="withdrawals"
                        stroke="#EF4444"
                        strokeWidth={2.5}
                        fill="url(#colorWithdrawals)"
                        name="Saques"
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: "#EF4444",
                          stroke: "#EF4444",
                          strokeWidth: 2,
                        }}
                      />
                      <ReferenceLine
                        y={0}
                        stroke="#6B7280"
                        strokeDasharray="2 2"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Carregando dados...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart - Daily Trade Volume */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    Volume Diário de Trades
                  </CardTitle>
                  <Select
                    value={String(chartDateRange)}
                    onValueChange={(value) => setChartDateRange(Number(value))}
                  >
                    <SelectTrigger className="w-32 h-8 bg-gray-800 border-gray-700 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem
                        value="7"
                        className="text-white hover:bg-gray-800"
                      >
                        7 dias
                      </SelectItem>
                      <SelectItem
                        value="30"
                        className="text-white hover:bg-gray-800"
                      >
                        30 dias
                      </SelectItem>
                      <SelectItem
                        value="90"
                        className="text-white hover:bg-gray-800"
                      >
                        90 dias
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorTrades"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3B82F6"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3B82F6"
                            stopOpacity={0.4}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#374151"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="#9CA3AF"
                        fontSize={11}
                        tick={{ fill: "#9CA3AF" }}
                        tickLine={{ stroke: "#4B5563" }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        fontSize={11}
                        tick={{ fill: "#9CA3AF" }}
                        tickLine={{ stroke: "#4B5563" }}
                        width={70}
                        tickFormatter={(value) => {
                          if (value >= 1000000) {
                            return `R$${(value / 1000000).toFixed(1)}M`;
                          }
                          if (value >= 1000) {
                            return `R$${(value / 1000).toFixed(1)}k`;
                          }
                          return `R$${value}`;
                        }}
                        domain={[0, "auto"]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          border: "1px solid #4B5563",
                          borderRadius: "8px",
                          color: "#F3F4F6",
                          padding: "12px",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
                        }}
                        labelStyle={{
                          color: "#F3F4F6",
                          fontWeight: "600",
                          marginBottom: "8px",
                        }}
                        itemStyle={{
                          color: "#D1D5DB",
                          padding: "4px 0",
                        }}
                        labelFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          });
                        }}
                        formatter={(value: number) => {
                          const formatted =
                            value >= 1000
                              ? `R$ ${(value / 1000).toFixed(2)}k`
                              : `R$ ${value.toFixed(2)}`;
                          return [formatted, "Volume de Trades"];
                        }}
                        cursor={{ fill: "#3B82F6", fillOpacity: 0.1 }}
                      />
                      <Legend
                        wrapperStyle={{ color: "#9CA3AF", paddingTop: "20px" }}
                        iconType="square"
                        iconSize={8}
                      />
                      <Bar
                        dataKey="trades"
                        fill="url(#colorTrades)"
                        name="Volume de Trades"
                        radius={[6, 6, 0, 0]}
                        stroke="#3B82F6"
                        strokeWidth={1}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Carregando dados...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </section>

        {/* Transações */}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
            Transações
          </h2>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">
                  Tabela detalhada
                </CardTitle>
                <Button
                  onClick={handleOpenBalanceDialog}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Ajustar Saldo
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar transações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem
                      value="all"
                      className="text-white hover:bg-gray-800"
                    >
                      Todos Status
                    </SelectItem>
                    <SelectItem
                      value="PENDING"
                      className="text-white hover:bg-gray-800"
                    >
                      Pendente
                    </SelectItem>
                    <SelectItem
                      value="APPROVED"
                      className="text-white hover:bg-gray-800"
                    >
                      Aprovado
                    </SelectItem>
                    <SelectItem
                      value="REJECTED"
                      className="text-white hover:bg-gray-800"
                    >
                      Rejeitado
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem
                      value="all"
                      className="text-white hover:bg-gray-800"
                    >
                      Todos Tipos
                    </SelectItem>
                    <SelectItem
                      value="DEPOSIT"
                      className="text-white hover:bg-gray-800"
                    >
                      Depósito
                    </SelectItem>
                    <SelectItem
                      value="WITHDRAWAL"
                      className="text-white hover:bg-gray-800"
                    >
                      Saque
                    </SelectItem>
                    <SelectItem
                      value="FEE"
                      className="text-white hover:bg-gray-800"
                    >
                      Comissão
                    </SelectItem>
                    <SelectItem
                      value="BUY_CRYPTO"
                      className="text-white hover:bg-gray-800"
                    >
                      Compra Crypto
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  placeholder="De"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36 bg-gray-800 border-gray-700 text-white text-sm"
                />
                <Input
                  type="date"
                  placeholder="Até"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-36 bg-gray-800 border-gray-700 text-white text-sm"
                />
                <Input
                  type="number"
                  placeholder="Valor mín."
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="w-28 bg-gray-800 border-gray-700 text-white text-sm"
                  min={0}
                  step="any"
                />
                <Input
                  type="number"
                  placeholder="Valor máx."
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="w-28 bg-gray-800 border-gray-700 text-white text-sm"
                  min={0}
                  step="any"
                />
                <Button
                  size="sm"
                  onClick={() => fetchRealtimeTransactions()}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Aplicar
                </Button>
                {selectedTransactions.size > 0 && (
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction("approve")}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aprovar ({selectedTransactions.size})
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleExportCSV}
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
                {(statusFilter !== "all" ||
                  typeFilter !== "all" ||
                  searchTerm ||
                  dateFrom ||
                  dateTo ||
                  amountMin ||
                  amountMax) && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setStatusFilter("all");
                      setTypeFilter("all");
                      setSearchTerm("");
                      setDateFrom("");
                      setDateTo("");
                      setAmountMin("");
                      setAmountMax("");
                      fetchRealtimeTransactions();
                    }}
                    variant="ghost"
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 w-12">
                        <Checkbox
                          checked={
                            filteredAndSortedTransactions.length > 0 &&
                            selectedTransactions.size ===
                              filteredAndSortedTransactions.length
                          }
                          onCheckedChange={toggleSelectAll}
                          className="border-gray-600"
                        />
                      </th>
                      <th
                        className="text-left py-3 px-4 cursor-pointer hover:text-white text-gray-300"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center">
                          Data
                          <ArrowUpDown className="h-3 w-3 ml-1" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 cursor-pointer hover:text-white text-gray-300"
                        onClick={() => handleSort("type")}
                      >
                        <div className="flex items-center">
                          Tipo
                          <ArrowUpDown className="h-3 w-3 ml-1" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 cursor-pointer hover:text-white text-gray-300"
                        onClick={() => handleSort("user")}
                      >
                        <div className="flex items-center">
                          Usuário
                          <ArrowUpDown className="h-3 w-3 ml-1" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 cursor-pointer hover:text-white text-gray-300"
                        onClick={() => handleSort("value")}
                      >
                        <div className="flex items-center">
                          Valor
                          <ArrowUpDown className="h-3 w-3 ml-1" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 cursor-pointer hover:text-white text-gray-300"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center">
                          Status
                          <ArrowUpDown className="h-3 w-3 ml-1" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionsLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                            <p className="text-gray-400">
                              Carregando transações...
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredAndSortedTransactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-gray-400"
                        >
                          Nenhuma transação encontrada
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedTransactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b border-gray-800 hover:bg-gray-800 transition-colors"
                        >
                          <td
                            className="py-3 px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedTransactions.has(transaction.id)}
                              onCheckedChange={() =>
                                toggleTransactionSelection(transaction.id)
                              }
                              className="border-gray-600"
                            />
                          </td>
                          <td
                            className="py-3 px-4 text-gray-300 cursor-pointer"
                            onClick={() => handleTransactionClick(transaction)}
                          >
                            {new Date(transaction.date).toLocaleString(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              },
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                transaction.type === "DEPOSIT"
                                  ? "bg-green-900 text-green-300"
                                  : transaction.type === "WITHDRAWAL"
                                    ? "bg-red-900 text-red-300"
                                    : transaction.type === "FEE"
                                      ? "bg-purple-900 text-purple-300"
                                      : transaction.type === "BUY_CRYPTO"
                                        ? "bg-emerald-900 text-emerald-300"
                                        : transaction.type === "SELL_CRYPTO"
                                          ? "bg-orange-900 text-orange-300"
                                          : transaction.type === "REFUND"
                                            ? "bg-gray-900 text-gray-300"
                                            : "bg-gray-900 text-gray-300"
                              }`}
                            >
                              {getTransactionTypeLabel(transaction.type)}
                            </span>
                          </td>
                          <td
                            className="py-3 px-4 text-gray-300"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {typeof transaction.user === "string" ? (
                              transaction.user
                            ) : transaction.user ? (
                              <button
                                onClick={() => {
                                  if (transaction.userId) {
                                    router.push(
                                      `/admin/users/${transaction.userId}`,
                                    );
                                  }
                                }}
                                className="text-blue-400 hover:text-blue-300 hover:underline"
                              >
                                {transaction.user.name} (
                                {transaction.user.email})
                              </button>
                            ) : (
                              "N/A"
                            )}
                          </td>
                          <td className="py-3 px-4 text-white font-medium">
                            {transaction.value && !isNaN(transaction.value)
                              ? formatCurrency(transaction.value)
                              : transaction.currency === "USDT"
                                ? formatUSDT(Math.abs(transaction.amount || 0))
                                : formatCurrency(0)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  transaction.status === "APPROVED" ||
                                  transaction.status === "COMPLETED" ||
                                  transaction.status === "CONFIRMED"
                                    ? "bg-green-900 text-green-300"
                                    : transaction.status === "PENDING" ||
                                        transaction.status === "PROCESSING" ||
                                        transaction.status === "EXECUTING"
                                      ? "bg-yellow-900 text-yellow-300"
                                      : transaction.status === "REJECTED" ||
                                          transaction.status === "FAILED" ||
                                          transaction.status === "CANCELLED"
                                        ? "bg-red-900 text-red-300"
                                        : "bg-gray-900 text-gray-300"
                                }`}
                              >
                                {getStatusLabel(transaction.status)}
                              </span>
                              {(transaction.status === "PENDING" ||
                                transaction.status === "PROCESSING") &&
                                !transaction.id.startsWith("order_") && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTransactionAction(
                                      transaction.id,
                                      "approve",
                                    );
                                  }}
                                  disabled={
                                    processingTransaction === transaction.id
                                  }
                                  className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-900/30"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Transaction Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                Detalhes da Transação
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Informações completas da transação
              </DialogDescription>
            </DialogHeader>
            {detailsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : transactionDetails ? (
              <div className="space-y-4 mt-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">ID da Transação</p>
                    <p className="text-white font-mono text-sm">
                      {transactionDetails.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Tipo</p>
                    <p className="text-white">
                      {getTransactionTypeLabel(transactionDetails.type)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm text-gray-400">Status</p>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                            transactionDetails.status === "APPROVED" ||
                            transactionDetails.status === "COMPLETED" ||
                            transactionDetails.status === "CONFIRMED"
                              ? "bg-green-900 text-green-300"
                              : transactionDetails.status === "PENDING" ||
                                  transactionDetails.status === "PROCESSING" ||
                                  transactionDetails.status === "EXECUTING"
                                ? "bg-yellow-900 text-yellow-300"
                                : "bg-red-900 text-red-300"
                          }`}
                        >
                          {getStatusLabel(transactionDetails.status)}
                        </span>
                      </div>
                      {(transactionDetails.status === "PENDING" ||
                        transactionDetails.status === "PROCESSING" ||
                        transactionDetails.status === "EXECUTING") &&
                        !transactionDetails.id.startsWith("order_") && (
                        <Button
                          onClick={handleMarkAsCompleted}
                          disabled={markingCompleted}
                          variant="outline"
                          size="sm"
                          className="border-green-600 text-green-400 hover:bg-green-900 hover:text-green-300 mt-5"
                        >
                          {markingCompleted ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Marcando...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Marcar como Concluída
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Data</p>
                    <p className="text-white">
                      {new Date(transactionDetails.createdAt).toLocaleString(
                        "pt-BR",
                      )}
                    </p>
                  </div>
                  {transactionDetails.description && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-400">Descrição</p>
                      <p className="text-white text-sm">
                        {transactionDetails.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="border-t border-gray-800 pt-4">
                  <h3 className="text-lg font-semibold mb-3">Usuário</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Nome</p>
                      <p className="text-white">
                        {transactionDetails.user.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="text-white">
                        {transactionDetails.user.email}
                      </p>
                    </div>
                    {/* Receipt Email Status - only for real transactions, not orphan orders */}
                    {(transactionDetails.type === "BUY_CRYPTO" ||
                      transactionDetails.type === "WITHDRAWAL") &&
                      !transactionDetails.id.startsWith("order_") && (
                      <div className="col-span-2 border-t border-gray-800 pt-4 mt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-400">
                                Status do Recibo por Email
                              </p>
                              {(() => {
                                const receiptStatus = getReceiptStatus();
                                if (!receiptStatus) {
                                  return (
                                    <p className="text-yellow-400 text-sm">
                                      Não enviado
                                    </p>
                                  );
                                }
                                return (
                                  <div className="flex items-center gap-2">
                                    {receiptStatus.sent ? (
                                      <>
                                        <CheckCircle className="h-4 w-4 text-green-400" />
                                        <p className="text-green-400 text-sm">
                                          Enviado em{" "}
                                          {new Date(
                                            receiptStatus.sentAt,
                                          ).toLocaleString("pt-BR")}
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <X className="h-4 w-4 text-red-400" />
                                        <p className="text-red-400 text-sm">
                                          Falha ao enviar
                                          {receiptStatus.error &&
                                            `: ${receiptStatus.error}`}
                                        </p>
                                      </>
                                    )}
                                    {receiptStatus.count > 1 && (
                                      <span className="text-xs text-gray-500">
                                        ({receiptStatus.count} tentativas)
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          <Button
                            onClick={handleResendReceipt}
                            disabled={resendingReceipt}
                            variant="outline"
                            size="sm"
                            className="border-gray-700 text-white hover:bg-gray-800"
                          >
                            {resendingReceipt ? (
                              <>
                                <Clock className="h-4 w-4 mr-2 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Reenviar Recibo
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    {transactionDetails.user.cpf && (
                      <div>
                        <p className="text-sm text-gray-400">CPF</p>
                        <p className="text-white">
                          {transactionDetails.user.cpf}
                        </p>
                      </div>
                    )}
                    {transactionDetails.user.phone && (
                      <div>
                        <p className="text-sm text-gray-400">Telefone</p>
                        <p className="text-white">
                          {transactionDetails.user.phone}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transaction Amount */}
                <div className="border-t border-gray-800 pt-4">
                  <h3 className="text-lg font-semibold mb-3">Valores</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Valor</p>
                      <p className="text-white font-semibold">
                        {formatCurrency(transactionDetails.amount)}{" "}
                        {transactionDetails.currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">
                        Saldo após transação
                      </p>
                      <p className="text-white">
                        {formatCurrency(transactionDetails.balance)}{" "}
                        {transactionDetails.currency}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Details (for BUY_CRYPTO) */}
                {transactionDetails.order && (
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-lg font-semibold mb-3">
                      Detalhes do Pedido
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">ID do Pedido</p>
                        <p className="text-white font-mono text-sm">
                          {transactionDetails.order.id}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">
                          Status do Pedido
                        </p>
                        <p className="text-white">
                          {transactionDetails.order.status}
                        </p>
                      </div>
                      {transactionDetails.order.externalOrderId && (
                        <div>
                          <p className="text-sm text-gray-400">ID Externo</p>
                          <p className="text-white font-mono text-sm">
                            {transactionDetails.order.externalOrderId}
                          </p>
                        </div>
                      )}
                      {transactionDetails.order.createdAt && (
                        <div>
                          <p className="text-sm text-gray-400">Criado em</p>
                          <p className="text-white">
                            {new Date(
                              transactionDetails.order.createdAt,
                            ).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      )}
                      {transactionDetails.order.executedAt && (
                        <div>
                          <p className="text-sm text-gray-400">Executado em</p>
                          <p className="text-white">
                            {new Date(
                              transactionDetails.order.executedAt,
                            ).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-400">Quantidade USDT</p>
                        <p className="text-white">
                          {Number(transactionDetails.order.amount)} USDT
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Valor Total BRL</p>
                        <p className="text-white">
                          {formatCurrency(
                            Number(transactionDetails.order.total),
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Taxa de Câmbio</p>
                        <p className="text-white">
                          {formatCurrency(
                            Number(transactionDetails.order.total) /
                              Number(transactionDetails.order.amount),
                          )}{" "}
                          BRL/USDT
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Calculation Breakdown (for BUY_CRYPTO orders) */}
                {transactionDetails.order &&
                  transactionDetails.type === "BUY_CRYPTO" && (
                    <div className="border-t border-gray-800 pt-4 mt-4">
                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-white text-lg">
                            📊 Cálculo do Valor Total
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between py-2 border-b border-gray-700">
                              <span className="text-gray-400">
                                Quantidade USDT:
                              </span>
                              <span className="text-white font-semibold">
                                {Number(
                                  transactionDetails.order.amount,
                                ).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 8,
                                })}{" "}
                                USDT
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-700">
                              <span className="text-gray-400">
                                Taxa de Câmbio:
                              </span>
                              <span className="text-white font-semibold">
                                {formatCurrency(
                                  Number(transactionDetails.order.total) /
                                    Number(transactionDetails.order.amount),
                                )}{" "}
                                BRL/USDT
                              </span>
                            </div>
                            <div className="bg-gray-900 rounded-lg p-4 my-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-300 text-sm">
                                  Cálculo:
                                </span>
                              </div>
                              <div className="text-white font-mono text-sm space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">=</span>
                                  <span>
                                    {Number(
                                      transactionDetails.order.amount,
                                    ).toLocaleString("pt-BR", {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 8,
                                    })}{" "}
                                    USDT
                                  </span>
                                  <span className="text-gray-500">×</span>
                                  <span>
                                    {formatCurrency(
                                      Number(transactionDetails.order.total) /
                                        Number(transactionDetails.order.amount),
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                                  <span className="text-gray-400">=</span>
                                  <span className="text-green-400 font-bold">
                                    {formatCurrency(
                                      Number(transactionDetails.order.total),
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 italic">
                              * A taxa de câmbio já inclui todas as taxas e
                              comissões aplicadas
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                {/* Deposit Details */}
                {transactionDetails.deposit && (
                  <div className="border-t border-gray-800 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">
                        Detalhes do Depósito
                      </h3>
                      {transactionDetails.deposit.status === "PENDING" && (
                        <Button
                          onClick={handleMarkAsCompleted}
                          disabled={markingCompleted}
                          variant="outline"
                          size="sm"
                          className="border-green-600 text-green-400 hover:bg-green-900 hover:text-green-300"
                        >
                          {markingCompleted ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Marcando...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Marcar como Concluída
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Status</p>
                        <p className="text-white">
                          {transactionDetails.deposit.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Valor</p>
                        <p className="text-white">
                          {formatCurrency(
                            Number(transactionDetails.deposit.amount),
                          )}
                        </p>
                      </div>
                      {transactionDetails.deposit.externalId && (
                        <div>
                          <p className="text-sm text-gray-400">ID Externo</p>
                          <p className="text-white font-mono text-sm">
                            {transactionDetails.deposit.externalId}
                          </p>
                        </div>
                      )}
                      {transactionDetails.deposit.confirmedAt && (
                        <div>
                          <p className="text-sm text-gray-400">Confirmado em</p>
                          <p className="text-white">
                            {new Date(
                              transactionDetails.deposit.confirmedAt,
                            ).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Withdrawal Details */}
                {transactionDetails.withdrawal && (
                  <div className="border-t border-gray-800 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">
                        Detalhes do Saque
                      </h3>
                      <div className="flex gap-2">
                        {(transactionDetails.withdrawal.status === "PENDING" ||
                          transactionDetails.withdrawal.status ===
                            "PROCESSING") &&
                        !transactionDetails.id.startsWith("order_") ? (
                          <>
                            <Button
                              onClick={handleSyncStatus}
                              disabled={syncingStatus}
                              variant="outline"
                              size="sm"
                              className="border-blue-600 text-blue-400 hover:bg-blue-900 hover:text-blue-300"
                            >
                              {syncingStatus ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  Sincronizando...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Sincronizar Status
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={handleMarkAsCompleted}
                              disabled={markingCompleted}
                              variant="outline"
                              size="sm"
                              className="border-green-600 text-green-400 hover:bg-green-900 hover:text-green-300"
                            >
                              {markingCompleted ? (
                                <>
                                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                                  Marcando...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Marcar como Concluída
                                </>
                              )}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Status</p>
                        <p className="text-white">
                          {transactionDetails.withdrawal.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Valor</p>
                        <p className="text-white">
                          {formatCurrency(
                            Number(transactionDetails.withdrawal.amount),
                          )}
                        </p>
                      </div>
                      {transactionDetails.withdrawal.hash && (
                        <div>
                          <p className="text-sm text-gray-400">Hash</p>
                          <p className="text-white font-mono text-sm break-all">
                            {transactionDetails.withdrawal.hash}
                          </p>
                        </div>
                      )}
                      {transactionDetails.withdrawal.protocol && (
                        <div>
                          <p className="text-sm text-gray-400">Protocolo</p>
                          <p className="text-white">
                            {transactionDetails.withdrawal.protocol}
                          </p>
                        </div>
                      )}
                      {transactionDetails.withdrawal.walletAddress && (
                        <div>
                          <p className="text-sm text-gray-400">
                            Endereço da Carteira
                          </p>
                          <p className="text-white font-mono text-sm break-all">
                            {transactionDetails.withdrawal.walletAddress}
                          </p>
                        </div>
                      )}
                      {transactionDetails.withdrawal.network && (
                        <div>
                          <p className="text-sm text-gray-400">Rede</p>
                          <p className="text-white">
                            {transactionDetails.withdrawal.network}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {transactionDetails.metadata && (
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-lg font-semibold mb-3">Metadados</h3>
                    <pre className="bg-gray-800 p-4 rounded text-xs overflow-x-auto">
                      {JSON.stringify(transactionDetails.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Webhook logs link */}
                <div className="border-t border-gray-800 pt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href="/admin/webhook-logs"
                    className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Ver logs de webhook
                  </Link>
                  {Boolean(
                    transactionDetails.order?.externalOrderId ||
                      (transactionDetails.metadata as Record<string, unknown>)
                        ?.orderId,
                  ) && (
                    <span className="text-gray-500 text-xs">
                      (ID externo / pedido para buscar nos logs)
                    </span>
                  )}
                </div>

                {/* Full log - complete transaction object */}
                <div className="border-t border-gray-800 pt-4">
                  <details className="group">
                    <summary className="cursor-pointer list-none flex items-center gap-2 text-lg font-semibold mb-3 text-gray-300 hover:text-white">
                      <span className="group-open:rotate-90 transition-transform inline-block">
                        ▶
                      </span>
                      Log completo
                    </summary>
                    <pre className="bg-gray-800 p-4 rounded text-xs overflow-x-auto max-h-80 overflow-y-auto border border-gray-700">
                      {JSON.stringify(transactionDetails, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Nenhum detalhe disponível
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Recent Activity Summary */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="h-6 w-6 text-green-400 mr-2" />
                  <div className="text-2xl font-bold text-green-400">
                    {stats.approvedUsers}
                  </div>
                </div>
                <div className="text-sm text-gray-300">Approved Users</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="h-6 w-6 text-yellow-400 mr-2" />
                  <div className="text-2xl font-bold text-yellow-400">
                    {stats.pendingApprovals}
                  </div>
                </div>
                <div className="text-sm text-gray-300">Pending Approvals</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <FileText className="h-6 w-6 text-orange-400 mr-2" />
                  <div className="text-2xl font-bold text-orange-400">
                    {stats.pendingKYC}
                  </div>
                </div>
                <div className="text-sm text-gray-300">Pending KYC</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Adjustment Dialog */}
      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <Wallet className="h-5 w-5 mr-2" />
              Ajustar Saldo do Usuário
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Creditar ou deduzir saldo de um usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="user-select" className="text-gray-300">
                Usuário
              </Label>
              <Select
                value={balanceUserId}
                onValueChange={setBalanceUserId}
                disabled={loadingUsers}
              >
                <SelectTrigger
                  id="user-select"
                  className="bg-gray-800 border-gray-700 text-white"
                >
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {usersList.map((user) => (
                    <SelectItem
                      key={user.id}
                      value={user.id}
                      className="text-white hover:bg-gray-700"
                    >
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="currency-select" className="text-gray-300">
                Moeda
              </Label>
              <Select
                value={balanceCurrency}
                onValueChange={(value) =>
                  setBalanceCurrency(value as "USDT" | "BRL")
                }
              >
                <SelectTrigger
                  id="currency-select"
                  className="bg-gray-800 border-gray-700 text-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem
                    value="USDT"
                    className="text-white hover:bg-gray-700"
                  >
                    USDT
                  </SelectItem>
                  <SelectItem
                    value="BRL"
                    className="text-white hover:bg-gray-700"
                  >
                    BRL
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="operation-select" className="text-gray-300">
                Operação
              </Label>
              <Select
                value={balanceOperation}
                onValueChange={(value) =>
                  setBalanceOperation(value as "CREDIT" | "DEDUCT")
                }
              >
                <SelectTrigger
                  id="operation-select"
                  className="bg-gray-800 border-gray-700 text-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem
                    value="CREDIT"
                    className="text-white hover:bg-gray-700"
                  >
                    <div className="flex items-center">
                      <Plus className="h-4 w-4 mr-2 text-green-400" />
                      Creditar
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="DEDUCT"
                    className="text-white hover:bg-gray-700"
                  >
                    <div className="flex items-center">
                      <Minus className="h-4 w-4 mr-2 text-red-400" />
                      Deduzir
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount-input" className="text-gray-300">
                Valor
              </Label>
              <Input
                id="amount-input"
                type="number"
                step="0.01"
                min="0.01"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="0.00"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="reason-textarea" className="text-gray-300">
                Motivo (opcional)
              </Label>
              <Textarea
                id="reason-textarea"
                value={balanceReason}
                onChange={(e) => setBalanceReason(e.target.value)}
                placeholder="Descreva o motivo do ajuste..."
                className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBalanceDialog(false);
                  setBalanceUserId("");
                  setBalanceAmount("");
                  setBalanceReason("");
                }}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleBalanceAdjustmentClick}
                disabled={processingBalance || !balanceUserId || !balanceAmount}
                className={`${
                  balanceOperation === "CREDIT"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                } text-white`}
              >
                {processingBalance
                  ? "Processando..."
                  : balanceOperation === "CREDIT"
                    ? "Creditar"
                    : "Deduzir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Balance Adjustment Confirmation Dialog */}
      <Dialog
        open={showBalanceConfirmDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowBalanceConfirmDialog(false);
            setBalanceConfirmStep(1);
          }
        }}
      >
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              {balanceConfirmStep === 1
                ? "Confirmar Ajuste de Saldo"
                : "Confirmação Final"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {balanceConfirmStep === 1 ? (
                <>
                  Você está prestes a{" "}
                  {balanceOperation === "CREDIT" ? "creditar" : "deduzir"}{" "}
                  saldo.
                  <br />
                  <br />
                  <strong>Usuário:</strong>{" "}
                  {usersList.find((u) => u.id === balanceUserId)?.name ||
                    balanceUserId}
                  <br />
                  <strong>Valor:</strong> {balanceAmount} {balanceCurrency}
                  <br />
                  <strong>Operação:</strong>{" "}
                  {balanceOperation === "CREDIT" ? "Crédito" : "Débito"}
                  <br />
                  <strong>Motivo:</strong> {balanceReason || "Não especificado"}
                  <br />
                  <br />
                  Esta ação alterará o saldo do usuário. Deseja continuar?
                </>
              ) : (
                <>
                  <strong className="text-red-400">ATENÇÃO:</strong> Esta é a
                  confirmação final.
                  <br />
                  <br />
                  Você confirma que deseja{" "}
                  {balanceOperation === "CREDIT" ? "creditar" : "deduzir"}{" "}
                  {balanceAmount} {balanceCurrency} do usuário{" "}
                  <strong className="text-white">
                    {usersList.find((u) => u.id === balanceUserId)?.name ||
                      balanceUserId}
                  </strong>
                  ?
                  <br />
                  <br />
                  <strong>Motivo:</strong> {balanceReason || "Não especificado"}
                  <br />
                  <br />
                  Clique em &quot;Confirmar&quot; novamente para prosseguir.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBalanceConfirmDialog(false);
                setBalanceConfirmStep(1);
              }}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBalanceConfirm}
              className={
                balanceConfirmStep === 1
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {balanceConfirmStep === 1 ? "Sim, Continuar" : "Confirmar Ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Carregando...
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
