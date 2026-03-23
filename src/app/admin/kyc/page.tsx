"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getKycImageSrc } from "@/lib/kyc-image-src";
import {
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  User,
  AlertCircle,
  Shield,
  Clock,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List,
  CheckSquare,
  Square,
  RefreshCw,
  MoreVertical,
  Download,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import ImageAnalysisPanel from "@/components/admin/ImageAnalysisPanel";
import NotificationBell from "@/components/admin/NotificationBell";
import BackToDashboardButton from "@/components/admin/BackToDashboardButton";
import KYCImage from "@/components/admin/KYCImage";
import { KycImageZoomModal } from "@/components/admin/KycImageZoomModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface KYCUser {
  id: string;
  name: string;
  email: string;
  cpf: string;
  documentType?: string | null;
  documentNumber?: string | null;
  documentFront?: string | null;
  documentBack?: string | null;
  documentSelfie?: string | null;
  kycStatus: "PENDING" | "APPROVED" | "REJECTED";
  kycSubmittedAt?: string | null;
  kycReviewedAt?: string | null;
  kycRejectionReason?: string | null;
  createdAt: string;
}

const AdminKYCPage = () => {
  const [users, setUsers] = useState<KYCUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<KYCUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<KYCUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [documentsToUpdate, setDocumentsToUpdate] = useState({
    front: true,
    back: true,
    selfie: true,
  });
  const [showResetDialog, setShowResetDialog] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/kyc");
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users);
      } else {
        throw new Error(data.error || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao buscar usuários",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const filterUsers = useCallback(() => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.cpf.includes(searchTerm)
      );
    }

    // Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((user) => user.kycStatus === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, statusFilter]);

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterUsers();
    setCurrentPage(1); // Reset to first page when filters change
  }, [filterUsers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const pending = users.filter((u) => u.kycStatus === "PENDING").length;
    const approved = users.filter((u) => u.kycStatus === "APPROVED").length;
    const rejected = users.filter((u) => u.kycStatus === "REJECTED").length;
    return { total, pending, approved, rejected };
  }, [users]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleApprove = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/kyc/${userId}/approve`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "KYC do usuário aprovado com sucesso",
        });
        fetchUsers();
        setSelectedUser(null);
      } else {
        throw new Error(data.error || "Failed to approve KYC");
      }
    } catch (error) {
      console.error("Error approving KYC:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao aprovar KYC",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Motivo da rejeição obrigatório",
        description: "Por favor, forneça um motivo para a rejeição",
      });
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/kyc/${userId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "KYC do usuário rejeitado com sucesso",
        });
        fetchUsers();
        setSelectedUser(null);
        setRejectionReason("");
        setShowRejectDialog(null);
      } else {
        throw new Error(data.error || "Failed to reject KYC");
      }
    } catch (error) {
      console.error("Error rejecting KYC:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao rejeitar KYC",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetToPending = async (userId: string) => {
    try {
      setActionLoading(userId);
      const docs: ("front" | "back" | "selfie")[] =
        documentsToUpdate.front || documentsToUpdate.back || documentsToUpdate.selfie
          ? (["front", "back", "selfie"] as const).filter((d) => documentsToUpdate[d])
          : ["front", "back", "selfie"];
      const response = await fetch(`/api/admin/kyc/${userId}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: resetReason?.trim() || undefined,
          documentsToUpdate: docs,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Status KYC redefinido para pendente para nova revisão",
        });
        fetchUsers();
        setSelectedUser(null);
        setShowResetDialog(null);
        setResetReason("");
        setDocumentsToUpdate({ front: true, back: true, selfie: true });
      } else {
        throw new Error(data.error || "Failed to reset KYC status");
      }
    } catch (error) {
      console.error("Error resetting KYC:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao redefinir status KYC",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedUsers.size === 0) return;

    const pendingUsers = Array.from(selectedUsers).filter((id) => {
      const user = users.find((u) => u.id === id);
      return user?.kycStatus === "PENDING";
    });

    if (pendingUsers.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhum usuário pendente selecionado",
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const userId of pendingUsers) {
      try {
        const response = await fetch(`/api/admin/kyc/${userId}/approve`, {
          method: "POST",
        });
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    toast({
      title: "Aprovação em lote concluída",
      description: `Aprovados: ${successCount}${
        failCount > 0 ? ` | Falhas: ${failCount}` : ""
      }`,
    });

    setSelectedUsers(new Set());
    fetchUsers();
  };

  const toggleRowExpansion = (userId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map((u) => u.id)));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-yellow-600 text-foreground">
            Pendente
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            Aprovado
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="secondary" className="bg-red-600 text-foreground">
            Rejeitado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-muted text-foreground">
            Desconhecido
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleImageClick = (src: string, alt: string, title: string) => {
    setSelectedImage({ src, alt, title });
  };

  const hasDocuments = (user: KYCUser) => {
    return !!(user.documentFront || user.documentBack || user.documentSelfie);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 lg:p-6">
      <div className="max-w-[1920px] mx-auto space-y-6">
        {/* Back to Dashboard Button */}
        <BackToDashboardButton />

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Verificação KYC
            </h1>
            <p className="text-muted-foreground">
              Revise e verifique documentos de identidade dos usuários
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              onClick={() => fetchUsers()}
              variant="outline"
              size="sm"
              className="border-border hover:bg-muted"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pendente</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {stats.pending}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Aprovado</p>
                  <p className="text-2xl font-bold text-green-400">
                    {stats.approved}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Rejeitado</p>
                  <p className="text-2xl font-bold text-red-400">
                    {stats.rejected}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome, email ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-muted border-border text-foreground">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="APPROVED">Aprovado</SelectItem>
                    <SelectItem value="REJECTED">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1 border border-border rounded-md p-1">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className={viewMode === "table" ? "bg-muted" : ""}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={viewMode === "grid" ? "bg-muted" : ""}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant={statusFilter === "ALL" ? "default" : "outline"}
                onClick={() => handleStatusFilter("ALL")}
                size="sm"
                className={
                  statusFilter === "ALL"
                    ? "bg-muted"
                    : "border-border"
                }
              >
                Todos ({stats.total})
              </Button>
              <Button
                variant={statusFilter === "PENDING" ? "default" : "outline"}
                onClick={() => handleStatusFilter("PENDING")}
                size="sm"
                className={
                  statusFilter === "PENDING"
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : "border-border"
                }
              >
                Pendente ({stats.pending})
              </Button>
              <Button
                variant={statusFilter === "APPROVED" ? "default" : "outline"}
                onClick={() => handleStatusFilter("APPROVED")}
                size="sm"
                className={
                  statusFilter === "APPROVED"
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "border-border"
                }
              >
                Aprovado ({stats.approved})
              </Button>
              <Button
                variant={statusFilter === "REJECTED" ? "default" : "outline"}
                onClick={() => handleStatusFilter("REJECTED")}
                size="sm"
                className={
                  statusFilter === "REJECTED"
                    ? "bg-red-600 hover:bg-red-700"
                    : "border-border"
                }
              >
                Rejeitado ({stats.rejected})
              </Button>
            </div>

            {/* Batch Actions */}
            {selectedUsers.size > 0 && (
              <div className="mt-4 p-3 bg-primary/20 border border-primary/30 rounded-lg flex items-center justify-between">
                <span className="text-sm text-primary">
                  {selectedUsers.size} usuário(s) selecionado(s)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleBatchApprove}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprovar Selecionados
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedUsers(new Set())}
                    className="border-border"
                  >
                    Limpar Seleção
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users List/Table */}
        {filteredUsers.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum usuário encontrado
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "ALL"
                  ? "Tente ajustar sua busca ou critérios de filtro"
                  : "Nenhum usuário enviou documentos KYC ainda"}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "table" ? (
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-muted">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedUsers.size === paginatedUsers.length &&
                            paginatedUsers.length > 0
                          }
                          onCheckedChange={selectAllUsers}
                          className="border-border"
                        />
                      </TableHead>
                      <TableHead className="text-muted-foreground">Usuário</TableHead>
                      <TableHead className="text-muted-foreground">CPF</TableHead>
                      <TableHead className="text-muted-foreground">
                        Documentos
                      </TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Enviado</TableHead>
                      <TableHead className="text-muted-foreground">Revisado</TableHead>
                      <TableHead className="text-muted-foreground text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => {
                      const isExpanded = expandedRows.has(user.id);
                      const isSelected = selectedUsers.has(user.id);
                      return (
                        <React.Fragment key={user.id}>
                          <TableRow className="border-border hover:bg-muted/50">
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  toggleUserSelection(user.id)
                                }
                                className="border-border"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate">
                                    {user.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {user.cpf}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {user.documentFront && (
                                  <div className="w-8 h-8 bg-muted rounded border border-border flex items-center justify-center">
                                    <FileText className="w-3 h-3 text-green-400" />
                                  </div>
                                )}
                                {user.documentBack && (
                                  <div className="w-8 h-8 bg-muted rounded border border-border flex items-center justify-center">
                                    <FileText className="w-3 h-3 text-green-400" />
                                  </div>
                                )}
                                {user.documentSelfie && (
                                  <div className="w-8 h-8 bg-muted rounded border border-border flex items-center justify-center">
                                    <User className="w-3 h-3 text-primary" />
                                  </div>
                                )}
                                {!hasDocuments(user) && (
                                  <span className="text-xs text-muted-foreground">
                                    N/A
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(user.kycStatus)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {formatDate(user.kycSubmittedAt)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {formatDate(user.kycReviewedAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {user.kycStatus === "PENDING" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleApprove(user.id)}
                                      disabled={actionLoading === user.id}
                                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-7 px-2"
                                      title="Aprovar"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() =>
                                        setShowRejectDialog(user.id)
                                      }
                                      disabled={actionLoading === user.id}
                                      className="h-7 px-2"
                                      title="Rejeitar"
                                    >
                                      <XCircle className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                                {(user.kycStatus === "APPROVED" ||
                                  user.kycStatus === "REJECTED") && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleResetToPending(user.id)
                                      }
                                      disabled={actionLoading === user.id}
                                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-7 px-2"
                                      title="Resetar"
                                    >
                                      <Clock className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleApprove(user.id)}
                                      disabled={actionLoading === user.id}
                                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-7 px-2"
                                      title="Reaprovar"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    toggleRowExpansion(user.id);
                                  }}
                                  className="border-border text-foreground hover:bg-muted h-7 px-2"
                                  title="Ver Detalhes"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="border-border bg-muted/30">
                              <TableCell colSpan={8} className="p-3">
                                <div className="flex items-center justify-between">
                                  {/* Rejection Reason or Additional Info */}
                                  <div className="flex-1">
                                    {user.kycStatus === "REJECTED" &&
                                    user.kycRejectionReason ? (
                                      <div className="p-2 bg-red-900/20 border border-red-500/30 rounded">
                                        <p className="text-xs font-medium text-red-400 mb-1">
                                          Motivo da Rejeição:
                                        </p>
                                        <p className="text-xs text-red-300 line-clamp-2">
                                          {user.kycRejectionReason}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground">
                                        <p>
                                          Tipo: {user.documentType || "N/A"} |
                                          Número: {user.documentNumber || "N/A"}
                                        </p>
                                        {user.kycSubmittedAt && (
                                          <p className="mt-1">
                                            Enviado em:{" "}
                                            {formatDate(user.kycSubmittedAt)}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Full Review Button */}
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedUser(user)}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground ml-4"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver Documentos Completos
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedUsers.map((user) => (
              <Card
                key={user.id}
                className="hover:shadow-md transition-shadow bg-card border-border"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground truncate">
                          {user.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                      className="border-border"
                    />
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">CPF:</span>
                      <span className="text-muted-foreground">{user.cpf}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(user.kycStatus)}
                    </div>
                    {user.kycStatus === "REJECTED" &&
                      user.kycRejectionReason && (
                        <div className="p-2 bg-red-900/20 border border-red-500/30 rounded text-xs">
                          <p className="text-red-400 font-medium mb-1">
                            Motivo:
                          </p>
                          <p className="text-red-300 line-clamp-2">
                            {user.kycRejectionReason}
                          </p>
                        </div>
                      )}
                  </div>

                  {/* Document Thumbnails */}
                  <div className="flex gap-2 mb-3">
                    {user.documentFront && (
                      <div className="flex-1">
                        <KYCImage
                          src={getKycImageSrc(user.documentFront)}
                          alt="Frente"
                          className="w-full h-20"
                          onClick={() =>
                            handleImageClick(
                              getKycImageSrc(user.documentFront),
                              "Frente",
                              "Frente do Documento"
                            )
                          }
                        />
                      </div>
                    )}
                    {user.documentBack && (
                      <div className="flex-1">
                        <KYCImage
                          src={getKycImageSrc(user.documentBack)}
                          alt="Verso"
                          className="w-full h-20"
                          onClick={() =>
                            handleImageClick(
                              getKycImageSrc(user.documentBack),
                              "Verso",
                              "Verso do Documento"
                            )
                          }
                        />
                      </div>
                    )}
                    {user.documentSelfie && (
                      <div className="flex-1">
                        <KYCImage
                          src={getKycImageSrc(user.documentSelfie)}
                          alt="Selfie"
                          className="w-full h-20"
                          onClick={() =>
                            handleImageClick(
                              getKycImageSrc(user.documentSelfie),
                              "Selfie",
                              "Selfie com Documento"
                            )
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {user.kycStatus === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(user.id)}
                          disabled={actionLoading === user.id}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setShowRejectDialog(user.id)}
                          disabled={actionLoading === user.id}
                          className="flex-1 text-xs"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Rejeitar
                        </Button>
                      </>
                    )}
                    {(user.kycStatus === "APPROVED" ||
                      user.kycStatus === "REJECTED") && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleResetToPending(user.id)}
                          disabled={actionLoading === user.id}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 text-xs"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Resetar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(user.id)}
                          disabled={actionLoading === user.id}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Reaprovar
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedUser(user)}
                      className="border-border text-foreground hover:bg-muted flex-1 text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {filteredUsers.length > itemsPerPage && (
          <div className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} a{" "}
              {Math.min(endIndex, filteredUsers.length)} de{" "}
              {filteredUsers.length} usuários
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="border-border text-foreground hover:bg-muted disabled:opacity-50"
              >
                Primeiro
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="border-border text-foreground hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-foreground px-3">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="border-border text-foreground hover:bg-muted disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="border-border text-foreground hover:bg-muted disabled:opacity-50"
              >
                Último
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Full Review Dialog */}
      {selectedUser && (
        <Dialog
          open={!!selectedUser}
          onOpenChange={() => setSelectedUser(null)}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Revisão de Documentos KYC - {selectedUser.name}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Revise todos os documentos e informações do usuário
              </DialogDescription>
            </DialogHeader>

            {/* Sticky action bar: Approve / Reject individual KYC */}
            {selectedUser.kycStatus === "PENDING" && (
              <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/80 px-4 py-3 backdrop-blur-sm">
                <span className="text-sm font-medium text-foreground mr-2">
                  Decisão:
                </span>
                <Button
                  onClick={() => handleApprove(selectedUser.id)}
                  disabled={actionLoading === selectedUser.id}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(selectedUser.id)}
                  disabled={actionLoading === selectedUser.id}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
                {actionLoading === selectedUser.id && (
                  <span className="text-sm text-muted-foreground">
                    Processando...
                  </span>
                )}
              </div>
            )}

            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Nome
                  </label>
                  <p className="text-sm text-foreground">{selectedUser.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="text-sm text-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    CPF
                  </label>
                  <p className="text-sm text-foreground">{selectedUser.cpf}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Tipo de Documento
                  </label>
                  <p className="text-sm text-foreground">
                    {selectedUser.documentType || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Número do Documento
                  </label>
                  <p className="text-sm text-foreground">
                    {selectedUser.documentNumber || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(selectedUser.kycStatus)}
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                    Frente do Documento
                    <ZoomIn className="w-4 h-4 text-muted-foreground" />
                  </h4>
                  <KYCImage
                    src={getKycImageSrc(selectedUser.documentFront)}
                    alt="Frente do Documento"
                    className="w-full h-48"
                    onClick={
                      selectedUser.documentFront
                        ? () =>
                            handleImageClick(
                              getKycImageSrc(selectedUser.documentFront),
                              "Frente do Documento",
                              "Frente do Documento"
                            )
                        : undefined
                    }
                  />
                  {selectedUser.kycStatus === "PENDING" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => {
                        setRejectionReason("Problema com: Frente do Documento. ");
                        setShowRejectDialog(selectedUser.id);
                      }}
                      disabled={actionLoading === selectedUser.id}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Rejeitar
                    </Button>
                  )}
                </div>
                <div className="flex flex-col">
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                    Verso do Documento
                    <ZoomIn className="w-4 h-4 text-muted-foreground" />
                  </h4>
                  <KYCImage
                    src={getKycImageSrc(selectedUser.documentBack)}
                    alt="Verso do Documento"
                    className="w-full h-48"
                    onClick={
                      selectedUser.documentBack
                        ? () =>
                            handleImageClick(
                              getKycImageSrc(selectedUser.documentBack),
                              "Verso do Documento",
                              "Verso do Documento"
                            )
                        : undefined
                    }
                  />
                  {selectedUser.kycStatus === "PENDING" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => {
                        setRejectionReason("Problema com: Verso do Documento. ");
                        setShowRejectDialog(selectedUser.id);
                      }}
                      disabled={actionLoading === selectedUser.id}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Rejeitar
                    </Button>
                  )}
                </div>
                <div className="flex flex-col">
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                    Selfie com Documento
                    <ZoomIn className="w-4 h-4 text-muted-foreground" />
                  </h4>
                  <KYCImage
                    src={getKycImageSrc(selectedUser.documentSelfie)}
                    alt="Selfie com Documento"
                    className="w-full h-48"
                    onClick={
                      selectedUser.documentSelfie
                        ? () =>
                            handleImageClick(
                              getKycImageSrc(selectedUser.documentSelfie),
                              "Selfie com Documento",
                              "Selfie com Documento"
                            )
                        : undefined
                    }
                  />
                  {selectedUser.kycStatus === "PENDING" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => {
                        setRejectionReason("Problema com: Selfie com Documento. ");
                        setShowRejectDialog(selectedUser.id);
                      }}
                      disabled={actionLoading === selectedUser.id}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Rejeitar
                    </Button>
                  )}
                </div>
              </div>

              {/* Image Analysis */}
              {selectedUser.documentFront &&
                selectedUser.documentBack &&
                selectedUser.documentSelfie && (
                  <div className="mt-6">
                    <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Análise de Detecção de Fraude
                    </h4>
                    <ImageAnalysisPanel
                      documentFront={selectedUser.documentFront || ""}
                      documentBack={selectedUser.documentBack || ""}
                      selfie={selectedUser.documentSelfie || ""}
                      onAnalysisComplete={(result) => {
                        console.log("Analysis complete:", result);
                      }}
                    />
                  </div>
                )}

              {/* Actions */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
                {selectedUser.kycStatus === "PENDING" && (
                  <>
                    <Button
                      onClick={() => handleApprove(selectedUser.id)}
                      disabled={actionLoading === selectedUser.id}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectDialog(selectedUser.id)}
                      disabled={actionLoading === selectedUser.id}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                  </>
                )}

                {(selectedUser.kycStatus === "APPROVED" ||
                  selectedUser.kycStatus === "REJECTED") && (
                  <>
                    <Button
                      onClick={() => {
                        setShowResetDialog(selectedUser.id);
                        setResetReason("");
                        setDocumentsToUpdate({ front: true, back: true, selfie: true });
                      }}
                      disabled={actionLoading === selectedUser.id}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Redefinir para Pendente
                    </Button>
                    <Dialog
                      open={showResetDialog === selectedUser.id}
                      onOpenChange={(open) => !open && setShowResetDialog(null)}
                    >
                      <DialogContent className="bg-card border-border">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">
                            Redefinir KYC para Pendente
                          </DialogTitle>
                          <DialogDescription className="text-muted-foreground">
                            O usuário será notificado para reenviar os documentos. Opcionalmente informe o motivo e marque quais imagens devem ser atualizadas.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">
                              Motivo (opcional)
                            </Label>
                            <Textarea
                              value={resetReason}
                              onChange={(e) => setResetReason(e.target.value)}
                              placeholder="Ex.: imagem da frente ilegível..."
                              className="w-full mt-1 p-3 border border-border rounded-md focus:ring-2 focus:ring-primary bg-muted text-foreground placeholder:text-muted-foreground"
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground block mb-2">
                              Documentos a atualizar
                            </Label>
                            <div className="flex flex-col gap-2">
                              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                <Checkbox
                                  checked={documentsToUpdate.front}
                                  onCheckedChange={(c) =>
                                    setDocumentsToUpdate((p) => ({ ...p, front: !!c }))
                                  }
                                  className="border-border data-[state=checked]:bg-primary"
                                />
                                Frente do Documento
                              </label>
                              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                <Checkbox
                                  checked={documentsToUpdate.back}
                                  onCheckedChange={(c) =>
                                    setDocumentsToUpdate((p) => ({ ...p, back: !!c }))
                                  }
                                  className="border-border data-[state=checked]:bg-primary"
                                />
                                Verso do Documento
                              </label>
                              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                <Checkbox
                                  checked={documentsToUpdate.selfie}
                                  onCheckedChange={(c) =>
                                    setDocumentsToUpdate((p) => ({ ...p, selfie: !!c }))
                                  }
                                  className="border-border data-[state=checked]:bg-primary"
                                />
                                Selfie com Documento
                              </label>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setShowResetDialog(null)}
                              className="border-border text-foreground hover:bg-muted"
                            >
                              Cancelar
                            </Button>
                            <Button
                              onClick={() => handleResetToPending(selectedUser.id)}
                              disabled={actionLoading === selectedUser.id}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              Redefinir para Pendente
                            </Button>
                          </DialogFooter>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      onClick={() => handleApprove(selectedUser.id)}
                      disabled={actionLoading === selectedUser.id}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Reaprovar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectDialog(selectedUser.id)}
                      disabled={actionLoading === selectedUser.id}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                  </>
                )}
              </div>

              {selectedUser.kycStatus === "REJECTED" &&
                selectedUser.kycRejectionReason && (
                  <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <h4 className="font-medium text-red-400 mb-2">
                      Motivo da Rejeição
                    </h4>
                    <p className="text-sm text-red-300">
                      {selectedUser.kycRejectionReason}
                    </p>
                  </div>
                )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <Dialog
          open={!!showRejectDialog}
          onOpenChange={() => setShowRejectDialog(null)}
        >
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Rejeitar Verificação KYC
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Forneça um motivo para a rejeição. O usuário receberá este
                motivo por email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Motivo da Rejeição <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Por favor, forneça um motivo detalhado para a rejeição..."
                  className="w-full mt-1 p-3 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-muted text-foreground placeholder:text-muted-foreground"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(null);
                  setRejectionReason("");
                }}
                className="border-border text-foreground hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReject(showRejectDialog)}
                disabled={
                  actionLoading === showRejectDialog || !rejectionReason.trim()
                }
              >
                Rejeitar KYC
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Full-size Image Modal with zoom */}
      {selectedImage && (
        <KycImageZoomModal
          open={!!selectedImage}
          onOpenChange={(open) => !open && setSelectedImage(null)}
          src={selectedImage.src}
          alt={selectedImage.alt}
          title={selectedImage.title}
        />
      )}
    </div>
  );
};

export default AdminKYCPage;
