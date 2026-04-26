"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
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
  Search,
  ArrowUpDown,
  X,
  RefreshCw,
  Download,
  Wallet,
  CheckCircle,
  Plus,
  Minus,
  Clock,
  XCircle,
  Mail,
  Send,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatUSDT } from "@/lib/format-currency";

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
  user: string | { name: string; email: string } | null;
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
    pixKey?: string | null;
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

interface ApiUserRecord {
  id: string;
  name?: string;
  email?: string;
}

function TransactionsPageContent() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const router = useRouter();
  const { settings } = useAdminSettings();

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [sortField, setSortField] = useState<keyof Transaction>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set()
  );

  // Details dialog
  const [transactionDetails, setTransactionDetails] =
    useState<TransactionDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [, setSelectedTransaction] = useState<Transaction | null>(null);

  // Action states
  const [processingTransaction, setProcessingTransaction] = useState<string | null>(null);
  const [resendingReceipt, setResendingReceipt] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [markingCompleted, setMarkingCompleted] = useState(false);
  const [rejectingTransaction, setRejectingTransaction] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showConfirmPaymentDialog, setShowConfirmPaymentDialog] = useState(false);
  const [paymentConfirmationHash, setPaymentConfirmationHash] = useState("");

  // Balance adjustment
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [balanceUserId, setBalanceUserId] = useState("");
  const [balanceCurrency, setBalanceCurrency] = useState<"USDT" | "BRL">("USDT");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceOperation, setBalanceOperation] = useState<"CREDIT" | "DEDUCT">("CREDIT");
  const [balanceReason, setBalanceReason] = useState("");
  const [processingBalance, setProcessingBalance] = useState(false);
  const [usersList, setUsersList] = useState<ApiUserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const lastUpdateTimeRef = useRef<Date>(new Date());

  // Helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
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

  const getStatusLabel = (status: string) => {
    const labels = {
      PENDING: "Pendente",
      APPROVED: "Aprovado",
      REJECTED: "Rejeitado",
      COMPLETED: "Aprovado",
      CONFIRMED: "Aprovado",
      FAILED: "Falhou",
      CANCELLED: "Cancelado",
      PROCESSING: "Processando",
      EXECUTING: "Executando",
    };
    return labels[status as keyof typeof labels] || status;
  };

  // Fetching data
  const fetchTransactions = useCallback(async (since?: Date) => {
    try {
      if (!since) {
        setTransactionsLoading(true);
      }

      const url = new URL("/api/admin/transactions/realtime", window.location.origin);
      url.searchParams.set("limit", "100");
      if (since) {
        url.searchParams.set("since", since.toISOString());
      }

      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch transactions");

      const data = await response.json();
      if (data.success && data.transactions) {
        if (since) {
          setTransactions((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const newTransactions = data.transactions.filter(
              (t: Transaction) => !existingIds.has(t.id)
            );
            return [...newTransactions, ...prev].slice(0, 500);
          });
        } else {
          setTransactions(data.transactions);
        }
        lastUpdateTimeRef.current = new Date();
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      if (!since) setTransactionsLoading(false);
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch("/api/admin/users?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setUsersList(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchUsers();

    const interval = setInterval(() => {
      fetchTransactions(lastUpdateTimeRef.current);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchTransactions]);

  // Handlers
  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleTransactionClick = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsDialog(true);
    setDetailsLoading(true);
    setTransactionDetails(null);

    const detailsUrl = transaction.id.startsWith("order_")
      ? `/api/admin/transactions/order/${transaction.id.slice("order_".length)}`
      : `/api/admin/transactions/${transaction.id}`;

    try {
      const response = await fetch(detailsUrl);
      const data = await response.json();
      if (response.ok && data.success && data.transaction) {
        setTransactionDetails(data.transaction);
      } else {
        throw new Error(data.error || "Failed to load details");
      }
    } catch (error) {
      console.error("Error fetching details:", error);
      // Fallback
      setTransactionDetails({
        id: transaction.id,
        type: transaction.type,
        amount: Math.abs(transaction.value ?? transaction.amount ?? 0),
        currency: transaction.currency ?? "BRL",
        balance: 0,
        description: "",
        status: transaction.status,
        createdAt: transaction.date,
        user: typeof transaction.user === "object" && transaction.user ? transaction.user : { name: "—", email: "—" },
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleMarkAsCompleted = async (hash?: string) => {
    if (!transactionDetails) return;
    setMarkingCompleted(true);
    try {
      const response = await fetch(
        `/api/admin/transactions/${transactionDetails.id}/mark-completed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hash }),
        }
      );
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: "Sucesso", description: "Transação confirmada!" });
        setShowConfirmPaymentDialog(false);
        setPaymentConfirmationHash("");
        fetchTransactions();
        // Refresh details
        const detailsRes = await fetch(`/api/admin/transactions/${transactionDetails.id}`);
        const detailsData = await detailsRes.json();
        if (detailsData.success) setTransactionDetails(detailsData.transaction);
      } else {
        throw new Error(data.error || "Failed to mark as completed");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Erro" });
    } finally {
      setMarkingCompleted(false);
    }
  };

  const handleRejectTransaction = async () => {
    if (!transactionDetails || !rejectionReason.trim()) return;
    setRejectingTransaction(true);
    try {
      const response = await fetch(`/api/admin/transactions/${transactionDetails.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: "Sucesso", description: "Transação rejeitada!" });
        setShowRejectionDialog(false);
        setRejectionReason("");
        fetchTransactions();
        const detailsRes = await fetch(`/api/admin/transactions/${transactionDetails.id}`);
        const detailsData = await detailsRes.json();
        if (detailsData.success) setTransactionDetails(detailsData.transaction);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao rejeitar" });
    } finally {
      setRejectingTransaction(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Data", "Tipo", "Usuário", "Valor", "Status"];
    const rows = filteredAndSortedTransactions.map((tx) => [
      new Date(tx.date).toLocaleString("pt-BR"),
      getTransactionTypeLabel(tx.type),
      typeof tx.user === "string" ? tx.user : tx.user ? `${tx.user.name} (${tx.user.email})` : "N/A",
      formatCurrency(tx.value || 0),
      getStatusLabel(tx.status),
    ]);

    const csvContent = headers.join(",") + "\n" + rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleBalanceAdjustment = async () => {
    if (!balanceUserId || !balanceAmount) return;
    setProcessingBalance(true);
    try {
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
      if (response.ok && data.success) {
        toast({ title: "Sucesso", description: "Saldo ajustado com sucesso!" });
        setShowBalanceDialog(false);
        setBalanceAmount("");
        setBalanceReason("");
        fetchTransactions();
      } else {
        throw new Error(data.error || "Erro ao ajustar saldo");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Erro" });
    } finally {
      setProcessingBalance(false);
    }
  };

  // Filters logic
  const filteredAndSortedTransactions = transactions
    .filter((tx) => {
      const userStr = typeof tx.user === "string" ? tx.user : tx.user ? `${tx.user.name} ${tx.user.email}` : "";
      const matchesSearch = userStr.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           getTransactionTypeLabel(tx.type).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || tx.status === statusFilter ||
        (statusFilter === "PENDING" && ["PENDING", "PROCESSING", "EXECUTING"].includes(tx.status)) ||
        (statusFilter === "APPROVED" && ["APPROVED", "COMPLETED", "CONFIRMED"].includes(tx.status)) ||
        (statusFilter === "REJECTED" && ["REJECTED", "FAILED", "CANCELLED"].includes(tx.status));

      const matchesType = typeFilter === "all" || tx.type === typeFilter;

      // Date filters
      const txDate = new Date(tx.date);
      const matchesDateFrom = !dateFrom || txDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || txDate <= new Date(dateTo + "T23:59:59");

      // Amount filters
      const val = Math.abs(tx.value || 0);
      const matchesAmountMin = !amountMin || val >= parseFloat(amountMin);
      const matchesAmountMax = !amountMax || val <= parseFloat(amountMax);

      return matchesSearch && matchesStatus && matchesType && matchesDateFrom && matchesDateTo && matchesAmountMin && matchesAmountMax;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTransactions.size === filteredAndSortedTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredAndSortedTransactions.map((t) => t.id)));
    }
  };

  const handleBulkAction = async (action: "approve") => {
    if (selectedTransactions.size === 0) return;
    const confirm = window.confirm(`Deseja aprovar ${selectedTransactions.size} transações?`);
    if (!confirm) return;

    // Process sequentially or in parallel with a limit (simple parallel here)
    toast({ title: "Processando", description: `Aprovando ${selectedTransactions.size} transações...` });
    
    const ids = Array.from(selectedTransactions);
    for (const id of ids) {
      try {
        await fetch(`/api/admin/transactions/${id}/mark-completed`, { method: "POST" });
      } catch (e) {
        console.error(`Failed to approve ${id}`, e);
      }
    }

    toast({ title: "Concluído", description: "Processamento em massa finalizado." });
    setSelectedTransactions(new Set());
    fetchTransactions();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Histórico de Transações
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie todos os fluxos financeiros da plataforma
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Button
            onClick={() => setShowBalanceDialog(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Ajustar Saldo
          </Button>
          <Button
            variant="outline"
            onClick={() => fetchTransactions()}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Busca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Usuário ou tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-muted/50 border-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-muted/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="PENDING">Pendentes / Em andamento</SelectItem>
                  <SelectItem value="APPROVED">Aprovados</SelectItem>
                  <SelectItem value="REJECTED">Rejeitados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-muted/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  <SelectItem value="DEPOSIT">Depósito</SelectItem>
                  <SelectItem value="WITHDRAWAL">Saque</SelectItem>
                  <SelectItem value="BUY_CRYPTO">Compra Crypto</SelectItem>
                  <SelectItem value="FEE">Comissão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="bg-muted/50 border-border h-9"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="bg-muted/50 border-border h-9"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
             <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Período:</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-muted/50 border-border h-9 w-40"
                />
                <span className="text-muted-foreground">até</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-muted/50 border-border h-9 w-40"
                />
             </div>
             {(searchTerm || statusFilter !== "all" || typeFilter !== "all" || dateFrom || dateTo || amountMin || amountMax) && (
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => {
                   setSearchTerm("");
                   setStatusFilter("all");
                   setTypeFilter("all");
                   setDateFrom("");
                   setDateTo("");
                   setAmountMin("");
                   setAmountMax("");
                 }}
                 className="text-muted-foreground hover:text-foreground"
               >
                 <X className="h-4 w-4 mr-2" />
                 Limpar Filtros
               </Button>
             )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTransactions.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-primary">
            {selectedTransactions.size} transações selecionadas
          </span>
          <div className="flex gap-2">
             <Button
              size="sm"
              onClick={() => handleBulkAction("approve")}
              className="bg-primary hover:bg-primary/90"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar Selecionados
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedTransactions(new Set())}
              className="border-border"
            >
              Desmarcar Todos
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="py-4 px-4 w-12">
                   <Checkbox
                    checked={filteredAndSortedTransactions.length > 0 && selectedTransactions.size === filteredAndSortedTransactions.length}
                    onCheckedChange={toggleSelectAll}
                    className="border-border"
                  />
                </th>
                <th className="py-4 px-4 text-left cursor-pointer group" onClick={() => handleSort("date")}>
                  <div className="flex items-center gap-1">
                    Data <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="py-4 px-4 text-left">Tipo</th>
                <th className="py-4 px-4 text-left">Usuário</th>
                <th className="py-4 px-4 text-left cursor-pointer group" onClick={() => handleSort("value")}>
                  <div className="flex items-center gap-1">
                    Valor <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="py-4 px-4 text-left">Status</th>
                <th className="py-4 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactionsLoading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                     <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary opacity-50" />
                     <p className="mt-2 text-muted-foreground">Carregando...</p>
                  </td>
                </tr>
              ) : filteredAndSortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-muted-foreground">
                    Nenhuma transação encontrada com esses filtros.
                  </td>
                </tr>
              ) : (
                filteredAndSortedTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer group" onClick={() => handleTransactionClick(tx)}>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                       <Checkbox
                        checked={selectedTransactions.has(tx.id)}
                        onCheckedChange={() => toggleTransactionSelection(tx.id)}
                        className="border-border"
                      />
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {new Date(tx.date).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tx.type === "DEPOSIT" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                        tx.type === "WITHDRAWAL" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                        "bg-primary/10 text-primary border border-primary/20"
                      }`}>
                        {getTransactionTypeLabel(tx.type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">
                      {typeof tx.user === "string" ? tx.user : tx.user?.name || "N/A"}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {formatCurrency(tx.value || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-[11px] font-semibold ${
                        ["APPROVED", "COMPLETED", "CONFIRMED"].includes(tx.status) ? "bg-emerald-500/15 text-emerald-500" :
                        ["PENDING", "PROCESSING", "EXECUTING"].includes(tx.status) ? "bg-yellow-500/15 text-yellow-500" :
                        "bg-red-500/15 text-red-500"
                      }`}>
                        {getStatusLabel(tx.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                       <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                         Ver Detalhes
                       </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
            <DialogTitle>Detalhes da Transação</DialogTitle>
            <DialogDescription>ID: {transactionDetails?.id}</DialogDescription>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="py-12 flex justify-center"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>
          ) : transactionDetails ? (
            <div className="space-y-6 mt-4">
               <div className="grid grid-cols-2 gap-6 p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tipo</p>
                    <p className="font-semibold text-lg">{getTransactionTypeLabel(transactionDetails.type)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Status</p>
                    <div className="flex items-center gap-2">
                       <span className={`px-2 py-1 rounded text-[11px] font-semibold ${
                        ["APPROVED", "COMPLETED", "CONFIRMED"].includes(transactionDetails.status) ? "bg-emerald-500/15 text-emerald-500" :
                        ["PENDING", "PROCESSING", "EXECUTING"].includes(transactionDetails.status) ? "bg-yellow-500/15 text-yellow-500" :
                        "bg-red-500/15 text-red-500"
                      }`}>
                        {getStatusLabel(transactionDetails.status)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Valor</p>
                    <p className="font-mono text-xl font-bold text-primary">{formatCurrency(transactionDetails.amount)} {transactionDetails.currency}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Data</p>
                    <p className="font-medium">{new Date(transactionDetails.createdAt).toLocaleString("pt-BR")}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Informações do Usuário</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-medium">{transactionDetails.user.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{transactionDetails.user.email}</p>
                    </div>
                    {transactionDetails.user.cpf && (
                      <div>
                        <p className="text-xs text-muted-foreground">CPF</p>
                        <p className="font-medium">{transactionDetails.user.cpf}</p>
                      </div>
                    )}
                  </div>
               </div>

               {transactionDetails.deposit && (
                 <div className="space-y-4 border-t border-border pt-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Depósito Cripto</h3>
                       {transactionDetails.status === "PENDING" && (
                         <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleMarkAsCompleted()} disabled={markingCompleted}>
                              {markingCompleted ? "Processando..." : "Aprovar Pagamento"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setShowRejectionDialog(true)}>
                              Negar
                            </Button>
                         </div>
                       )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border border-border">
                       <div>
                          <p className="text-xs text-muted-foreground">Valor Solicitado</p>
                          <p className="font-bold text-emerald-500">{formatUSDT(Number(transactionDetails.deposit.amount))} USDT</p>
                       </div>
                       {transactionDetails.deposit.externalId && (
                         <div>
                            <p className="text-xs text-muted-foreground">Endereço da Carteira (Destino)</p>
                            <p className="font-mono text-[10px] break-all">{transactionDetails.deposit.externalId}</p>
                         </div>
                       )}
                    </div>
                 </div>
               )}

               {transactionDetails.withdrawal && (
                 <div className="space-y-4 border-t border-border pt-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Detalhes do Saque</h3>
                       {(transactionDetails.status === "PENDING" || transactionDetails.status === "PROCESSING") && (
                         <Button onClick={() => setShowConfirmPaymentDialog(true)}>Confirmar Pagamento</Button>
                       )}
                    </div>
                    <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border">
                       {transactionDetails.withdrawal.pixKey && (
                         <div>
                            <p className="text-xs text-muted-foreground font-bold">CHAVE PIX</p>
                            <p className="font-mono text-lg text-primary">{transactionDetails.withdrawal.pixKey}</p>
                         </div>
                       )}
                       {transactionDetails.withdrawal.walletAddress && (
                         <div>
                            <p className="text-xs text-muted-foreground font-bold">ENDEREÇO CRIPTO ({transactionDetails.withdrawal.network})</p>
                            <p className="font-mono break-all text-primary">{transactionDetails.withdrawal.walletAddress}</p>
                         </div>
                       )}
                    </div>
                 </div>
               )}

               {transactionDetails.order && (
                 <div className="space-y-4 border-t border-border pt-6">
                    <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Pedido PIX Automático</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <p className="text-xs text-muted-foreground">ID Externo</p>
                          <p className="font-mono text-[11px]">{transactionDetails.order.externalOrderId || "N/A"}</p>
                       </div>
                       <div>
                          <p className="text-xs text-muted-foreground">Total BRL</p>
                          <p className="font-bold">{formatCurrency(Number(transactionDetails.order.total))}</p>
                       </div>
                    </div>
                 </div>
               )}

               <details className="mt-4">
                 <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Ver Metadados Raw</summary>
                 <pre className="mt-2 p-2 bg-black/40 rounded text-[10px] overflow-auto max-h-40">
                    {JSON.stringify(transactionDetails, null, 2)}
                 </pre>
               </details>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Balance Adjust Dialog */}
       <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Wallet className="h-5 w-5 mr-2" />
              Ajustar Saldo do Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Usuário</Label>
              <Select value={balanceUserId} onValueChange={setBalanceUserId}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border max-h-60">
                  {usersList.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <Label>Moeda</Label>
                  <Select value={balanceCurrency} onValueChange={(v: any) => setBalanceCurrency(v)}>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border">
                       <SelectItem value="USDT">USDT</SelectItem>
                       <SelectItem value="BRL">BRL</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div>
                  <Label>Operação</Label>
                   <Select value={balanceOperation} onValueChange={(v: any) => setBalanceOperation(v)}>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border">
                       <SelectItem value="CREDIT">Creditar (+)</SelectItem>
                       <SelectItem value="DEDUCT">Deduzir (-)</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
            </div>
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="0.00"
                className="bg-muted border-border"
              />
            </div>
            <div>
              <Label>Motivo</Label>
              <Textarea
                value={balanceReason}
                onChange={(e) => setBalanceReason(e.target.value)}
                placeholder="Ex: Correção de depósito, Bônus, etc."
                className="bg-muted border-border"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setShowBalanceDialog(false)}>Cancelar</Button>
             <Button onClick={handleBalanceAdjustment} disabled={processingBalance || !balanceUserId || !balanceAmount}>
                {processingBalance ? "Processando..." : "Confirmar Ajuste"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Negar Transação</DialogTitle>
            <DialogDescription>Informe o motivo para o usuário.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
             <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: Comprovante ilegível..."
              className="bg-muted border-border h-32"
            />
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>Cancelar</Button>
             <Button variant="destructive" onClick={handleRejectTransaction} disabled={rejectingTransaction || !rejectionReason.trim()}>
                Confirmar Rejeição
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Payment Dialog */}
      <Dialog open={showConfirmPaymentDialog} onOpenChange={setShowConfirmPaymentDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento Realizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <Label>Hash / Comprovante (Opcional)</Label>
             <Input
                value={paymentConfirmationHash}
                onChange={(e) => setPaymentConfirmationHash(e.target.value)}
                placeholder="0x..."
                className="bg-muted border-border"
              />
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setShowConfirmPaymentDialog(false)}>Cancelar</Button>
             <Button onClick={() => handleMarkAsCompleted(paymentConfirmationHash)} disabled={markingCompleted}>
                {markingCompleted ? "Processando..." : "Confirmar Pagamento"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">Carregando módulo de transações...</div>}>
      <TransactionsPageContent />
    </Suspense>
  );
}
