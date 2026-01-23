"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Search,
  Send,
  Bell,
  User,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BackToDashboardButton from "@/components/admin/BackToDashboardButton";

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
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/notification-center/users?search=${encodeURIComponent(
          searchTerm
        )}&limit=100`
      );
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load users",
        });
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load users",
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, toast]);

  const fetchUserNotifications = useCallback(
    async (userId: string) => {
      try {
        const response = await fetch(
          `/api/admin/notification-center/users/${userId}/notifications?limit=50`
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
    },
    []
  );

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
        title: "Error",
        description: "Subject and message are required",
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
          title: "Success",
          description: sendEmail
            ? "Notification sent and email delivered successfully"
            : "Notification created successfully",
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
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send notification",
      });
    } finally {
      setSending(false);
    }
  };

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
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Agora";
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return `${Math.floor(diffInMinutes / 1440)}d atrás`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: string }> = {
      APPROVED: { label: "Aprovado", variant: "default" },
      PENDING: { label: "Pendente", variant: "secondary" },
      REJECTED: { label: "Rejeitado", variant: "destructive" },
    };
    const statusInfo = statusMap[status] || {
      label: status,
      variant: "secondary",
    };
    return (
      <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>
    );
  };

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <BackToDashboardButton />
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Mail className="w-8 h-8" />
                Centro de Notificações
              </h1>
              <p className="text-gray-400">
                Envie notificações e emails para usuários
              </p>
            </div>
          </div>
          <Button
            onClick={fetchUsers}
            variant="outline"
            className="border-gray-600 text-white hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Search */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar por nome, email ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p>Carregando usuários...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8 text-center">
              <User className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum usuário encontrado</h3>
              <p className="text-gray-400">
                {searchTerm
                  ? "Tente uma busca diferente"
                  : "Não há usuários cadastrados"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {users.map((user) => {
              const isExpanded = expandedUsers.has(user.id);
              const notifications = userNotifications[user.id] || [];
              const hasUnread = user.unreadNotificationCount > 0;

              return (
                <Card
                  key={user.id}
                  className={`bg-gray-900 border-gray-800 ${
                    hasUnread ? "border-blue-500/30 bg-blue-900/10" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleUserExpanded(user.id)}
                            className="p-1 h-auto text-white hover:bg-gray-800"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </Button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold text-white">
                                {user.name}
                              </h3>
                              {getStatusBadge(user.approvalStatus)}
                              {getStatusBadge(user.kycStatus)}
                            </div>
                            <div className="text-sm text-gray-400 space-y-1">
                              <p>{user.email}</p>
                              {user.cpf && <p>CPF: {user.cpf}</p>}
                              {user.phone && <p>Telefone: {user.phone}</p>}
                            </div>
                          </div>
                        </div>

                        {/* Notification Summary */}
                        <div className="flex items-center gap-4 mt-3 ml-8">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">
                              {user.notificationCount} notificações
                            </span>
                            {hasUnread && (
                              <Badge className="bg-blue-600 text-white">
                                {user.unreadNotificationCount} não lidas
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setSendDialogOpen(true);
                            }}
                            className="bg-[#12E0A1] hover:bg-[#0FB88A] text-black"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Enviar Notificação
                          </Button>
                        </div>

                        {/* Notifications List */}
                        {isExpanded && (
                          <div className="mt-4 ml-8 space-y-3 border-t border-gray-800 pt-4">
                            {notifications.length === 0 ? (
                              <p className="text-gray-400 text-sm">
                                Nenhuma notificação encontrada
                              </p>
                            ) : (
                              notifications.map((notification) => (
                                <div
                                  key={notification.id}
                                  className={`p-3 rounded-lg border ${
                                    notification.read
                                      ? "bg-gray-800/50 border-gray-700"
                                      : "bg-blue-900/20 border-blue-500/30"
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-white">
                                          {notification.title}
                                        </h4>
                                        {!notification.read && (
                                          <Badge className="bg-blue-600 text-white text-xs">
                                            Nova
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-300 mb-2">
                                        {notification.message}
                                      </p>
                                      <div className="flex items-center gap-4 text-xs text-gray-400">
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {formatTimeAgo(notification.createdAt)}
                                        </span>
                                        <span>
                                          {formatDate(notification.createdAt)}
                                        </span>
                                        {notification.metadata?.emailSent && (
                                          <span className="flex items-center gap-1 text-green-400">
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
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Send Notification Dialog */}
        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Enviar Notificação
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedUser && (
                  <>
                    Enviar notificação para{" "}
                    <span className="font-semibold text-white">
                      {selectedUser.name}
                    </span>{" "}
                    ({selectedUser.email})
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="subject" className="text-white">
                  Assunto *
                </Label>
                <Input
                  id="subject"
                  value={notificationSubject}
                  onChange={(e) => setNotificationSubject(e.target.value)}
                  placeholder="Digite o assunto da notificação"
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-white">
                  Mensagem *
                </Label>
                <Textarea
                  id="message"
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Digite a mensagem da notificação"
                  rows={6}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="send-email"
                      checked={sendEmail}
                      onCheckedChange={setSendEmail}
                    />
                    <Label htmlFor="send-email" className="text-white cursor-pointer">
                      Enviar também por email
                    </Label>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 ml-6">
                    A notificação será salva e um email será enviado para o
                    usuário
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSendDialogOpen(false);
                    setNotificationSubject("");
                    setNotificationMessage("");
                    setSelectedUser(null);
                  }}
                  className="border-gray-600 text-white hover:bg-gray-800"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSendNotification}
                  disabled={sending || !notificationSubject.trim() || !notificationMessage.trim()}
                  className="bg-[#12E0A1] hover:bg-[#0FB88A] text-black"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
