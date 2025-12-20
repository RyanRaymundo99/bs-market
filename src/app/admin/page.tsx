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
} from "lucide-react";
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
  status: "PENDING" | "APPROVED" | "REJECTED";
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
  const { toast } = useToast();
  const router = useRouter();

  // Real-time transaction updates (lightweight, fast)
  const fetchRealtimeTransactions = useCallback(async (since?: Date) => {
    try {
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
    }
  }, []);

  const fetchFinanceData = useCallback(async () => {
    try {
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
    }
  }, [toast, transactions.length]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch user stats
      const usersResponse = await fetch("/api/admin/users");
      const usersData = usersResponse.ok
        ? await usersResponse.json()
        : { users: [] };
      const users = usersData.users || [];

      // Fetch KYC stats
      const kycResponse = await fetch("/api/admin/kyc");
      const kycData = kycResponse.ok ? await kycResponse.json() : { users: [] };
      const kycUsers = kycData.users || [];

      const newStats: DashboardStats = {
        totalUsers: users.length,
        pendingApprovals: users.filter(
          (u: { approvalStatus: string }) => u.approvalStatus === "PENDING"
        ).length,
        approvedUsers: users.filter(
          (u: { approvalStatus: string }) => u.approvalStatus === "APPROVED"
        ).length,
        rejectedUsers: users.filter(
          (u: { approvalStatus: string }) => u.approvalStatus === "REJECTED"
        ).length,
        pendingKYC: kycUsers.filter(
          (u: { kycStatus: string }) => u.kycStatus === "PENDING"
        ).length,
        approvedKYC: kycUsers.filter(
          (u: { kycStatus: string }) => u.kycStatus === "APPROVED"
        ).length,
        rejectedKYC: kycUsers.filter(
          (u: { kycStatus: string }) => u.kycStatus === "REJECTED"
        ).length,
      };

      setStats(newStats);
      await fetchFinanceData();
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard statistics",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, fetchFinanceData]);

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
    };
    return labels[status as keyof typeof labels] || status;
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

  const handleBalanceAdjustment = async () => {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to adjust balance");
      }

      toast({
        title: "Sucesso",
        description: `Saldo ${
          balanceOperation === "CREDIT" ? "creditado" : "deduzido"
        } com sucesso`,
      });

      // Reset form
      setBalanceUserId("");
      setBalanceAmount("");
      setBalanceReason("");
      setShowBalanceDialog(false);

      // Refresh transactions and finance data
      fetchFinanceData();
      fetchRealtimeTransactions();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
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

  useEffect(() => {
    fetchStats();
    // Initial realtime transaction fetch
    fetchRealtimeTransactions();
  }, [fetchStats, fetchRealtimeTransactions]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading dashboard...</div>
      </div>
    );
  }

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
                <div className="text-2xl font-bold text-white group-hover:text-blue-100">
                  {stats.totalUsers}
                </div>
                <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-300">
                  Click to manage users
                </p>
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
                <div className="text-2xl font-bold text-white group-hover:text-yellow-100">
                  {stats.pendingApprovals}
                </div>
                <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-300">
                  Click to review approvals
                </p>
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
                <div className="text-2xl font-bold text-white group-hover:text-green-100">
                  {stats.approvedUsers}
                </div>
                <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-300">
                  Click to view approved users
                </p>
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
                <div className="text-2xl font-bold text-white group-hover:text-orange-100">
                  {stats.pendingKYC}
                </div>
                <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-300">
                  Click to review KYC documents
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-green-500 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  💰 Total de Depósitos
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Total Withdrawals */}
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-red-500 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  💸 Total de Saques
                </CardTitle>
                <ArrowDownRight className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Total Trades */}
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-blue-500 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  🔁 Volume de Trades
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Total Commissions */}
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-purple-500 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  🧾 Comissões
                </CardTitle>
                <PieChart className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Average User Balance */}
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-yellow-500 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  🧍‍♂️ Saldo Médio dos Usuários
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
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
                    {filteredAndSortedTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => handleTransactionClick(transaction)}
                      >
                        <td className="py-3 px-4 text-gray-300">
                          {new Date(transaction.date).toLocaleDateString(
                            "pt-BR"
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
                        <td className="py-3 px-4 text-gray-300">
                          {typeof transaction.user === "string"
                            ? transaction.user
                            : transaction.user
                            ? `${transaction.user.name} (${transaction.user.email})`
                            : "N/A"}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">
                          {formatCurrency(transaction.value)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              transaction.status === "APPROVED"
                                ? "bg-green-900 text-green-300"
                                : transaction.status === "PENDING"
                                ? "bg-yellow-900 text-yellow-300"
                                : "bg-red-900 text-red-300"
                            }`}
                          >
                            {getStatusLabel(transaction.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAndSortedTransactions.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    Nenhuma transação encontrada
                  </div>
                )}
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
                    <p className="text-sm text-gray-400">Status</p>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                        transactionDetails.status === "APPROVED"
                          ? "bg-green-900 text-green-300"
                          : transactionDetails.status === "PENDING"
                          ? "bg-yellow-900 text-yellow-300"
                          : "bg-red-900 text-red-300"
                      }`}
                    >
                      {getStatusLabel(transactionDetails.status)}
                    </span>
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

                {/* Deposit Details */}
                {transactionDetails.deposit && (
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-lg font-semibold mb-3">
                      Detalhes do Depósito
                    </h3>
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
                    <h3 className="text-lg font-semibold mb-3">
                      Detalhes do Saque
                    </h3>
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
