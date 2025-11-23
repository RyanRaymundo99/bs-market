"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/components/admin/NotificationBell";

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
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'FEE' | 'BUY_CRYPTO' | 'SELL_CRYPTO' | 'REFUND';
  user: string;
  value: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface ChartData {
  date: string;
  deposits: number;
  withdrawals: number;
  trades: number;
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
  const [, setChartData] = useState<ChartData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Transaction>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const fetchFinanceData = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/finance");
      
      if (!response.ok) {
        throw new Error("Failed to fetch finance data");
      }

      const data = await response.json();
      
      if (data.success) {
        setFinanceStats(data.financeStats);
        setTransactions(data.transactions);
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
  }, [toast]);

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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      DEPOSIT: 'Depósito',
      WITHDRAWAL: 'Saque',
      FEE: 'Comissão',
      BUY_CRYPTO: 'Compra Crypto',
      SELL_CRYPTO: 'Venda Crypto',
      REFUND: 'Reembolso',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      PENDING: 'Pendente',
      APPROVED: 'Aprovado',
      REJECTED: 'Rejeitado',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedTransactions = transactions
    .filter(transaction =>
      transaction.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getTransactionTypeLabel(transaction.type).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getStatusLabel(transaction.status).toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

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
  }, [fetchStats]);

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
            <p className="text-gray-300 mt-1">Acompanhe a movimentação financeira da plataforma em tempo real</p>
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
                  <span className={`text-xs ${financeStats.depositsChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                  <span className={`text-xs ${financeStats.withdrawalsChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                  <span className={`text-xs ${financeStats.tradesChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                  <span className={`text-xs ${financeStats.commissionsChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                  <span className={`text-xs ${financeStats.balanceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                <CardTitle className="text-white">📈 Evolução dos Depósitos e Saques (30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                    <p>Gráfico de linha será implementado</p>
                    <p className="text-sm">Dados dos últimos 30 dias</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart - Daily Trade Volume */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">📊 Volume Diário de Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <PieChart className="h-12 w-12 mx-auto mb-2" />
                    <p>Gráfico de barras será implementado</p>
                    <p className="text-sm">Volume diário de negociações</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Transactions Table */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Tabela Detalhada de Transações</CardTitle>
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
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center">
                          Data
                          <ArrowUpDown className="h-3 w-3 ml-1" />
                        </div>
                      </th>
                      <th 
                        className="text-left py-3 px-4 cursor-pointer hover:text-white text-gray-300"
                        onClick={() => handleSort('type')}
                      >
                        <div className="flex items-center">
                          Tipo
                          <ArrowUpDown className="h-3 w-3 ml-1" />
                        </div>
                      </th>
                      <th 
                        className="text-left py-3 px-4 cursor-pointer hover:text-white text-gray-300"
                        onClick={() => handleSort('user')}
                      >
                        <div className="flex items-center">
                          Usuário
                          <ArrowUpDown className="h-3 w-3 ml-1" />
                        </div>
                      </th>
                      <th 
                        className="text-left py-3 px-4 cursor-pointer hover:text-white text-gray-300"
                        onClick={() => handleSort('value')}
                      >
                        <div className="flex items-center">
                          Valor
                          <ArrowUpDown className="h-3 w-3 ml-1" />
                        </div>
                      </th>
                      <th 
                        className="text-left py-3 px-4 cursor-pointer hover:text-white text-gray-300"
                        onClick={() => handleSort('status')}
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
                      <tr key={transaction.id} className="border-b border-gray-800 hover:bg-gray-800">
                        <td className="py-3 px-4 text-gray-300">
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.type === 'DEPOSIT' ? 'bg-green-900 text-green-300' :
                            transaction.type === 'WITHDRAWAL' ? 'bg-red-900 text-red-300' :
                            transaction.type === 'FEE' ? 'bg-purple-900 text-purple-300' :
                            transaction.type === 'BUY_CRYPTO' ? 'bg-emerald-900 text-emerald-300' :
                            transaction.type === 'SELL_CRYPTO' ? 'bg-orange-900 text-orange-300' :
                            transaction.type === 'REFUND' ? 'bg-gray-900 text-gray-300' :
                            'bg-gray-900 text-gray-300'
                          }`}>
                            {getTransactionTypeLabel(transaction.type)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{transaction.user}</td>
                        <td className="py-3 px-4 text-white font-medium">
                          {formatCurrency(transaction.value)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.status === 'APPROVED' ? 'bg-green-900 text-green-300' :
                            transaction.status === 'PENDING' ? 'bg-yellow-900 text-yellow-300' :
                            'bg-red-900 text-red-300'
                          }`}>
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
    </div>
  );
}
