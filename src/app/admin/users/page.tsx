"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Mail,
  CreditCard,
  FileText,
  RefreshCw,
  MoreVertical,
  Trash2,
  Edit,
  Search,
  Phone,
  Wallet,
  Shield,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Activity,
  X,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/components/admin/NotificationBell";
import BackToDashboardButton from "@/components/admin/BackToDashboardButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatUSDT, formatBRL } from "@/lib/format-currency";

interface User {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone?: string | null;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  kycStatus: "PENDING" | "APPROVED" | "REJECTED";
  emailVerified: boolean;
  createdAt: string;
}

interface UserWithDetails extends User {
  balance?: {
    currency: string;
    amount: number;
    locked: number;
  }[];
  transactionCount?: number;
  lastTransactionDate?: string;
  transactions?: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    externalId?: string | null;
  }>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [usersWithDetails, setUsersWithDetails] = useState<UserWithDetails[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    approvalStatus: "PENDING" as "PENDING" | "APPROVED" | "REJECTED",
    kycStatus: "PENDING" as "PENDING" | "APPROVED" | "REJECTED",
  });
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [showEditConfirmDialog, setShowEditConfirmDialog] = useState(false);
  const [editConfirmStep, setEditConfirmStep] = useState(1);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailRecipients, setEmailRecipients] = useState<"all" | "filtered" | "selected">("filtered");
  const [selectedUsers] = useState<Set<string>>(new Set());
  const [sendingEmails, setSendingEmails] = useState(false);
  const [showTransactionsDialog, setShowTransactionsDialog] = useState(false);
  const [viewingUserTransactions, setViewingUserTransactions] = useState<UserWithDetails | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const pending = users.filter((u) => u.approvalStatus === "PENDING").length;
    const approved = users.filter((u) => u.approvalStatus === "APPROVED").length;
    const rejected = users.filter((u) => u.approvalStatus === "REJECTED").length;
    const kycPending = users.filter((u) => u.kycStatus === "PENDING").length;
    const kycApproved = users.filter((u) => u.kycStatus === "APPROVED").length;
    return { total, pending, approved, rejected, kycPending, kycApproved };
  }, [users]);

  const fetchUsers = useCallback(
    async (status?: string) => {
      try {
        setLoading(true);
        const url =
          status && status !== "ALL"
            ? `/api/admin/users?status=${status}&limit=1000`
            : "/api/admin/users?limit=1000";

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Falha ao carregar usuários",
          });
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar usuários",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const fetchUserDetails = useCallback(
    async (userId: string) => {
      if (loadingDetails[userId]) return;
      
      setLoadingDetails((prev) => ({ ...prev, [userId]: true }));
      try {
        const [balanceResponse, transactionsResponse] = await Promise.all([
          fetch(`/api/admin/users/${userId}?include=balance`),
          fetch(`/api/admin/users/${userId}?include=transactions`),
        ]);

        const balanceData = balanceResponse.ok ? await balanceResponse.json() : null;
        const txData = transactionsResponse.ok ? await transactionsResponse.json() : null;

        setUsersWithDetails((prev) => {
          const existing = prev.find((u) => u.id === userId);
          if (existing) {
            return prev.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    balance: balanceData?.balances || [],
                    transactionCount: txData?.transactions?.length || 0,
                    lastTransactionDate:
                      txData?.transactions?.[0]?.createdAt || undefined,
                    transactions: txData?.transactions || [],
                  }
                : u
            );
          }
          return prev;
        });
      } catch (error) {
        console.error(`Error fetching details for user ${userId}:`, error);
      } finally {
        setLoadingDetails((prev => {
          const next = { ...prev };
          delete next[userId];
          return next;
        }));
      }
    },
    [loadingDetails]
  );

  const toggleUserExpansion = useCallback((userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
        // Fetch details when expanding
        const user = usersWithDetails.find((u) => u.id === userId);
        if (!user?.balance && !loadingDetails[userId]) {
          fetchUserDetails(userId);
        }
      }
      return next;
    });
  }, [usersWithDetails, loadingDetails, fetchUserDetails]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get("status");
    if (status) {
      setStatusFilter(status);
      fetchUsers(status);
    } else {
      fetchUsers();
    }
  }, [fetchUsers]);

  useEffect(() => {
    // Initialize usersWithDetails from users
    setUsersWithDetails((prev) => {
      const existingIds = new Set(prev.map((u) => u.id));
      const newUsers = users
        .filter((u) => !existingIds.has(u.id))
        .map((u) => ({
          ...u,
          balance: prev.find((p) => p.id === u.id)?.balance,
          transactionCount: prev.find((p) => p.id === u.id)?.transactionCount,
          lastTransactionDate: prev.find((p) => p.id === u.id)?.lastTransactionDate,
        }));
      return [...prev.filter((u) => users.some((nu) => nu.id === u.id)), ...newUsers];
    });
  }, [users]);

  useEffect(() => {
    let filtered = usersWithDetails;

    // Apply status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((user) => user.approvalStatus === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.cpf?.toLowerCase().includes(query) ||
          user.phone?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  }, [usersWithDetails, statusFilter, searchQuery]);

  const handleApproval = async (
    userId: string,
    action: "approve" | "reject"
  ) => {
    setProcessingUser(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Sucesso",
          description: data.message,
        });
        fetchUsers();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.error || "Falha ao processar solicitação",
        });
      }
    } catch (error) {
      console.error("Error processing approval:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao processar solicitação",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  const handleResetToPending = async (userId: string) => {
    try {
      setProcessingUser(userId);
      const response = await fetch(`/api/admin/users/${userId}/reset`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Status do usuário resetado para pendente",
        });
        fetchUsers();
      } else {
        throw new Error(data.error || "Falha ao resetar status do usuário");
      }
    } catch (error) {
      console.error("Error resetting user:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao resetar status do usuário",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setProcessingUser(userId);
      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Usuário deletado permanentemente",
        });
        fetchUsers();
      } else {
        throw new Error(data.error || "Falha ao deletar usuário");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao deletar usuário",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  const openDeleteDialog = (user: User) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja deletar permanentemente o usuário ${user.name} (${user.email})?\n\nEsta ação não pode ser desfeita e irá deletar todos os dados do usuário.`
    );
    if (confirmed) {
      handleDeleteUser(user.id);
    }
  };

  const handleViewProfile = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      cpf: user.cpf || "",
      approvalStatus: user.approvalStatus,
      kycStatus: user.kycStatus,
    });
    setEditDialogOpen(true);
  };

  const handleSaveUserClick = () => {
    setShowEditConfirmDialog(true);
    setEditConfirmStep(1);
  };

  const handleEditConfirm = () => {
    if (editConfirmStep === 1) {
      setEditConfirmStep(2);
    } else {
      setShowEditConfirmDialog(false);
      setEditConfirmStep(1);
      handleSaveUser();
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/users/${editingUser.id}/update-profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editFormData),
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "User profile updated successfully",
        });
        setEditDialogOpen(false);
        fetchUsers();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update user",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmails = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Assunto e mensagem são obrigatórios",
      });
      return;
    }

    // Determine which users to send to
    let recipients: UserWithDetails[] = [];
    if (emailRecipients === "all") {
      recipients = usersWithDetails;
    } else if (emailRecipients === "filtered") {
      recipients = filteredUsers;
    } else if (emailRecipients === "selected") {
      recipients = usersWithDetails.filter((u) => selectedUsers.has(u.id));
      if (recipients.length === 0) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Nenhum usuário selecionado",
        });
        return;
      }
    }

    if (recipients.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhum destinatário encontrado",
      });
      return;
    }

    setSendingEmails(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Send emails sequentially to avoid overwhelming the server
      for (const user of recipients) {
        try {
          const response = await fetch("/api/admin/notification-center/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
              subject: emailSubject,
              message: emailMessage,
              sendEmail: true,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to send email to ${user.email}`);
          }
        } catch (error) {
          failCount++;
          console.error(`Error sending email to ${user.email}:`, error);
        }
      }

      toast({
        title: "Emails Enviados",
        description: `Enviados com sucesso: ${successCount}${failCount > 0 ? ` | Falhas: ${failCount}` : ""}`,
      });

      // Reset form
      setEmailSubject("");
      setEmailMessage("");
      setEmailDialogOpen(false);
    } catch (error) {
      console.error("Error sending emails:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao enviar emails",
      });
    } finally {
      setSendingEmails(false);
    }
  };

  const getRecipientCount = () => {
    if (emailRecipients === "all") return usersWithDetails.length;
    if (emailRecipients === "filtered") return filteredUsers.length;
    return selectedUsers.size;
  };

  const handleViewTransactions = async (user: UserWithDetails) => {
    setViewingUserTransactions(user);
    setShowTransactionsDialog(true);
    
    // If transactions not loaded, fetch them
    if (!user.transactions || user.transactions.length === 0) {
      setLoadingTransactions(true);
      try {
        const response = await fetch(`/api/admin/users/${user.id}?include=transactions`);
        if (response.ok) {
          const data = await response.json();
          setViewingUserTransactions({
            ...user,
            transactions: data.transactions || [],
            transactionCount: data.transactions?.length || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha ao carregar transações",
        });
      } finally {
        setLoadingTransactions(false);
      }
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      COMPLETED: "Concluída",
      APPROVED: "Aprovada",
      CONFIRMED: "Confirmada",
      PENDING: "Pendente",
      PROCESSING: "Processando",
      EXECUTING: "Executando",
      REJECTED: "Rejeitada",
      FAILED: "Falhou",
      CANCELLED: "Cancelada",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === "COMPLETED" || status === "APPROVED" || status === "CONFIRMED") {
      return "bg-green-900/50 text-green-400 border border-green-500/30";
    }
    if (status === "PENDING" || status === "PROCESSING" || status === "EXECUTING") {
      return "bg-yellow-900/50 text-yellow-400 border border-yellow-500/30";
    }
    return "bg-red-900/50 text-red-400 border border-red-500/30";
  };

  const getTransactionTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      DEPOSIT: "Depósito",
      WITHDRAWAL: "Saque",
      BUY_CRYPTO: "Compra de Cripto",
      SELL_CRYPTO: "Venda de Cripto",
      BUY: "Compra",
      SELL: "Venda",
    };
    return typeMap[type] || type.replace(/_/g, " ");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30"
          >
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Aprovado
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="secondary" className="bg-red-500/20 text-red-600 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTotalBalance = (balances: { currency: string; amount: number }[] = []) => {
    const usdtBalance = balances.find((b) => b.currency === "USDT");
    return usdtBalance ? Number(usdtBalance.amount) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-[1920px] mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            <p className="mt-2 text-gray-400">Carregando usuários...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-8">
      <div className="max-w-[1920px] mx-auto space-y-6">
        {/* Back to Dashboard Button */}
        <BackToDashboardButton />
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-gray-400 mt-1">
              Gerenciar usuários e verificar documentos
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={() => setEmailDialogOpen(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mail className="w-4 h-4 mr-2" />
              Enviar Email
            </Button>
            <NotificationBell />
            <Link href="/admin/kyc">
              <Button variant="outline" className="border-gray-700 hover:bg-gray-800">
                <FileText className="w-4 h-4 mr-2" />
                KYC Verification
              </Button>
            </Link>
            <Button onClick={() => fetchUsers()} variant="outline" className="border-gray-700 hover:bg-gray-800">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <User className="w-8 h-8 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Approved</p>
                  <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Rejected</p>
                  <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">KYC Pending</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.kycPending}</p>
                </div>
                <Shield className="w-8 h-8 text-yellow-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">KYC Approved</p>
                  <p className="text-2xl font-bold text-green-400">{stats.kycApproved}</p>
                </div>
                <Shield className="w-8 h-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, email, CPF ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700 text-white placeholder-gray-400"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              onClick={() => setViewMode("grid")}
              size="sm"
              className={viewMode === "grid" ? "" : "border-gray-700"}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              size="sm"
              className={viewMode === "list" ? "" : "border-gray-700"}
            >
              List
            </Button>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "ALL" ? "default" : "outline"}
            onClick={() => setStatusFilter("ALL")}
            size="sm"
            className={statusFilter === "ALL" ? "" : "border-gray-700"}
          >
            All Users ({stats.total})
          </Button>
          <Button
            variant={statusFilter === "PENDING" ? "default" : "outline"}
            onClick={() => setStatusFilter("PENDING")}
            size="sm"
            className={statusFilter === "PENDING" ? "bg-yellow-600 hover:bg-yellow-700" : "border-gray-700"}
          >
            Pending ({stats.pending})
          </Button>
          <Button
            variant={statusFilter === "APPROVED" ? "default" : "outline"}
            onClick={() => setStatusFilter("APPROVED")}
            size="sm"
            className={statusFilter === "APPROVED" ? "bg-green-600 hover:bg-green-700" : "border-gray-700"}
          >
            Approved ({stats.approved})
          </Button>
          <Button
            variant={statusFilter === "REJECTED" ? "default" : "outline"}
            onClick={() => setStatusFilter("REJECTED")}
            size="sm"
            className={statusFilter === "REJECTED" ? "bg-red-600 hover:bg-red-700" : "border-gray-700"}
          >
            Rejected ({stats.rejected})
          </Button>
        </div>

        {/* Users Grid/List */}
        {filteredUsers.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">
                {searchQuery
                  ? "Nenhum usuário encontrado"
                  : statusFilter === "ALL"
                  ? "Nenhum usuário encontrado"
                  : `Nenhum usuário ${statusFilter.toLowerCase()} encontrado`}
              </h3>
              <p className="text-gray-400">
                {searchQuery
                  ? "Tente ajustar sua busca"
                  : statusFilter === "ALL"
                  ? "Não há usuários para exibir no momento."
                  : `Não há usuários com status ${statusFilter.toLowerCase()} no momento.`}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredUsers.map((user) => {
              const isExpanded = expandedUsers.has(user.id);
              const userBalance = getTotalBalance(user.balance);
              const isLoadingDetails = loadingDetails[user.id];

              return (
                <Card
                  key={user.id}
                  className="hover:shadow-lg transition-all bg-gray-900 border-gray-800 flex flex-col"
                >
                  <CardContent className="p-5 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold truncate">
                            {user.name}
                          </h3>
                          <div className="mt-1">{getStatusBadge(user.approvalStatus)}</div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-800 flex-shrink-0"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-gray-900 border-gray-800"
                        >
                          <DropdownMenuItem
                            onClick={() => handleEditUser(user)}
                            className="text-white hover:bg-gray-800 focus:bg-gray-800"
                          >
                            <Edit className="mr-2 h-4 w-4 text-blue-400" />
                            Editar Usuário
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleViewProfile(user.id)}
                            className="text-white hover:bg-gray-800 focus:bg-gray-800"
                          >
                            <ExternalLink className="mr-2 h-4 w-4 text-green-400" />
                            Ver Perfil Completo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-700" />
                          <DropdownMenuItem
                            className="text-red-400 hover:bg-red-900/20 focus:bg-red-900/20"
                            onClick={() => openDeleteDialog(user)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deletar Usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* User Info */}
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Phone className="w-4 h-4" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      {user.cpf && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <CreditCard className="w-4 h-4" />
                          <span>{user.cpf}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(user.createdAt)}</span>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-gray-800/50 rounded-lg p-2">
                        <p className="text-xs text-gray-400">Saldo</p>
                        <p className="text-sm font-semibold text-white">
                          {userBalance > 0 ? formatUSDT(userBalance) : "0 USDT"}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-2">
                        <p className="text-xs text-gray-400">Transações</p>
                        <p className="text-sm font-semibold text-white">
                          {user.transactionCount || 0}
                        </p>
                      </div>
                    </div>

                    {/* KYC Status */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-400">KYC:</span>
                        {getStatusBadge(user.kycStatus)}
                      </div>
                    </div>

                    {/* Expand Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleUserExpansion(user.id)}
                      className="w-full border border-gray-700 hover:bg-gray-800"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-2" />
                          Ocultar Detalhes
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </>
                      )}
                    </Button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                        {isLoadingDetails ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
                            <p className="text-xs text-gray-400 mt-2">Carregando...</p>
                          </div>
                        ) : (
                          <>
                            {/* Balance Details */}
                            {user.balance && user.balance.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                                  <Wallet className="w-4 h-4" />
                                  Saldos
                                </h4>
                                <div className="space-y-1">
                                  {user.balance.map((bal) => (
                                    <div
                                      key={bal.currency}
                                      className="flex items-center justify-between text-sm bg-gray-800/50 rounded p-2"
                                    >
                                      <span className="text-gray-400">{bal.currency}</span>
                                      <span className="text-white font-medium">
                                        {bal.currency === "BRL"
                                          ? formatBRL(Number(bal.amount))
                                          : formatUSDT(Number(bal.amount))}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Transaction Summary */}
                            {user.transactionCount !== undefined && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                                  <Activity className="w-4 h-4" />
                                  Resumo
                                </h4>
                                <div className="text-sm text-gray-300">
                                  <p>Total de transações: {user.transactionCount}</p>
                                  {user.lastTransactionDate && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      Última: {formatDate(user.lastTransactionDate)}
                                    </p>
                                  )}
                                </div>
                                {user.transactionCount > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewTransactions(user)}
                                    className="mt-3 w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                                  >
                                    <Activity className="w-4 h-4 mr-2" />
                                    Ver Transações
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2 pt-2">
                              {user.approvalStatus === "PENDING" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproval(user.id, "approve")}
                                    disabled={processingUser === user.id}
                                    className="bg-green-600 hover:bg-green-700 text-white w-full"
                                  >
                                    {processingUser === user.id ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        Aprovar
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleApproval(user.id, "reject")}
                                    disabled={processingUser === user.id}
                                    className="bg-red-600 hover:bg-red-700 w-full"
                                  >
                                    {processingUser === user.id ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                      <>
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Rejeitar
                                      </>
                                    )}
                                  </Button>
                                </>
                              )}

                              {(user.approvalStatus === "APPROVED" ||
                                user.approvalStatus === "REJECTED") && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleResetToPending(user.id)}
                                    disabled={processingUser === user.id}
                                    className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                                  >
                                    {processingUser === user.id ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                      <>
                                        <Clock className="w-4 h-4 mr-1" />
                                        Resetar
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproval(user.id, "approve")}
                                    disabled={processingUser === user.id}
                                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                  >
                                    {processingUser === user.id ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        Re-aprovar
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => {
              const userBalance = getTotalBalance(user.balance);
              return (
                <Card
                  key={user.id}
                  className="hover:shadow-md transition-shadow bg-gray-900 border-gray-800"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-lg font-semibold truncate">
                                {user.name}
                              </h3>
                              {getStatusBadge(user.approvalStatus)}
                            </div>
                            <div className="flex items-center space-x-1 text-sm text-gray-400">
                              <Mail className="w-4 h-4" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">
                            {user.phone && (
                              <div className="flex items-center space-x-1 mb-1">
                                <Phone className="w-4 h-4" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                            {user.cpf && (
                              <div className="flex items-center space-x-1">
                                <CreditCard className="w-4 h-4" />
                                <span>{user.cpf}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            <div className="mb-1">
                              <span className="text-gray-500">Saldo: </span>
                              <span className="text-white font-medium">
                                {userBalance > 0 ? formatUSDT(userBalance) : "0 USDT"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Transações: </span>
                              <span className="text-white font-medium">
                                {user.transactionCount || 0}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">
                            <div className="mb-1">
                              <span>Criado em {formatDate(user.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              {getStatusBadge(user.kycStatus)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 ml-4">
                        {user.approvalStatus === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproval(user.id, "approve")}
                              disabled={processingUser === user.id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {processingUser === user.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Aprovar
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApproval(user.id, "reject")}
                              disabled={processingUser === user.id}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {processingUser === user.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Rejeitar
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        {(user.approvalStatus === "APPROVED" ||
                          user.approvalStatus === "REJECTED") && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleResetToPending(user.id)}
                              disabled={processingUser === user.id}
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              {processingUser === user.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4 mr-1" />
                                  Resetar
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproval(user.id, "approve")}
                              disabled={processingUser === user.id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {processingUser === user.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Re-aprovar
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-800"
                            >
                              <MoreVertical className="h-4 w-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-gray-900 border-gray-800"
                          >
                            <DropdownMenuItem
                              onClick={() => handleEditUser(user)}
                              className="text-white hover:bg-gray-800 focus:bg-gray-800"
                            >
                              <Edit className="mr-2 h-4 w-4 text-blue-400" />
                              Editar Usuário
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewProfile(user.id)}
                              className="text-white hover:bg-gray-800 focus:bg-gray-800"
                            >
                              <ExternalLink className="mr-2 h-4 w-4 text-green-400" />
                              Ver Perfil Completo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-700" />
                            <DropdownMenuItem
                              className="text-red-400 hover:bg-red-900/20 focus:bg-red-900/20"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deletar Usuário
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Edit User: {editingUser?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update user information and status. Changes will be applied
              immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-gray-300">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-gray-300">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-gray-300">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cpf" className="text-gray-300">CPF</Label>
                <Input
                  id="edit-cpf"
                  value={editFormData.cpf}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, cpf: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-approval-status" className="text-gray-300">Approval Status</Label>
                <Select
                  value={editFormData.approvalStatus}
                  onValueChange={(value: "PENDING" | "APPROVED" | "REJECTED") =>
                    setEditFormData({ ...editFormData, approvalStatus: value })
                  }
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-kyc-status" className="text-gray-300">KYC Status</Label>
                <Select
                  value={editFormData.kycStatus}
                  onValueChange={(value: "PENDING" | "APPROVED" | "REJECTED") =>
                    setEditFormData({ ...editFormData, kycStatus: value })
                  }
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveUserClick} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Confirmation Dialog */}
      <Dialog open={showEditConfirmDialog} onOpenChange={(open) => {
        if (!open) {
          setShowEditConfirmDialog(false);
          setEditConfirmStep(1);
        }
      }}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editConfirmStep === 1 ? "Confirmar Edição" : "Confirmação Final"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editConfirmStep === 1 ? (
                <>
                  Você está prestes a editar as informações do usuário <strong className="text-white">{editingUser?.name}</strong>.
                  <br /><br />
                  Esta ação alterará os dados do usuário. Deseja continuar?
                </>
              ) : (
                <>
                  <strong className="text-red-400">ATENÇÃO:</strong> Esta é a confirmação final.
                  <br /><br />
                  Você confirma que deseja editar as informações do usuário <strong className="text-white">{editingUser?.name}</strong>?
                  <br /><br />
                  Clique em "Confirmar" novamente para prosseguir.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditConfirmDialog(false);
                setEditConfirmStep(1);
              }}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditConfirm}
              className={editConfirmStep === 1 ? "bg-yellow-600 hover:bg-yellow-700" : "bg-red-600 hover:bg-red-700"}
            >
              {editConfirmStep === 1 ? "Sim, Continuar" : "Confirmar Edição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              Enviar Email Rápido
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Envie um email para os usuários selecionados. O email também criará uma notificação na plataforma.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Recipient Selection */}
            <div className="space-y-2">
              <Label htmlFor="email-recipients" className="text-gray-300">
                Destinatários
              </Label>
              <Select
                value={emailRecipients}
                onValueChange={(value: "all" | "filtered" | "selected") =>
                  setEmailRecipients(value)
                }
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  <SelectItem value="filtered">
                    Usuários Filtrados ({filteredUsers.length})
                  </SelectItem>
                  <SelectItem value="all">
                    Todos os Usuários ({usersWithDetails.length})
                  </SelectItem>
                  <SelectItem value="selected">
                    Usuários Selecionados ({selectedUsers.size})
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {emailRecipients === "all" && `Enviando para todos os ${usersWithDetails.length} usuários`}
                {emailRecipients === "filtered" && `Enviando para ${filteredUsers.length} usuário(s) filtrado(s)`}
                {emailRecipients === "selected" && selectedUsers.size === 0 && "Nenhum usuário selecionado"}
                {emailRecipients === "selected" && selectedUsers.size > 0 && `Enviando para ${selectedUsers.size} usuário(s) selecionado(s)`}
              </p>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="email-subject" className="text-gray-300">
                Assunto <span className="text-red-400">*</span>
              </Label>
              <Input
                id="email-subject"
                placeholder="Ex: Atualização importante da conta"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="email-message" className="text-gray-300">
                Mensagem <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="email-message"
                placeholder="Digite sua mensagem aqui..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 min-h-[200px]"
                rows={8}
              />
              <p className="text-xs text-gray-500">
                A mensagem será enviada por email e também aparecerá como notificação na plataforma.
              </p>
            </div>

            {/* Preview Recipients */}
            {getRecipientCount() > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <p className="text-sm font-semibold text-gray-300 mb-2">
                  Preview de Destinatários:
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {(emailRecipients === "all"
                    ? usersWithDetails
                    : emailRecipients === "filtered"
                    ? filteredUsers
                    : usersWithDetails.filter((u) => selectedUsers.has(u.id))
                  )
                    .slice(0, 10)
                    .map((user) => (
                      <div
                        key={user.id}
                        className="text-xs text-gray-400 flex items-center gap-2"
                      >
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    ))}
                  {getRecipientCount() > 10 && (
                    <p className="text-xs text-gray-500 mt-1">
                      ... e mais {getRecipientCount() - 10} destinatário(s)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEmailDialogOpen(false);
                setEmailSubject("");
                setEmailMessage("");
              }}
              disabled={sendingEmails}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendEmails}
              disabled={sendingEmails || !emailSubject.trim() || !emailMessage.trim() || getRecipientCount() === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sendingEmails ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar para {getRecipientCount()} usuário(s)
                </>
              )}
            </Button>
          </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Transactions Dialog */}
      <Dialog open={showTransactionsDialog} onOpenChange={setShowTransactionsDialog}>
        <DialogContent className="max-w-4xl bg-gray-900 border-gray-800 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Transações de {viewingUserTransactions?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Histórico completo de transações do usuário
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {loadingTransactions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-gray-400">Carregando transações...</p>
              </div>
            ) : viewingUserTransactions?.transactions && viewingUserTransactions.transactions.length > 0 ? (
              <div className="space-y-2">
                {viewingUserTransactions.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`p-2 rounded ${
                          tx.type.includes("DEPOSIT") || tx.type.includes("BUY")
                            ? "bg-green-900/30 text-green-400"
                            : "bg-red-900/30 text-red-400"
                        }`}>
                          {tx.type.includes("DEPOSIT") || tx.type.includes("BUY") ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">
                              {getTransactionTypeLabel(tx.type)}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(tx.status)}`}>
                              {getStatusLabel(tx.status)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            {formatDate(tx.createdAt)}
                            {tx.externalId && (
                              <span className="ml-2 text-xs">ID: {tx.externalId}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-semibold ${
                            tx.type.includes("DEPOSIT") || tx.type.includes("BUY")
                              ? "text-green-400"
                              : "text-red-400"
                          }`}>
                            {tx.type.includes("DEPOSIT") || tx.type.includes("BUY") ? "+" : "-"}
                            {tx.currency === "BRL"
                              ? formatBRL(Number(tx.amount)).replace("R$ ", "")
                              : formatUSDT(Number(tx.amount)).replace(" USDT", "")}
                          </span>
                          <p className="text-xs text-gray-400 mt-1">{tx.currency}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400">Nenhuma transação encontrada</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTransactionsDialog(false);
                setViewingUserTransactions(null);
              }}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Fechar
            </Button>
            {viewingUserTransactions && (
              <Button
                onClick={() => {
                  setShowTransactionsDialog(false);
                  handleViewProfile(viewingUserTransactions.id);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Perfil Completo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
