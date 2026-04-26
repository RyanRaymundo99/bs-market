"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Bell, Clock, FileText, Users, ChevronRight, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: "new_user" | "kyc_pending" | "approval_needed";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  userId?: string;
}

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  className = "",
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/notifications?showAll=true");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId?: string) => {
    try {
      const url = notificationId
        ? `/api/admin/notifications/${notificationId}/read`
        : "/api/admin/notifications/read-all";
      const response = await fetch(url, {
        method: "PATCH",
      });

      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/admin/notifications/read-all", {
        method: "PATCH",
      });

      if (response.ok) {
        toast({
          title: "Notificações marcadas como lidas",
          description: "Todas as notificações foram marcadas como lidas",
        });
        await fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Group notifications by type
  const groupedNotifications = useMemo(() => {
    const unread = notifications.filter((n) => !n.read);
    const read = notifications.filter((n) => n.read);

    const groupByType = (notifs: Notification[]) => {
      const groups: Record<string, Notification[]> = {};
      notifs.forEach((notif) => {
        if (!groups[notif.type]) {
          groups[notif.type] = [];
        }
        groups[notif.type].push(notif);
      });
      return groups;
    };

    return {
      unread: groupByType(unread),
      read: groupByType(read),
    };
  }, [notifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_user":
        return <Users className="w-3.5 h-3.5 text-blue-400" />;
      case "kyc_pending":
        return <FileText className="w-3.5 h-3.5 text-orange-400" />;
      case "approval_needed":
        return <Clock className="w-3.5 h-3.5 text-yellow-400" />;
      case "new_deposit":
        return <ArrowDownToLine className="w-3.5 h-3.5 text-green-400" />;
      case "new_withdrawal":
        return <ArrowUpFromLine className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const getNotificationLabel = (type: string) => {
    switch (type) {
      case "new_user":
        return "Novos Usuários";
      case "kyc_pending":
        return "KYC Pendente";
      case "approval_needed":
        return "Aprovações Pendentes";
      case "new_deposit":
        return "Novos Depósitos";
      case "new_withdrawal":
        return "Solicitações de Saque";
      default:
        return "Outros";
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    switch (notification.type) {
      case "new_user":
      case "approval_needed":
        router.push("/admin/users");
        break;
      case "kyc_pending":
        router.push("/admin/kyc");
        break;
      case "new_deposit":
      case "new_withdrawal":
        router.push("/admin/transactions");
        break;
    }
    setIsOpen(false);
  };

  const handleGroupClick = (type: string) => {
    const firstUnread = notifications.find((n) => !n.read && n.type === type);
    if (firstUnread) {
      handleNotificationClick(firstUnread);
    } else {
      const firstRead = notifications.find((n) => n.read && n.type === type);
      if (firstRead) {
        handleNotificationClick(firstRead);
      }
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - notificationTime.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Agora";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderNotificationGroup = (
    type: string,
    notifs: Notification[],
    isUnread: boolean,
  ) => {
    if (notifs.length === 0) return null;

    const latest = notifs[0];
    const count = notifs.length;

    return (
      <div
        key={type}
        className={`p-2.5 border-l-2 cursor-pointer transition-colors ${
          isUnread
            ? "bg-blue-900/10 border-l-blue-500 hover:bg-blue-900/20"
            : "border-l-gray-600 hover:bg-gray-800/50"
        }`}
        onClick={() => handleGroupClick(type)}
      >
        <div className="flex items-start gap-2.5">
          <div className="flex-shrink-0 mt-0.5">
            {getNotificationIcon(type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-xs font-semibold text-white">
                {getNotificationLabel(type)}
              </span>
              {count > 1 && (
                <Badge
                  variant="secondary"
                  className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-xs h-4 px-1.5"
                >
                  {count}
                </Badge>
              )}
              {isUnread && (
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-400 line-clamp-1">
              {count === 1
                ? latest.message
                : `${count} ${count === 1 ? "notificação" : "notificações"}`}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">
                {formatTimeAgo(latest.timestamp)}
              </span>
              {count > 1 && (
                <span className="text-xs text-gray-600">
                  • Mais recente: {latest.message.split(" ")[0]}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
        </div>
      </div>
    );
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`relative ${className}`}>
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[380px] max-h-[600px] overflow-hidden bg-gray-900 border-gray-800 p-0"
        sideOffset={5}
      >
        {/* Header */}
        <div className="p-3 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
          <h3 className="font-semibold text-sm text-white">Notificações</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge className="bg-blue-600 text-white text-xs">
                {unreadCount} nova{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  markAllAsRead();
                }}
                className="text-xs h-6 px-2 text-gray-400 hover:text-white"
              >
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[520px] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-xs text-gray-400">Carregando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-gray-400">Nenhuma notificação</p>
            </div>
          ) : (
            <>
              {/* Unread Notifications - Grouped */}
              {Object.keys(groupedNotifications.unread).length > 0 && (
                <div className="border-b border-gray-800">
                  {Object.entries(groupedNotifications.unread).map(
                    ([type, notifs]) =>
                      renderNotificationGroup(type, notifs, true),
                  )}
                </div>
              )}

              {/* Read Notifications - Grouped */}
              {Object.keys(groupedNotifications.read).length > 0 && (
                <div>
                  {Object.entries(groupedNotifications.read).map(
                    ([type, notifs]) =>
                      renderNotificationGroup(type, notifs, false),
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t border-gray-800 bg-gray-900/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                router.push("/admin/notification-center");
                setIsOpen(false);
              }}
              className="w-full text-xs h-7 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
