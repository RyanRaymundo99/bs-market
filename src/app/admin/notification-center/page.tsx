"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Search,
  Send,
  Bell,
  User,
  ChevronDown,
  ChevronRight,
  Clock,
  RefreshCw,
  Grid3x3,
  List,
  Save,
  Plus,
  X,
  Filter,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  approvalStatus: string;
  kycStatus: string;
  createdAt: string;
  notificationCount: number;
  unreadNotificationCount: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  readAt: string | null;
  metadata?: Record<string, unknown> | null;
}

export default function NotificationCenterPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [unreadFilter, setUnreadFilter] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userNotifications, setUserNotifications] = useState<
    Record<string, Notification[]>
  >({});
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [notificationSubject, setNotificationSubject] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [alertSettings, setAlertSettings] = useState<{
    emails: string[];
    notifyDepositOver500: boolean;
    notifyWithdrawOver500: boolean;
    notifyNewAccount: boolean;
    notifyKycReady: boolean;
  }>({
    emails: ["rian981265@gmail.com"],
    notifyDepositOver500: true,
    notifyWithdrawOver500: true,
    notifyNewAccount: true,
    notifyKycReady: true,
  });
  const [loadingAlertSettings, setLoadingAlertSettings] = useState(true);
  const [savingAlertSettings, setSavingAlertSettings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  useEffect(() => {
    const fetchAlertSettings = async () => {
      try {
        setLoadingAlertSettings(true);
        const response = await fetch("/api/admin/notifications/alert-settings");
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            const emails =
              Array.isArray(data.settings.emails) &&
              data.settings.emails.length > 0
                ? data.settings.emails
                : ["rian981265@gmail.com"];
            setAlertSettings({
              emails,
              notifyDepositOver500: data.settings.notifyDepositOver500 ?? true,
              notifyWithdrawOver500:
                data.settings.notifyWithdrawOver500 ?? true,
              notifyNewAccount: data.settings.notifyNewAccount ?? true,
              notifyKycReady: data.settings.notifyKycReady ?? true,
            });
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingAlertSettings(false);
      }
    };
    fetchAlertSettings();
  }, []);

  const saveAlertSettings = async () => {
    try {
      setSavingAlertSettings(true);
      const emailsToSave = alertSettings.emails
        .map((e) => e.trim())
        .filter(Boolean);
      const response = await fetch("/api/admin/notifications/alert-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...alertSettings,
          emails:
            emailsToSave.length > 0 ? emailsToSave : ["rian981265@gmail.com"],
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Salvo",
          description: "Configurações de alertas por email salvas.",
        });
      } else {
        throw new Error(data.error ?? "Falha ao salvar");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Falha ao salvar alertas.",
      });
    } finally {
      setSavingAlertSettings(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/notification-center/users?search=${encodeURIComponent(
          searchTerm,
        )}&limit=100`,
      );
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
        description: "Falha ao carregar usuários",
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, toast]);

  const fetchUserNotifications = useCallback(async (userId: string) => {
    try {
      const response = await fetch(
        `/api/admin/notification-center/users/${userId}/notifications?limit=50`,
      );
      if (response.ok) {
        const data = await response.json();
        setUserNotifications((prev) => ({
          ...prev,
          [userId]: data.notifications || [],
        }));
      }
    } catch (error) {
      console.error("Error fetching user notifications:", error);
    }
  }, []);

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
        // Fetch notifications if not already loaded
        if (!userNotifications[userId]) {
          fetchUserNotifications(userId);
        }
      }
      return newSet;
    });
  };

  const handleSendNotification = async () => {
    if (!selectedUser) return;

    if (!notificationSubject.trim() || !notificationMessage.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Assunto e mensagem são obrigatórios",
      });
      return;
    }

    try {
      setSending(true);
      const response = await fetch("/api/admin/notification-center/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          subject: notificationSubject,
          message: notificationMessage,
          sendEmail: sendEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: sendEmail
            ? "Notificação enviada e email entregue com sucesso"
            : "Notificação criada com sucesso",
        });

        // Reset form
        setNotificationSubject("");
        setNotificationMessage("");
        setSendDialogOpen(false);
        setSelectedUser(null);

        // Refresh user notifications
        if (expandedUsers.has(selectedUser.id)) {
          fetchUserNotifications(selectedUser.id);
        }

        // Refresh users list to update counts
        fetchUsers();
      } else {
        throw new Error(data.error || "Failed to send notification");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Falha ao enviar notificação",
      });
    } finally {
      setSending(false);
    }
  };

  const handleBatchSend = async () => {
    if (selectedUsers.size === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione pelo menos um usuário",
      });
      return;
    }

    if (!notificationSubject.trim() || !notificationMessage.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Assunto e mensagem são obrigatórios",
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const userId of Array.from(selectedUsers)) {
      try {
        const response = await fetch("/api/admin/notification-center/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            subject: notificationSubject,
            message: notificationMessage,
            sendEmail: sendEmail,
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    toast({
      title: "Envio em lote concluído",
      description: `Enviados: ${successCount}${failCount > 0 ? ` | Falhas: ${failCount}` : ""}`,
    });

    setNotificationSubject("");
    setNotificationMessage("");
    setSelectedUsers(new Set());
    fetchUsers();
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Filter by unread status
    if (unreadFilter === "HAS_UNREAD") {
      filtered = filtered.filter((u) => u.unreadNotificationCount > 0);
    } else if (unreadFilter === "NO_UNREAD") {
      filtered = filtered.filter((u) => u.unreadNotificationCount === 0);
    }

    // Filter by approval status
    if (statusFilter !== "ALL") {
      if (statusFilter === "APPROVED") {
        filtered = filtered.filter(
          (u) => u.approvalStatus === "APPROVED" && u.kycStatus === "APPROVED",
        );
      } else {
        filtered = filtered.filter(
          (u) =>
            u.approvalStatus === statusFilter || u.kycStatus === statusFilter,
        );
      }
    }

    return filtered;
  }, [users, statusFilter, unreadFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const withUnread = users.filter(
      (u) => u.unreadNotificationCount > 0,
    ).length;
    const totalNotifications = users.reduce(
      (sum, u) => sum + u.notificationCount,
      0,
    );
    const totalUnread = users.reduce(
      (sum, u) => sum + u.unreadNotificationCount,
      0,
    );
    return { total, withUnread, totalNotifications, totalUnread };
  }, [users]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Agora";
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return `${Math.floor(diffInMinutes / 1440)}d atrás`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-primary text-primary-foreground text-xs">
            Aprovado
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-600 text-foreground text-xs">
            Pendente
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-600 text-foreground text-xs">
            Rejeitado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground text-xs">
            {status}
          </Badge>
        );
    }
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
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="max-w-[1920px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
              <Mail className="w-8 h-8" />
              Centro de Notificações
            </h1>
            <p className="text-muted-foreground">
              Envie notificações e emails para usuários
            </p>
          </div>
          <Button
            onClick={fetchUsers}
            variant="outline"
            className="border-border hover:bg-muted"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total Usuários
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.total}
                  </p>
                </div>
                <User className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Com Não Lidas</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {stats.withUnread}
                  </p>
                </div>
                <Bell className="w-8 h-8 text-yellow-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total Notificações
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.totalNotifications}
                  </p>
                </div>
                <Mail className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Não Lidas</p>
                  <p className="text-2xl font-bold text-red-400">
                    {stats.totalUnread}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email alerts – notify admin on high-value and key events */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Alertas por email
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Receba um email nos endereços abaixo quando esses eventos
              acontecerem.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingAlertSettings ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Emails para notificar
                  </Label>
                  <div className="space-y-2">
                    {alertSettings.emails.map((email, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const next = [...alertSettings.emails];
                            next[i] = e.target.value;
                            setAlertSettings((s) => ({ ...s, emails: next }));
                          }}
                          placeholder="email@exemplo.com"
                          className="bg-muted border-border text-foreground flex-1 max-w-md"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => {
                            const next = alertSettings.emails.filter(
                              (_, j) => j !== i,
                            );
                            setAlertSettings((s) => ({
                              ...s,
                              emails: next.length > 0 ? next : [""],
                            }));
                          }}
                          title="Remover"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-border text-muted-foreground hover:bg-muted"
                    onClick={() =>
                      setAlertSettings((s) => ({
                        ...s,
                        emails: [...s.emails, ""],
                      }))
                    }
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar email
                  </Button>
                </div>
                <div className="flex flex-col gap-3">
                  <Label className="text-muted-foreground">
                    Notificar quando:
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="deposit-over-500"
                      checked={alertSettings.notifyDepositOver500}
                      onCheckedChange={(checked) =>
                        setAlertSettings((s) => ({
                          ...s,
                          notifyDepositOver500: checked === true,
                        }))
                      }
                      className="border-border data-[state=checked]:bg-primary"
                    />
                    <label
                      htmlFor="deposit-over-500"
                      className="text-muted-foreground cursor-pointer"
                    >
                      Tentativa de depósito acima de 500 USDT
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="withdraw-over-500"
                      checked={alertSettings.notifyWithdrawOver500}
                      onCheckedChange={(checked) =>
                        setAlertSettings((s) => ({
                          ...s,
                          notifyWithdrawOver500: checked === true,
                        }))
                      }
                      className="border-border data-[state=checked]:bg-primary"
                    />
                    <label
                      htmlFor="withdraw-over-500"
                      className="text-muted-foreground cursor-pointer"
                    >
                      Tentativa de saque acima de 500 USDT
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="new-account"
                      checked={alertSettings.notifyNewAccount}
                      onCheckedChange={(checked) =>
                        setAlertSettings((s) => ({
                          ...s,
                          notifyNewAccount: checked === true,
                        }))
                      }
                      className="border-border data-[state=checked]:bg-primary"
                    />
                    <label
                      htmlFor="new-account"
                      className="text-muted-foreground cursor-pointer"
                    >
                      Nova conta criada (aguardando aprovação)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="kyc-ready"
                      checked={alertSettings.notifyKycReady}
                      onCheckedChange={(checked) =>
                        setAlertSettings((s) => ({
                          ...s,
                          notifyKycReady: checked === true,
                        }))
                      }
                      className="border-border data-[state=checked]:bg-primary"
                    />
                    <label
                      htmlFor="kyc-ready"
                      className="text-muted-foreground cursor-pointer"
                    >
                      KYC enviado (pronto para validação)
                    </label>
                  </div>
                </div>
                <Button
                  onClick={saveAlertSettings}
                  disabled={savingAlertSettings}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {savingAlertSettings ? (
                    <>Salvando...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar alertas
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Buscar por nome, email ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={unreadFilter} onValueChange={setUnreadFilter}>
                  <SelectTrigger className="w-[180px] bg-muted border-border text-foreground">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Não Lidas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas</SelectItem>
                    <SelectItem value="HAS_UNREAD">Com Não Lidas</SelectItem>
                    <SelectItem value="NO_UNREAD">Sem Não Lidas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-muted border-border text-foreground">
                    <Shield className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="APPROVED">Aprovado</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
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

            {/* Batch Actions */}
            {selectedUsers.size > 0 && (
              <div className="mt-4 p-3 bg-primary/20 border border-primary/30 rounded-lg flex items-center justify-between">
                <span className="text-sm text-primary">
                  {selectedUsers.size} usuário(s) selecionado(s)
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    setNotificationSubject("");
                    setNotificationMessage("");
                    setSendDialogOpen(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar para Selecionados
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users List/Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p>Carregando usuários...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Nenhum usuário encontrado
              </h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Tente uma busca diferente"
                  : "Não há usuários cadastrados"}
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
                            selectedUsers.size === filteredUsers.length &&
                            filteredUsers.length > 0
                          }
                          onCheckedChange={selectAllUsers}
                          className="border-border"
                        />
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Usuário
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Notificações
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Não Lidas
                      </TableHead>
                      <TableHead className="text-muted-foreground text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const isExpanded = expandedUsers.has(user.id);
                      const notifications = userNotifications[user.id] || [];
                      const hasUnread = user.unreadNotificationCount > 0;
                      const isSelected = selectedUsers.has(user.id);

                      return (
                        <React.Fragment key={user.id}>
                          <TableRow
                            className={`border-border hover:bg-muted/50 ${hasUnread ? "bg-primary/10" : ""}`}
                          >
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
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-foreground truncate">
                                    {user.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </p>
                                  {user.cpf && (
                                    <p className="text-xs text-muted-foreground">
                                      CPF: {user.cpf}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {getStatusBadge(user.approvalStatus)}
                                {getStatusBadge(user.kycStatus)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {user.notificationCount}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {hasUnread ? (
                                <Badge className="bg-primary text-primary-foreground">
                                  {user.unreadNotificationCount}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  0
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setSendDialogOpen(true);
                                  }}
                                  className="border-border text-foreground hover:bg-muted h-7 px-2"
                                  title="Enviar Notificação"
                                >
                                  <Send className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleUserExpanded(user.id)}
                                  className="border-border text-foreground hover:bg-muted h-7 px-2"
                                  title="Ver Notificações"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="border-border bg-muted/30">
                              <TableCell colSpan={6} className="p-4">
                                <div className="space-y-3">
                                  {notifications.length === 0 ? (
                                    <p className="text-muted-foreground text-sm text-center py-4">
                                      Nenhuma notificação encontrada
                                    </p>
                                  ) : (
                                    notifications.map((notification) => (
                                      <div
                                        key={notification.id}
                                        className={`p-3 rounded-lg border ${
                                          notification.read
                                            ? "bg-muted/50 border-border"
                                            : "bg-primary/20 border-primary/30"
                                        }`}
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <h4 className="font-semibold text-foreground truncate">
                                                {notification.title}
                                              </h4>
                                              {!notification.read && (
                                                <Badge className="bg-primary text-primary-foreground text-xs">
                                                  Nova
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                              {notification.message}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                              <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatTimeAgo(
                                                  notification.createdAt,
                                                )}
                                              </span>
                                              <span>
                                                {formatDate(
                                                  notification.createdAt,
                                                )}
                                              </span>
                                              {notification.metadata &&
                                                typeof notification.metadata ===
                                                  "object" &&
                                                "emailSent" in
                                                  notification.metadata &&
                                                Boolean(
                                                  notification.metadata
                                                    .emailSent,
                                                ) && (
                                                  <span className="flex items-center gap-1 text-primary">
                                                    <Mail className="w-3 h-3" />
                                                    Email enviado
                                                  </span>
                                                )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
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
            {filteredUsers.map((user) => {
              const notifications = userNotifications[user.id] || [];
              const hasUnread = user.unreadNotificationCount > 0;
              const isExpanded = expandedUsers.has(user.id);

              return (
                <Card
                  key={user.id}
                  className={`bg-card border-border ${
                    hasUnread ? "border-primary/30 bg-primary/10" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground truncate">
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
                      <div className="flex flex-wrap gap-1">
                        {getStatusBadge(user.approvalStatus)}
                        {getStatusBadge(user.kycStatus)}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Notificações:
                        </span>
                        <span className="text-foreground font-medium">
                          {user.notificationCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Não lidas:
                        </span>
                        {hasUnread ? (
                          <Badge className="bg-primary text-primary-foreground">
                            {user.unreadNotificationCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </div>
                    </div>

                    {/* Notifications Preview */}
                    {isExpanded && notifications.length > 0 && (
                      <div className="mb-3 space-y-2 max-h-48 overflow-y-auto">
                        {notifications.slice(0, 3).map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-2 rounded border text-xs ${
                              notification.read
                                ? "bg-muted/50 border-border"
                                : "bg-primary/20 border-primary/30"
                            }`}
                          >
                            <p className="font-medium text-foreground truncate">
                              {notification.title}
                            </p>
                            <p className="text-muted-foreground line-clamp-1">
                              {notification.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setSendDialogOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 text-xs"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Enviar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleUserExpanded(user.id)}
                        className="border-border text-foreground hover:bg-muted text-xs"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Send Notification Dialog */}
        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                {selectedUsers.size > 0
                  ? "Enviar Notificação em Lote"
                  : "Enviar Notificação"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedUsers.size > 0 ? (
                  <>
                    Enviar para {selectedUsers.size} usuário(s) selecionado(s)
                  </>
                ) : selectedUser ? (
                  <>
                    Enviar notificação para{" "}
                    <span className="font-semibold text-foreground">
                      {selectedUser.name}
                    </span>{" "}
                    ({selectedUser.email})
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="subject" className="text-foreground">
                  Assunto *
                </Label>
                <Input
                  id="subject"
                  value={notificationSubject}
                  onChange={(e) => setNotificationSubject(e.target.value)}
                  placeholder="Digite o assunto da notificação"
                  className="bg-muted border-border text-foreground mt-1"
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-foreground">
                  Mensagem *
                </Label>
                <Textarea
                  id="message"
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Digite a mensagem da notificação"
                  rows={6}
                  className="bg-muted border-border text-foreground mt-1"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="send-email"
                      checked={sendEmail}
                      onCheckedChange={(checked) =>
                        setSendEmail(checked === true)
                      }
                    />
                    <Label
                      htmlFor="send-email"
                      className="text-foreground cursor-pointer"
                    >
                      Enviar também por email
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 ml-6">
                    A notificação será salva e um email será enviado para o(s)
                    usuário(s)
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSendDialogOpen(false);
                    setNotificationSubject("");
                    setNotificationMessage("");
                    setSelectedUser(null);
                    setSelectedUsers(new Set());
                  }}
                  className="border-border text-foreground hover:bg-muted"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={
                    selectedUsers.size > 0
                      ? handleBatchSend
                      : handleSendNotification
                  }
                  disabled={
                    sending ||
                    !notificationSubject.trim() ||
                    !notificationMessage.trim()
                  }
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
