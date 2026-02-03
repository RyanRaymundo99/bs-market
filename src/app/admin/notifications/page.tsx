"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import BackToDashboardButton from "@/components/admin/BackToDashboardButton";
import {
  Bell,
  Users,
  FileText,
  Clock,
  CheckCircle,
  RefreshCw,
  Eye,
  Mail,
  Save,
  Plus,
  X,
} from "lucide-react";

interface Notification {
  id: string;
  type: "new_user" | "kyc_pending" | "approval_needed";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  userId?: string;
}

interface AlertSettings {
  emails: string[];
  notifyDepositOver500: boolean;
  notifyWithdrawOver500: boolean;
  notifyNewAccount: boolean;
  notifyKycReady: boolean;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    emails: ["rian981265@gmail.com"],
    notifyDepositOver500: true,
    notifyWithdrawOver500: true,
    notifyNewAccount: true,
    notifyKycReady: true,
  });
  const [loadingAlertSettings, setLoadingAlertSettings] = useState(true);
  const [savingAlertSettings, setSavingAlertSettings] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    fetchAlertSettings();
  }, []);

  const fetchAlertSettings = async () => {
    try {
      setLoadingAlertSettings(true);
      const response = await fetch("/api/admin/notifications/alert-settings");
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          const emails = Array.isArray(data.settings.emails) && data.settings.emails.length > 0
            ? data.settings.emails
            : ["rian981265@gmail.com"];
          setAlertSettings({
            emails,
            notifyDepositOver500: data.settings.notifyDepositOver500 ?? true,
            notifyWithdrawOver500: data.settings.notifyWithdrawOver500 ?? true,
            notifyNewAccount: data.settings.notifyNewAccount ?? true,
            notifyKycReady: data.settings.notifyKycReady ?? true,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching alert settings:", error);
    } finally {
      setLoadingAlertSettings(false);
    }
  };

  const saveAlertSettings = async () => {
    try {
      setSavingAlertSettings(true);
      const emailsToSave = alertSettings.emails.map((e) => e.trim()).filter(Boolean);
      const response = await fetch("/api/admin/notifications/alert-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...alertSettings,
          emails: emailsToSave.length > 0 ? emailsToSave : ["rian981265@gmail.com"],
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Saved",
          description: "Email alert settings saved successfully",
        });
      } else {
        throw new Error(data.error ?? "Failed to save");
      }
    } catch (error) {
      console.error("Error saving alert settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save alert settings",
      });
    } finally {
      setSavingAlertSettings(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load notifications",
        });
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load notifications",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      const response = await fetch("/api/admin/notifications/read-all", {
        method: "PATCH",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "All notifications marked as read",
        });
        fetchNotifications(); // Refresh the list
      } else {
        throw new Error("Failed to mark all notifications as read");
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark all notifications as read",
      });
    } finally {
      setMarkingAllRead(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/admin/notifications/${notificationId}/read`,
        {
          method: "PATCH",
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    // Navigate based on notification type
    switch (notification.type) {
      case "new_user":
      case "approval_needed":
        router.push("/admin/users");
        break;
      case "kyc_pending":
        router.push("/admin/kyc");
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_user":
        return <Users className="w-5 h-5 text-blue-500" />;
      case "kyc_pending":
        return <FileText className="w-5 h-5 text-orange-500" />;
      case "approval_needed":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - notificationTime.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6 text-white">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <BackToDashboardButton />
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Bell className="w-8 h-8" />
                Notifications
              </h1>
              <p className="text-gray-400">
                {notifications.length} total notifications, {unreadCount} unread
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={fetchNotifications}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                disabled={markingAllRead}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {markingAllRead ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark All Read
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Email alerts – notify admin on high-value and key events */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email alerts
            </CardTitle>
            <p className="text-gray-400 text-sm">
              Receive an email at the addresses below when these events happen.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingAlertSettings ? (
              <p className="text-gray-400">Loading settings...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-300">
                    Email addresses to notify
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
                          placeholder="email@example.com"
                          className="bg-gray-800 border-gray-700 text-white flex-1 max-w-md"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-red-400 shrink-0"
                          onClick={() => {
                            const next = alertSettings.emails.filter((_, j) => j !== i);
                            setAlertSettings((s) => ({
                              ...s,
                              emails: next.length > 0 ? next : [""],
                            }));
                          }}
                          title="Remove"
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
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    onClick={() =>
                      setAlertSettings((s) => ({ ...s, emails: [...s.emails, ""] }))
                    }
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add email
                  </Button>
                </div>
                <div className="flex flex-col gap-3">
                  <Label className="text-gray-300">Notify when:</Label>
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
                      className="border-gray-600 data-[state=checked]:bg-blue-600"
                    />
                    <label
                      htmlFor="deposit-over-500"
                      className="text-gray-300 cursor-pointer"
                    >
                      Deposit attempt over 500 USDT
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
                      className="border-gray-600 data-[state=checked]:bg-blue-600"
                    />
                    <label
                      htmlFor="withdraw-over-500"
                      className="text-gray-300 cursor-pointer"
                    >
                      Withdrawal attempt over 500 USDT
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
                      className="border-gray-600 data-[state=checked]:bg-blue-600"
                    />
                    <label
                      htmlFor="new-account"
                      className="text-gray-300 cursor-pointer"
                    >
                      New account created (ready for approval)
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
                      className="border-gray-600 data-[state=checked]:bg-blue-600"
                    />
                    <label
                      htmlFor="kyc-ready"
                      className="text-gray-300 cursor-pointer"
                    >
                      KYC submitted (ready for validation)
                    </label>
                  </div>
                </div>
                <Button
                  onClick={saveAlertSettings}
                  disabled={savingAlertSettings}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {savingAlertSettings ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save alert settings
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8 text-center">
                <Bell className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Notifications</h3>
                <p className="text-gray-400">
                  You&apos;re all caught up! No new notifications at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer ${
                  !notification.read ? "bg-blue-900/20 border-blue-500/30" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {notification.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <Badge className="bg-blue-600 text-white">
                              <Eye className="w-3 h-3 mr-1" />
                              New
                            </Badge>
                          )}
                          <span className="text-sm text-gray-400">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-300 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className="capitalize">
                          {notification.type.replace("_", " ")}
                        </span>
                        {notification.userId && (
                          <span>User ID: {notification.userId}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {notifications.length > 0 && (
          <Card className="bg-gray-800 border-gray-700 mt-6">
            <CardHeader>
              <CardTitle className="text-white">Notification Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {notifications.filter((n) => n.type === "new_user").length}
                  </div>
                  <div className="text-sm text-gray-400">New Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {
                      notifications.filter((n) => n.type === "kyc_pending")
                        .length
                    }
                  </div>
                  <div className="text-sm text-gray-400">KYC Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {
                      notifications.filter((n) => n.type === "approval_needed")
                        .length
                    }
                  </div>
                  <div className="text-sm text-gray-400">Approval Needed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
