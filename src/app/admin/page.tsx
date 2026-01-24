"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/components/admin/NotificationBell";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Tooltip as CustomTooltip } from "@/components/ui/tooltip";
import { formatUSDT, formatBRL } from "@/lib/format-currency";

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
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CONFIRMED" | "PROCESSING" | "EXECUTING" | "FAILED" | "CANCELLED";
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
    executedAt?: string | null;
    amount: string | number;
    total: string | number;
  } | null;
}

export default function AdminDashboard() {
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
  const [loading, setLoading] = useState(true);
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
  const [balanceUserId, setBalanceUserId] = useState("");
  const [balanceCurrency, setBalanceCurrency] = useState<"USDT" | "BRL">(
    "USDT"
  );
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceOperation, setBalanceOperation] = useState<"CREDIT" | "DEDUCT">(
    "CREDIT"
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
  
  // Inline User Management States
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchingUser, setSearchingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    cpf: string | null;
    approvalStatus: string;
    kycStatus: string;
    createdAt: string;
  } | null>(null);
  const [userBalances, setUserBalances] = useState<Array<{ currency: string; amount: number; locked: number }>>([]);
  const [userTransactions, setUserTransactions] = useState<Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [usdtToBrlRate, setUsdtToBrlRate] = useState<number | null>(null);
  const [editingUserData, setEditingUserData] = useState(false);
  const [userEditForm, setUserEditForm] = useState({ name: "", phone: "", cpf: "" });
  const [savingUserData, setSavingUserData] = useState(false);
  const [inlineBalanceAmount, setInlineBalanceAmount] = useState("");
  
  // Historical data states for hover tooltips
  const [historyData, setHistoryData] = useState<Record<string, Array<{ date: string; value: number }>>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});
  const [inlineBalanceReason, setInlineBalanceReason] = useState("");
  const [adjustingInlineBalance, setAdjustingInlineBalance] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string; cpf: string | null }>>([]);
  
  const { toast } = useToast();
  const router = useRouter();
  
  // Search for users inline
  const handleUserSearch = async () => {
    if (!userSearchQuery.trim()) return;
    setSearchingUser(true);
    setSelectedUser(null);
    setSearchResults([]);
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearchQuery)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        if (data.users && data.users.length > 0) {
          setSearchResults(data.users);
          if (data.users.length === 1) {
            // Auto-select if only one result
            handleSelectUser(data.users[0].id);
          }
        } else {
          toast({
            title: "Nenhum usuário encontrado",
            description: "Tente outro termo de busca",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar usuários",
        variant: "destructive",
      });
    } finally {
      setSearchingUser(false);
    }
  };
  
  // Select a user and load their data
  const handleSelectUser = async (userId: string) => {
    setLoadingUserData(true);
    setSearchResults([]);
    try {
      // Fetch USDT rate for BRL calculation
      const rateResponse = await fetch("/api/crypto/usdt-rate");
      let rate = null;
      if (rateResponse.ok) {
        const rateData = await rateResponse.json();
        rate = rateData.rate || null;
        setUsdtToBrlRate(rate);
      }
      
      const [userResponse, balanceResponse, transactionsResponse] = await Promise.all([
        fetch(`/api/admin/users/${userId}`),
        fetch(`/api/admin/users/${userId}?include=balance`),
        fetch(`/api/admin/users/${userId}?include=transactions`),
      ]);
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setSelectedUser(userData.user);
        setUserEditForm({
          name: userData.user?.name || "",
          phone: userData.user?.phone || "",
          cpf: userData.user?.cpf || "",
        });
      }
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setUserBalances(balanceData.balances || []);
      }
      
      if (transactionsResponse.ok) {
        const txData = await transactionsResponse.json();
        setUserTransactions(txData.transactions || []);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar dados do usuário",
        variant: "destructive",
      });
    } finally {
      setLoadingUserData(false);
    }
  };
  
  // Save user profile changes
  const handleSaveUserProfile = async () => {
    if (!selectedUser) return;
    setSavingUserData(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/update-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userEditForm),
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedUser({ ...selectedUser, ...data.user });
        setEditingUserData(false);
        toast({
          title: "Sucesso",
          description: "Dados do usuário atualizados",
        });
      } else {
        throw new Error("Failed to update");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os dados",
        variant: "destructive",
      });
    } finally {
      setSavingUserData(false);
    }
  };
  
  // Adjust user balance inline
  const handleInlineBalanceAdjust = async () => {
    if (!selectedUser || !inlineBalanceAmount) return;
    
    const amountValue = parseFloat(inlineBalanceAmount);
    if (isNaN(amountValue) || amountValue === 0) {
      toast({
        title: "Erro",
        description: "Digite um valor válido (positivo para creditar, negativo para debitar)",
        variant: "destructive",
      });
      return;
    }
    
    // Determine operation based on amount sign
    const operation = amountValue > 0 ? "CREDIT" : "DEDUCT";
    const absoluteAmount = Math.abs(amountValue);
    
    setAdjustingInlineBalance(true);
    try {
      const response = await fetch("/api/admin/balance/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: absoluteAmount,
          operation: operation,
          reason: inlineBalanceReason || "Ajuste administrativo",
          currency: "USDT",
        }),
      });
      
      if (response.ok) {
        // Refresh balance and exchange rate
        const [balanceResponse, rateResponse] = await Promise.all([
          fetch(`/api/admin/users/${selectedUser.id}?include=balance`),
          fetch("/api/crypto/usdt-rate"),
        ]);
        
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          setUserBalances(balanceData.balances || []);
        }
        
        if (rateResponse.ok) {
          const rateData = await rateResponse.json();
          setUsdtToBrlRate(rateData.rate || null);
        }
        
        setInlineBalanceAmount("");
        setInlineBalanceReason("");
        toast({
          title: "Sucesso",
          description: operation === "CREDIT" 
            ? `${formatUSDT(absoluteAmount)} creditado com sucesso`
            : `${formatUSDT(absoluteAmount)} debitado com sucesso`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to adjust balance");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível ajustar o saldo",
        variant: "destructive",
      });
    } finally {
      setAdjustingInlineBalance(false);
    }
  };
  
  // Clear selected user
  const handleClearUser = () => {
    setSelectedUser(null);
    setUserBalances([]);
    setUserTransactions([]);
    setUserSearchQuery("");
    setSearchResults([]);
    setEditingUserData(false);
  };

  // Real-time transaction updates (lightweight, fast)
  const fetchRealtimeTransactions = useCallback(async (since?: Date) => {
    try {
      if (!since) {
        setTransactionsLoading(true);
      }
      
      const url = new URL(
        "/api/admin/transactions/realtime",
        window.location.origin
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
              (t: Transaction) => !existingIds.has(t.id)
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
  }, []);

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

  const fetchHistory = useCallback(async (metric: string, days: number = 7) => {
    if (historyData[metric] && historyData[metric].length > 0) {
      return; // Already loaded
    }

    setLoadingHistory((prev) => ({ ...prev, [metric]: true }));
    try {
      const response = await fetch(
        `/api/admin/finance/history?metric=${metric}&days=${days}`,
        { cache: "no-store" }
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
  }, [historyData]);

  const HistoryTooltipContent = ({ metric, title }: { metric: string; title: string }) => {
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
        <div className="text-sm font-semibold text-white mb-3">{title} - Últimos {data.length} dias</div>
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Total:</span>
            <span className="text-white font-medium">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Média diária:</span>
            <span className="text-white font-medium">{formatCurrency(avg)}</span>
          </div>
        </div>
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {data.slice().reverse().map((item, index) => {
            const date = new Date(item.date);
            const dateStr = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
            const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            
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

    try {
      const response = await fetch(`/api/admin/transactions/${transaction.id}`);
      if (response.ok) {
        const data = await response.json();
        setTransactionDetails(data.transaction);
      } else {
        throw new Error("Failed to fetch transaction details");
      }
    } catch (error) {
      console.error("Error fetching transaction details:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar detalhes da transação",
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

    setSyncingStatus(true);
    try {
      const response = await fetch(
        `/api/admin/transactions/${transactionDetails.id}/sync-status`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Status Sincronizado",
          description: data.message || "Status atualizado com sucesso",
        });
        // Refresh transaction details by fetching from API
        const detailsResponse = await fetch(
          `/api/admin/transactions/${transactionDetails.id}`
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
          description: data.message || data.error || "Falha ao sincronizar status",
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

    setResendingReceipt(true);
    try {
      const response = await fetch(
        `/api/admin/transactions/${transactionDetails.id}/resend-receipt`,
        {
          method: "POST",
        }
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
          `/api/admin/transactions/${transactionDetails.id}`
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

    // Confirm action
    if (!confirm("Tem certeza que deseja marcar esta transação como concluída?")) {
      return;
    }

    setMarkingCompleted(true);
    try {
      const response = await fetch(
        `/api/admin/transactions/${transactionDetails.id}/mark-completed`,
        {
          method: "POST",
        }
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
          `/api/admin/transactions/${transactionDetails.id}`
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
        throw new Error(data.error || "Failed to mark transaction as completed");
      }
    } catch (error) {
      console.error("Error marking transaction as completed:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Falha ao marcar transação como concluída",
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

  const filteredAndSortedTransactions = transactions
    .filter((transaction) => {
      const userString =
        typeof transaction.user === "string"
          ? transaction.user
          : transaction.user
          ? `${transaction.user.name} ${transaction.user.email}`
          : "";
      return (
        userString.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getTransactionTypeLabel(transaction.type)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        getStatusLabel(transaction.status)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
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

  const handleBalanceAdjustment = async (e?: React.MouseEvent) => {
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
          "Tem certeza que deseja continuar?"
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

  // Load all initial data in parallel for faster page load
  useEffect(() => {
    setLoading(true);
    setTransactionsLoading(true);
    
    // Fetch all initial data in parallel
    Promise.all([
      fetchStats(),
      fetchFinanceData(),
      fetchRealtimeTransactions(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [fetchStats, fetchFinanceData, fetchRealtimeTransactions]);

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
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-300 mt-1">BS Market Administration Panel</p>
          </div>
          <div className="flex items-center space-x-2">
            <NotificationBell className="text-white hover:text-blue-400" />
            {/* Real-time status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-900 border border-gray-700">
              {isPolling ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400 animate-pulse" />
                  <span className="text-xs text-gray-300">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Offline</span>
                </>
              )}
            </div>
            <Button
              onClick={fetchStats}
              variant="outline"
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-gray-700 text-white hover:bg-gray-800"
                  disabled={downloadingReport}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {downloadingReport ? "Gerando..." : "Relatórios"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-700">
                <DropdownMenuLabel className="text-white">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Selecionar Período
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                <div className="p-2 space-y-2">
                  <div className="flex gap-2">
                    <Select
                      value={String(selectedMonth)}
                      onValueChange={(value) => setSelectedMonth(parseInt(value))}
                    >
                      <SelectTrigger className="w-24 h-8 bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <SelectItem
                            key={m}
                            value={String(m)}
                            className="text-white hover:bg-gray-800"
                          >
                            {m.toString().padStart(2, "0")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(selectedYear)}
                      onValueChange={(value) => setSelectedYear(parseInt(value))}
                    >
                      <SelectTrigger className="w-28 h-8 bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(
                          (y) => (
                            <SelectItem
                              key={y}
                              value={String(y)}
                              className="text-white hover:bg-gray-800"
                            >
                              {y}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem
                  onClick={() => handleDownloadReport("pdf")}
                  className="text-white hover:bg-gray-800 cursor-pointer"
                  disabled={downloadingReport}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDownloadReport("excel")}
                  className="text-white hover:bg-gray-800 cursor-pointer"
                  disabled={downloadingReport}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={handleResetFinance}
              variant="outline"
              className="border-red-700 text-red-400 hover:bg-red-900 hover:text-red-300"
            >
              <Shield className="w-4 h-4 mr-2" />
              Reset Finance
            </Button>
            <Button onClick={handleLogout} variant="destructive">
              <Shield className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <Link href="/admin/users">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-blue-500 transition-all duration-200 cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-blue-400 group-hover:text-blue-300" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-8 w-16 bg-gray-700 rounded"></div>
                    <div className="h-4 w-24 bg-gray-700 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white group-hover:text-blue-100">
                      {stats.totalUsers}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-300">
                      Click to manage users
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Pending Approvals */}
          <Link href="/admin/users">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-yellow-500 transition-all duration-200 cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white">
                  Pending Approvals
                </CardTitle>
                <Clock className="h-4 w-4 text-yellow-400 group-hover:text-yellow-300" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-8 w-16 bg-gray-700 rounded"></div>
                    <div className="h-4 w-24 bg-gray-700 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white group-hover:text-yellow-100">
                      {stats.pendingApprovals}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-300">
                      Click to review approvals
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Approved Users */}
          <Link href="/admin/users">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-green-500 transition-all duration-200 cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white">
                  Approved Users
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-400 group-hover:text-green-300" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-8 w-16 bg-gray-700 rounded"></div>
                    <div className="h-4 w-24 bg-gray-700 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white group-hover:text-green-100">
                      {stats.approvedUsers}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-300">
                      Click to view approved users
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Pending KYC */}
          <Link href="/admin/kyc">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-orange-500 transition-all duration-200 cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white">
                  Pending KYC
                </CardTitle>
                <FileText className="h-4 w-4 text-orange-400 group-hover:text-orange-300" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-8 w-16 bg-gray-700 rounded"></div>
                    <div className="h-4 w-24 bg-gray-700 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white group-hover:text-orange-100">
                      {stats.pendingKYC}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-300">
                      Click to review KYC documents
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">User Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                Manage user accounts, approve registrations, and handle
                user-related issues.
              </p>
              <div className="flex space-x-2">
                <Link href="/admin/users">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">KYC Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                Review identity documents and verify user identities for
                compliance.
              </p>
              <div className="flex space-x-2">
                <Link href="/admin/kyc">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <FileText className="w-4 h-4 mr-2" />
                    Review Documents
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Notification Center</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                Send notifications and emails to users, view notification history.
              </p>
              <div className="flex space-x-2">
                <Link href="/admin/notification-center">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Mail className="w-4 h-4 mr-2" />
                    Notification Center
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Webhook Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                Monitor all webhook events received from NutzPay and other sources.
              </p>
              <div className="flex space-x-2">
                <Link href="/admin/webhook-logs">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Webhook className="w-4 h-4 mr-2" />
                    View Webhook Logs
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Finance Overview */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Finance Overview</h2>
            <p className="text-gray-300 mt-1">
              Acompanhe a movimentação financeira da plataforma em tempo real
            </p>
          </div>

          {/* Finance Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Total Deposits */}
            <CustomTooltip
              content={<HistoryTooltipContent metric="deposits" title="Histórico de Depósitos" />}
              side="top"
            >
              <Card
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-green-500 transition-all duration-200 cursor-pointer"
                onMouseEnter={() => fetchHistory("deposits", 7)}
              >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  💰 Total de Depósitos
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                {financeLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-8 w-32 bg-gray-700 rounded"></div>
                    <div className="h-4 w-16 bg-gray-700 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(financeStats.totalDeposits)}
                    </div>
                    <div className="flex items-center mt-1">
                      {financeStats.depositsChange >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-400 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-400 mr-1" />
                      )}
                      <span
                        className={`text-xs ${
                          financeStats.depositsChange >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPercentage(financeStats.depositsChange)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            </CustomTooltip>

            {/* Total Withdrawals */}
            <CustomTooltip
              content={<HistoryTooltipContent metric="withdrawals" title="Histórico de Saques" />}
              side="top"
            >
              <Card
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-red-500 transition-all duration-200 cursor-pointer"
                onMouseEnter={() => fetchHistory("withdrawals", 7)}
              >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  💸 Total de Saques
                </CardTitle>
                <ArrowDownRight className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                {financeLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-8 w-32 bg-gray-700 rounded"></div>
                    <div className="h-4 w-16 bg-gray-700 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(financeStats.totalWithdrawals)}
                    </div>
                    <div className="flex items-center mt-1">
                      {financeStats.withdrawalsChange >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-400 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-400 mr-1" />
                      )}
                      <span
                        className={`text-xs ${
                          financeStats.withdrawalsChange >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPercentage(financeStats.withdrawalsChange)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            </CustomTooltip>

            {/* Total Trades */}
            <CustomTooltip
              content={<HistoryTooltipContent metric="trades" title="Histórico de Trades" />}
              side="top"
            >
              <Card
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-blue-500 transition-all duration-200 cursor-pointer"
                onMouseEnter={() => fetchHistory("trades", 7)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  🔁 Volume de Trades
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                {financeLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-8 w-32 bg-gray-700 rounded"></div>
                    <div className="h-4 w-16 bg-gray-700 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(financeStats.totalTrades)}
                    </div>
                    <div className="flex items-center mt-1">
                      {financeStats.tradesChange >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-400 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-400 mr-1" />
                      )}
                      <span
                        className={`text-xs ${
                          financeStats.tradesChange >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPercentage(financeStats.tradesChange)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            </CustomTooltip>

            {/* Total Commissions */}
            <CustomTooltip
              content={<HistoryTooltipContent metric="commissions" title="Histórico de Comissões" />}
              side="top"
            >
              <Card
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-purple-500 transition-all duration-200 cursor-pointer"
                onMouseEnter={() => fetchHistory("commissions", 7)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  🧾 Comissões
                </CardTitle>
                <PieChart className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                {financeLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-8 w-32 bg-gray-700 rounded"></div>
                    <div className="h-4 w-16 bg-gray-700 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(financeStats.totalCommissions)}
                    </div>
                    <div className="flex items-center mt-1">
                      {financeStats.commissionsChange >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-400 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-400 mr-1" />
                      )}
                      <span
                        className={`text-xs ${
                          financeStats.commissionsChange >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPercentage(financeStats.commissionsChange)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            </CustomTooltip>

            {/* Average User Balance */}
            <CustomTooltip
              content={<HistoryTooltipContent metric="balance" title="Histórico de Saldo Médio" />}
              side="top"
            >
              <Card
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-yellow-500 transition-all duration-200 cursor-pointer"
                onMouseEnter={() => fetchHistory("balance", 7)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  🧍‍♂️ Saldo Médio dos Usuários
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                {financeLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-8 w-32 bg-gray-700 rounded"></div>
                    <div className="h-4 w-16 bg-gray-700 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(financeStats.averageUserBalance)}
                    </div>
                    <div className="flex items-center mt-1">
                      {financeStats.balanceChange >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-400 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-400 mr-1" />
                      )}
                      <span
                        className={`text-xs ${
                          financeStats.balanceChange >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPercentage(financeStats.balanceChange)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            </CustomTooltip>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Line Chart - Deposits and Withdrawals */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">
                  📈 Evolução dos Depósitos e Saques (30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={(value) => {
                          if (value >= 1000000) {
                            return `R$ ${(value / 1000000).toFixed(1)}M`;
                          }
                          if (value >= 1000) {
                            return `R$ ${(value / 1000).toFixed(1)}k`;
                          }
                          return `R$ ${value.toFixed(0)}`;
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          color: "#F3F4F6",
                        }}
                        labelFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString("pt-BR");
                        }}
                        formatter={(value: number) => [
                          `R$ ${value.toFixed(2)}`,
                          "",
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ color: "#9CA3AF" }}
                        iconType="line"
                      />
                      <Line
                        type="monotone"
                        dataKey="deposits"
                        stroke="#10B981"
                        strokeWidth={2}
                        name="Depósitos"
                        dot={{ fill: "#10B981", r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="withdrawals"
                        stroke="#EF4444"
                        strokeWidth={2}
                        name="Saques"
                        dot={{ fill: "#EF4444", r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>Carregando dados...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart - Daily Trade Volume */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">
                  📊 Volume Diário de Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={(value) => {
                          if (value >= 1000000) {
                            return `R$ ${(value / 1000000).toFixed(1)}M`;
                          }
                          if (value >= 1000) {
                            return `R$ ${(value / 1000).toFixed(1)}k`;
                          }
                          return `R$ ${value.toFixed(0)}`;
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          color: "#F3F4F6",
                        }}
                        labelFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString("pt-BR");
                        }}
                        formatter={(value: number) => [
                          `R$ ${value.toFixed(2)}`,
                          "Volume",
                        ]}
                      />
                      <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                      <Bar
                        dataKey="trades"
                        fill="#3B82F6"
                        name="Volume de Trades"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <PieChart className="h-12 w-12 mx-auto mb-2" />
                      <p>Carregando dados...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* User Account Management Card - Full Inline Management */}
          <Card className="bg-gray-900 border-gray-800 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  Gerenciar Conta de Usuário
                </CardTitle>
                {selectedUser && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearUser}
                    className="text-gray-400 border-gray-600 hover:bg-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Search Section */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por nome, email ou CPF/CNPJ..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUserSearch();
                        }
                      }}
                    />
                  </div>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleUserSearch}
                    disabled={searchingUser}
                  >
                    {searchingUser ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 1 && (
                <div className="mb-4 bg-gray-800 rounded-lg border border-gray-700 divide-y divide-gray-700">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user.id)}
                      className="p-3 hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-gray-400 text-sm">{user.email}</p>
                      </div>
                      {user.cpf && (
                        <span className="text-gray-500 text-sm">{user.cpf}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Loading State */}
              {loadingUserData && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              )}

              {/* Selected User Details */}
              {selectedUser && !loadingUserData && (
                <div className="space-y-4">
                  {/* User Info Header */}
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{selectedUser.name}</h3>
                        <p className="text-gray-400 text-sm">{selectedUser.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedUser.approvalStatus === "APPROVED" 
                            ? "bg-green-900/50 text-green-400 border border-green-500/30"
                            : selectedUser.approvalStatus === "PENDING"
                            ? "bg-yellow-900/50 text-yellow-400 border border-yellow-500/30"
                            : "bg-red-900/50 text-red-400 border border-red-500/30"
                        }`}>
                          {selectedUser.approvalStatus}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedUser.kycStatus === "APPROVED" 
                            ? "bg-green-900/50 text-green-400 border border-green-500/30"
                            : selectedUser.kycStatus === "PENDING"
                            ? "bg-yellow-900/50 text-yellow-400 border border-yellow-500/30"
                            : "bg-red-900/50 text-red-400 border border-red-500/30"
                        }`}>
                          KYC: {selectedUser.kycStatus}
                        </span>
                      </div>
                    </div>

                    {/* Editable User Data */}
                    {editingUserData ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-gray-400 text-xs">Nome</Label>
                          <Input
                            value={userEditForm.name}
                            onChange={(e) => setUserEditForm({ ...userEditForm, name: e.target.value })}
                            className="mt-1 bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-400 text-xs">Telefone</Label>
                          <Input
                            value={userEditForm.phone}
                            onChange={(e) => setUserEditForm({ ...userEditForm, phone: e.target.value })}
                            className="mt-1 bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-400 text-xs">CPF/CNPJ</Label>
                          <Input
                            value={userEditForm.cpf}
                            onChange={(e) => setUserEditForm({ ...userEditForm, cpf: e.target.value })}
                            className="mt-1 bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                        <div className="md:col-span-3 flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={handleSaveUserProfile}
                            disabled={savingUserData}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {savingUserData ? "Salvando..." : "Salvar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingUserData(false);
                              setUserEditForm({
                                name: selectedUser.name || "",
                                phone: selectedUser.phone || "",
                                cpf: selectedUser.cpf || "",
                              });
                            }}
                            className="border-gray-600"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Telefone:</span>
                          <p className="text-white">{selectedUser.phone || "-"}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">CPF/CNPJ:</span>
                          <p className="text-white">{selectedUser.cpf || "-"}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Cadastro:</span>
                          <p className="text-white">{new Date(selectedUser.createdAt).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingUserData(true)}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Editar Dados
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Balance and Adjustment Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Balances */}
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-green-500" />
                        Saldo do Usuário
                      </h4>
                      <div className="space-y-2">
                        {userBalances.length > 0 ? (
                          <>
                            {userBalances.map((bal) => {
                              // For BRL, calculate from USDT with 2% discount
                              if (bal.currency === "BRL") {
                                const usdtBalance = userBalances.find(b => b.currency === "USDT");
                                if (usdtBalance && usdtToBrlRate) {
                                  // Calculate BRL = USDT * rate * 0.98 (2% discount)
                                  const calculatedBrl = Number(usdtBalance.amount) * usdtToBrlRate * 0.98;
                                  return (
                                    <div key={bal.currency} className="flex items-center justify-between">
                                      <span className="text-gray-400">{bal.currency} <span className="text-xs text-gray-500">(calculado)</span></span>
                                      <span className="text-white font-medium">
                                        {formatBRL(calculatedBrl)}
                                      </span>
                                    </div>
                                  );
                                }
                                // Fallback to actual BRL balance if rate not available
                                return (
                                  <div key={bal.currency} className="flex items-center justify-between">
                                    <span className="text-gray-400">{bal.currency}</span>
                                    <span className="text-white font-medium">
                                      {formatBRL(Number(bal.amount))}
                                    </span>
                                  </div>
                                );
                              }
                              // For USDT, show normally
                              return (
                                <div key={bal.currency} className="flex items-center justify-between">
                                  <span className="text-gray-400">{bal.currency}</span>
                                  <span className="text-white font-medium">
                                    {formatUSDT(Number(bal.amount))}
                                  </span>
                                </div>
                              );
                            })}
                          </>
                        ) : (
                          <p className="text-gray-500 text-sm">Nenhum saldo encontrado</p>
                        )}
                      </div>
                    </div>

                    {/* Balance Adjustment */}
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                        Ajustar Saldo (USDT)
                      </h4>
                      <div className="space-y-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Valor (use negativo para remover)"
                          value={inlineBalanceAmount}
                          onChange={(e) => setInlineBalanceAmount(e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                        <Input
                          placeholder="Motivo do ajuste..."
                          value={inlineBalanceReason}
                          onChange={(e) => setInlineBalanceReason(e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                        <Button
                          onClick={handleInlineBalanceAdjust}
                          disabled={adjustingInlineBalance || !inlineBalanceAmount}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          {adjustingInlineBalance ? "Ajustando..." : "Confirmar Ajuste"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      Histórico de Transações
                    </h4>
                    {userTransactions.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {userTransactions.slice(0, 10).map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-2 bg-gray-700/50 rounded text-sm"
                          >
                            <div className="flex items-center gap-2">
                              {tx.type.includes("DEPOSIT") || tx.type.includes("BUY") ? (
                                <ArrowDownRight className="h-4 w-4 text-green-500" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-red-500" />
                              )}
                              <div>
                                <span className="text-white">{tx.type.replace(/_/g, " ")}</span>
                                <span className="text-gray-500 text-xs ml-2">
                                  {new Date(tx.createdAt).toLocaleString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={tx.type.includes("DEPOSIT") || tx.type.includes("BUY") ? "text-green-500" : "text-red-500"}>
                                {tx.type.includes("DEPOSIT") || tx.type.includes("BUY") ? "+" : "-"}
                                {tx.currency === "BRL" 
                                  ? formatBRL(Number(tx.amount)).replace("R$ ", "")
                                  : formatUSDT(Number(tx.amount)).replace(" USDT", "")} {tx.currency}
                              </span>
                              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                tx.status === "COMPLETED" || tx.status === "APPROVED" || tx.status === "CONFIRMED" ? "bg-green-900/50 text-green-400" :
                                tx.status === "PENDING" ? "bg-yellow-900/50 text-yellow-400" :
                                "bg-red-900/50 text-red-400"
                              }`}>
                                {getStatusLabel(tx.status)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Nenhuma transação encontrada</p>
                    )}
                    {userTransactions.length > 10 && (
                      <Link href={`/admin/users/${selectedUser.id}`}>
                        <Button variant="link" size="sm" className="text-blue-400 mt-2 p-0">
                          Ver todas as transações →
                        </Button>
                      </Link>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/users/${selectedUser.id}`}>
                      <Button variant="outline" size="sm" className="text-gray-300 border-gray-600 hover:bg-gray-700">
                        <Users className="h-4 w-4 mr-2" />
                        Ver Página Completa
                      </Button>
                    </Link>
                    <Link href="/admin/kyc">
                      <Button variant="outline" size="sm" className="text-gray-300 border-gray-600 hover:bg-gray-700">
                        <Shield className="h-4 w-4 mr-2" />
                        Gerenciar KYC
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!selectedUser && !loadingUserData && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Busque um usuário para gerenciar sua conta</p>
                  <p className="text-sm mt-1">Você pode ver transações, editar dados e ajustar saldo</p>
                </div>
              )}
            </CardContent>
          </Card>

        {/* Detailed Transactions Table */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">
                  Tabela Detalhada de Transações
                </CardTitle>
                <Button
                  onClick={handleOpenBalanceDialog}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Ajustar Saldo
                </Button>
              </div>
              <div className="flex items-center space-x-4 mt-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar transações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
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
                        <td colSpan={5} className="py-8 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                            <p className="text-gray-400">Carregando transações...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredAndSortedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          Nenhuma transação encontrada
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => handleTransactionClick(transaction)}
                      >
                        <td className="py-3 px-4 text-gray-300">
                          {new Date(transaction.date).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
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
                        <td className="py-3 px-4 text-gray-300">
                          {typeof transaction.user === "string"
                            ? transaction.user
                            : transaction.user
                            ? `${transaction.user.name} (${transaction.user.email})`
                            : "N/A"}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">
                          {transaction.value && !isNaN(transaction.value) 
                            ? formatCurrency(transaction.value)
                            : transaction.currency === "USDT"
                            ? formatUSDT(Math.abs(transaction.amount || 0))
                            : formatCurrency(0)
                          }
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              (transaction.status === "APPROVED" || 
                              transaction.status === "COMPLETED" || 
                              transaction.status === "CONFIRMED")
                                ? "bg-green-900 text-green-300"
                                : (transaction.status === "PENDING" ||
                                  transaction.status === "PROCESSING" ||
                                  transaction.status === "EXECUTING")
                                ? "bg-yellow-900 text-yellow-300"
                                : (transaction.status === "REJECTED" ||
                                  transaction.status === "FAILED" ||
                                  transaction.status === "CANCELLED")
                                ? "bg-red-900 text-red-300"
                                : "bg-gray-900 text-gray-300"
                            }`}
                          >
                            {getStatusLabel(transaction.status)}
                          </span>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

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
                        transactionDetails.status === "EXECUTING") && (
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
                        "pt-BR"
                      )}
                    </p>
                  </div>
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
                    {/* Receipt Email Status */}
                    {(transactionDetails.type === "BUY_CRYPTO" ||
                      transactionDetails.type === "WITHDRAWAL") && (
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
                                            receiptStatus.sentAt
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
                      {transactionDetails.order.executedAt && (
                        <div>
                          <p className="text-sm text-gray-400">Executado em</p>
                          <p className="text-white">
                            {new Date(
                              transactionDetails.order.executedAt
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
                            Number(transactionDetails.order.total)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Taxa de Câmbio</p>
                        <p className="text-white">
                          {formatCurrency(
                            Number(transactionDetails.order.total) /
                              Number(transactionDetails.order.amount)
                          )}{" "}
                          BRL/USDT
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Calculation Breakdown (for BUY_CRYPTO orders) */}
                {transactionDetails.order && transactionDetails.type === "BUY_CRYPTO" && (
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
                            <span className="text-gray-400">Quantidade USDT:</span>
                            <span className="text-white font-semibold">
                              {Number(transactionDetails.order.amount).toLocaleString("pt-BR", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 8,
                              })}{" "}
                              USDT
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-gray-700">
                            <span className="text-gray-400">Taxa de Câmbio:</span>
                            <span className="text-white font-semibold">
                              {formatCurrency(
                                Number(transactionDetails.order.total) /
                                  Number(transactionDetails.order.amount)
                              )}{" "}
                              BRL/USDT
                            </span>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-4 my-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-gray-300 text-sm">Cálculo:</span>
                            </div>
                            <div className="text-white font-mono text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">=</span>
                                <span>
                                  {Number(transactionDetails.order.amount).toLocaleString("pt-BR", {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 8,
                                  })}{" "}
                                  USDT
                                </span>
                                <span className="text-gray-500">×</span>
                                <span>
                                  {formatCurrency(
                                    Number(transactionDetails.order.total) /
                                      Number(transactionDetails.order.amount)
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                                <span className="text-gray-400">=</span>
                                <span className="text-green-400 font-bold">
                                  {formatCurrency(Number(transactionDetails.order.total))}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 italic">
                            * A taxa de câmbio já inclui todas as taxas e comissões aplicadas
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
                            Number(transactionDetails.deposit.amount)
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
                              transactionDetails.deposit.confirmedAt
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
                        {transactionDetails.withdrawal.status === "PENDING" ||
                        transactionDetails.withdrawal.status === "PROCESSING" ? (
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
                            Number(transactionDetails.withdrawal.amount)
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
                onClick={handleBalanceAdjustment}
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
    </div>
  );
}
