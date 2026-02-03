"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import BackToDashboardButton from "@/components/admin/BackToDashboardButton";
import { formatUSDT, formatBRL } from "@/lib/format-currency";
import { getKycImageSrc } from "@/lib/kyc-image-src";
import {
  User,
  Mail,
  Phone,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  ZoomIn,
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  Edit,
  Save,
  X,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  LogIn,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { KycImageZoomModal } from "@/components/admin/KycImageZoomModal";

interface UserDetails {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  kycStatus: "PENDING" | "APPROVED" | "REJECTED";
  emailVerified: boolean;
  phoneVerified: boolean;
  documentFront: string | null;
  documentBack: string | null;
  documentSelfie: string | null;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  kycRejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserBalance {
  currency: string;
  amount: number;
  locked: number;
}

interface UserTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  externalId?: string;
}

export default function AdminUserDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [usdtToBrlRate, setUsdtToBrlRate] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", cpf: "" });
  const [saving, setSaving] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [balanceAdjustment, setBalanceAdjustment] = useState({
    amount: "",
    reason: "",
  });
  const [adjustingBalance, setAdjustingBalance] = useState(false);
  const [showBalanceConfirmDialog, setShowBalanceConfirmDialog] =
    useState(false);
  const [balanceConfirmStep, setBalanceConfirmStep] = useState(1);
  const [showEditConfirmDialog, setShowEditConfirmDialog] = useState(false);
  const [editConfirmStep, setEditConfirmStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [loggingInAsUser, setLoggingInAsUser] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const { id } = await params;
        setUserId(id);

        // Fetch all data in parallel (including exchange rate)
        const [
          userResponse,
          balanceResponse,
          transactionsResponse,
          rateResponse,
        ] = await Promise.all([
          fetch(`/api/admin/users/${id}`),
          fetch(`/api/admin/users/${id}?include=balance`),
          fetch(`/api/admin/users/${id}?include=transactions`),
          fetch("/api/crypto/usdt-rate"),
        ]);

        // Set exchange rate
        if (rateResponse.ok) {
          const rateData = await rateResponse.json();
          setUsdtToBrlRate(rateData.rate || null);
        }

        if (userResponse.ok) {
          const data = await userResponse.json();
          setUser(data.user);
          setEditForm({
            name: data.user?.name || "",
            phone: data.user?.phone || "",
            cpf: data.user?.cpf || "",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load user details",
          });
        }

        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          setBalances(balanceData.balances || []);
        }

        if (transactionsResponse.ok) {
          const txData = await transactionsResponse.json();
          setTransactions(txData.transactions || []);
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load user details",
        });
      } finally {
        setLoading(false);
        setTransactionsLoading(false);
      }
    };

    fetchAllData();
  }, [params, toast]);

  const handleSaveProfileClick = () => {
    setShowEditConfirmDialog(true);
    setEditConfirmStep(1);
  };

  const handleEditConfirm = () => {
    if (editConfirmStep === 1) {
      setEditConfirmStep(2);
    } else {
      setShowEditConfirmDialog(false);
      setEditConfirmStep(1);
      handleSaveProfile();
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/admin/users/${userId}/update-profile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsEditing(false);
        toast({
          title: "Success",
          description: "User profile updated successfully",
        });
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user profile",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustBalanceClick = () => {
    if (!userId || !balanceAdjustment.amount) return;
    setShowBalanceConfirmDialog(true);
    setBalanceConfirmStep(1);
  };

  const handleBalanceConfirm = () => {
    if (balanceConfirmStep === 1) {
      setBalanceConfirmStep(2);
    } else {
      setShowBalanceConfirmDialog(false);
      setBalanceConfirmStep(1);
      handleAdjustBalance();
    }
  };

  const handleAdjustBalance = async () => {
    if (!userId || !balanceAdjustment.amount) return;
    setAdjustingBalance(true);
    try {
      const response = await fetch("/api/admin/balance/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: parseFloat(balanceAdjustment.amount),
          reason: balanceAdjustment.reason || "Admin adjustment",
          currency: "USDT",
        }),
      });

      if (response.ok) {
        // Refresh balance and exchange rate
        const [balanceResponse, rateResponse] = await Promise.all([
          fetch(`/api/admin/users/${userId}?include=balance`),
          fetch("/api/crypto/usdt-rate"),
        ]);

        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          setBalances(balanceData.balances || []);
        }

        if (rateResponse.ok) {
          const rateData = await rateResponse.json();
          setUsdtToBrlRate(rateData.rate || null);
        }

        setShowBalanceDialog(false);
        setBalanceAdjustment({ amount: "", reason: "" });
        toast({
          title: "Success",
          description: "Balance adjusted successfully",
        });
      } else {
        throw new Error("Failed to adjust balance");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to adjust balance",
      });
    } finally {
      setAdjustingBalance(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes("DEPOSIT") || type.includes("BUY")) {
      return <ArrowDownRight className="h-4 w-4 text-green-500" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-red-500" />;
  };

  const getTransactionColor = (type: string) => {
    if (type.includes("DEPOSIT") || type.includes("BUY")) {
      return "text-green-500";
    }
    return "text-red-500";
  };

  const handleLoginAsUser = async () => {
    if (!userId) return;

    setLoggingInAsUser(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/login-as`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Sucesso",
          description: `Logado como ${data.user.name}`,
        });

        // Store session in localStorage (required by Dashboard component)
        localStorage.setItem("auth-session", data.user.id);
        sessionStorage.setItem("just-logged-in", "true");

        // Store in sessionStorage to indicate we're impersonating
        sessionStorage.setItem("admin-impersonating", "true");

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.href = data.redirectUrl || "/dashboard";
        }, 500);
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: data.error || "Falha ao fazer login como usuário",
        });
      }
    } catch (error) {
      console.error("Error logging in as user:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao fazer login como usuário",
      });
    } finally {
      setLoggingInAsUser(false);
    }
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return "Not provided";
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");
    // Format Brazilian phone: +55 (XX) XXXXX-XXXX
    if (digits.length === 13 && digits.startsWith("55")) {
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(
        4,
        9
      )}-${digits.slice(9)}`;
    }
    // Format if it starts with +55
    if (phone.startsWith("+55") && digits.length === 13) {
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(
        4,
        9
      )}-${digits.slice(9)}`;
    }
    // Return original if can't format
    return phone;
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return "Not provided";
    // Remove all non-digit characters
    const digits = cpf.replace(/\D/g, "");
    // Format CPF: XXX.XXX.XXX-XX
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
        6,
        9
      )}-${digits.slice(9)}`;
    }
    // Format CNPJ: XX.XXX.XXX/XXXX-XX
    if (digits.length === 14) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(
        5,
        8
      )}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    }
    // Return original if can't format
    return cpf;
  };

  const formatCurrency = (
    amount: number | string,
    currency: string = "USDT"
  ) => {
    if (currency === "BRL") {
      return formatBRL(amount);
    }
    return formatUSDT(amount);
  };

  const formatTransactionAmount = (
    amount: number | string,
    currency: string
  ) => {
    const numAmount = Number(amount);
    const sign = numAmount >= 0 ? "+" : "-";
    const absAmount = Math.abs(numAmount);

    if (currency === "BRL") {
      return `${sign}${formatBRL(absAmount).replace("R$ ", "")} BRL`;
    }
    return `${sign}${formatUSDT(absAmount).replace(" USDT", "")} USDT`;
  };

  const handleImageClick = (src: string, title: string, alt: string) => {
    setSelectedImage({ src, alt, title });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6 text-white">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black p-6 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <Button onClick={() => router.push("/admin/users")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <BackToDashboardButton />
            <div>
              <h1 className="text-3xl font-bold">{user.name}</h1>
              <p className="text-gray-400">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Personal Information */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-gray-300">
                        Nome Completo
                      </Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        className="mt-1 bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-300">
                        Telefone
                      </Label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                        className="mt-1 bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-300">
                        CPF/CNPJ
                      </Label>
                      <Input
                        value={editForm.cpf}
                        onChange={(e) =>
                          setEditForm({ ...editForm, cpf: e.target.value })
                        }
                        className="mt-1 bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={handleSaveProfileClick}
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        {saving ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditForm({
                            name: user.name || "",
                            phone: user.phone || "",
                            cpf: user.cpf || "",
                          });
                        }}
                        className="border-gray-600"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-300">
                        Full Name
                      </label>
                      <p className="text-white">{user.name}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300">
                        Email
                      </label>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{user.email}</span>
                        {user.emailVerified ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300">
                        Phone
                      </label>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-white">
                          {formatPhone(user.phone)}
                        </span>
                        {user.phoneVerified ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300">
                        CPF/CNPJ
                      </label>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-white">
                          {formatCPF(user.cpf)}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="mt-2 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar Dados
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="w-5 h-5" />
                  Account Status
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleLoginAsUser}
                  disabled={loggingInAsUser}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {loggingInAsUser ? (
                    <>
                      <LogIn className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar como Usuário
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">
                    Account Approval
                  </span>
                  {getStatusBadge(user.approvalStatus)}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">
                    KYC Status
                  </span>
                  {getStatusBadge(user.kycStatus)}
                </div>

                {user.kycRejectionReason && (
                  <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-300 font-medium">
                      KYC Rejection Reason:
                    </p>
                    <p className="text-sm text-red-200 mt-1">
                      {user.kycRejectionReason}
                    </p>
                  </div>
                )}

                <div className="text-sm text-gray-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Created: {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {user.kycSubmittedAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        KYC Submitted:{" "}
                        {new Date(user.kycSubmittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {user.kycReviewedAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        KYC Reviewed:{" "}
                        {new Date(user.kycReviewedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Balance & Quick Actions */}
        <Card className="bg-gray-900 border-gray-800 mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <Wallet className="w-5 h-5 text-green-500" />
                Saldo do Usuário
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setShowBalanceDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <DollarSign className="w-4 h-4 mr-1" />
                Ajustar Saldo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {balances.length > 0 ? (
                balances.map((balance) => {
                  // For BRL, calculate from USDT with 2% discount
                  if (balance.currency === "BRL") {
                    const usdtBalance = balances.find(
                      (b) => b.currency === "USDT"
                    );
                    if (usdtBalance && usdtToBrlRate) {
                      // Calculate BRL = USDT * rate * 0.98 (2% discount)
                      const calculatedBrl =
                        Number(usdtBalance.amount) * usdtToBrlRate * 0.98;
                      return (
                        <div
                          key={balance.currency}
                          className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                        >
                          <div className="text-sm text-gray-400 mb-1">
                            {balance.currency}{" "}
                            <span className="text-xs text-gray-500">
                              (calculado)
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-white">
                            {formatCurrency(calculatedBrl, "BRL")}
                          </div>
                          {balance.locked > 0 && (
                            <div className="text-xs text-yellow-500 mt-1">
                              Bloqueado:{" "}
                              {formatCurrency(balance.locked, balance.currency)}
                            </div>
                          )}
                        </div>
                      );
                    }
                    // Fallback to actual BRL balance if rate not available
                    return (
                      <div
                        key={balance.currency}
                        className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                      >
                        <div className="text-sm text-gray-400 mb-1">
                          {balance.currency}
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {formatCurrency(balance.amount, "BRL")}
                        </div>
                        {balance.locked > 0 && (
                          <div className="text-xs text-yellow-500 mt-1">
                            Bloqueado:{" "}
                            {formatCurrency(balance.locked, balance.currency)}
                          </div>
                        )}
                      </div>
                    );
                  }
                  // For USDT, show normally
                  return (
                    <div
                      key={balance.currency}
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                    >
                      <div className="text-sm text-gray-400 mb-1">
                        {balance.currency}
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {formatCurrency(balance.amount, "USDT")}
                      </div>
                      {balance.locked > 0 && (
                        <div className="text-xs text-yellow-500 mt-1">
                          Bloqueado:{" "}
                          {formatCurrency(balance.locked, balance.currency)}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-3 text-center text-gray-400 py-4">
                  Nenhum saldo encontrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="bg-gray-900 border-gray-800 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Histórico de Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(tx.type)}
                      <div>
                        <div className="text-sm font-medium text-white">
                          {tx.type.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(tx.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-medium ${getTransactionColor(
                          tx.type
                        )}`}
                      >
                        {formatTransactionAmount(tx.amount, tx.currency)}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          tx.status === "COMPLETED"
                            ? "border-green-500 text-green-500"
                            : tx.status === "PENDING"
                            ? "border-yellow-500 text-yellow-500"
                            : "border-red-500 text-red-500"
                        }`}
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                Nenhuma transação encontrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance Adjustment Dialog */}
        <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                Ajustar Saldo do Usuário
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Adicione ou remova saldo da conta de {user.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-gray-300">
                  Valor (use negativo para remover)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 100.00 ou -50.00"
                  value={balanceAdjustment.amount}
                  onChange={(e) =>
                    setBalanceAdjustment({
                      ...balanceAdjustment,
                      amount: e.target.value,
                    })
                  }
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Motivo</Label>
                <Input
                  placeholder="Motivo do ajuste..."
                  value={balanceAdjustment.reason}
                  onChange={(e) =>
                    setBalanceAdjustment({
                      ...balanceAdjustment,
                      reason: e.target.value,
                    })
                  }
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBalanceDialog(false)}
                  className="border-gray-600"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAdjustBalanceClick}
                  disabled={adjustingBalance || !balanceAdjustment.amount}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {adjustingBalance ? "Ajustando..." : "Confirmar Ajuste"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Balance Adjustment Confirmation Dialog */}
        <Dialog
          open={showBalanceConfirmDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowBalanceConfirmDialog(false);
              setBalanceConfirmStep(1);
            }
          }}
        >
          <DialogContent className="bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">
                {balanceConfirmStep === 1
                  ? "Confirmar Ajuste de Saldo"
                  : "Confirmação Final"}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {balanceConfirmStep === 1 ? (
                  <>
                    Você está prestes a ajustar o saldo do usuário{" "}
                    <strong className="text-white">{user?.name}</strong>.
                    <br />
                    <br />
                    <strong>Valor:</strong>{" "}
                    {balanceAdjustment.amount.startsWith("-")
                      ? "Remover"
                      : "Adicionar"}{" "}
                    {Math.abs(
                      parseFloat(balanceAdjustment.amount) || 0
                    ).toFixed(2)}{" "}
                    USDT
                    <br />
                    <strong>Motivo:</strong>{" "}
                    {balanceAdjustment.reason || "Não especificado"}
                    <br />
                    <br />
                    Esta ação alterará o saldo do usuário. Deseja continuar?
                  </>
                ) : (
                  <>
                    <strong className="text-red-400">ATENÇÃO:</strong> Esta é a
                    confirmação final.
                    <br />
                    <br />
                    Você confirma que deseja ajustar o saldo do usuário{" "}
                    <strong className="text-white">{user?.name}</strong>?
                    <br />
                    <br />
                    <strong>Valor:</strong>{" "}
                    {balanceAdjustment.amount.startsWith("-")
                      ? "Remover"
                      : "Adicionar"}{" "}
                    {Math.abs(
                      parseFloat(balanceAdjustment.amount) || 0
                    ).toFixed(2)}{" "}
                    USDT
                    <br />
                    <br />
                    Clique em &quot;Confirmar&quot; novamente para prosseguir.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBalanceConfirmDialog(false);
                  setBalanceConfirmStep(1);
                }}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleBalanceConfirm}
                className={
                  balanceConfirmStep === 1
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                {balanceConfirmStep === 1
                  ? "Sim, Continuar"
                  : "Confirmar Ajuste"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Profile Confirmation Dialog */}
        <Dialog
          open={showEditConfirmDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowEditConfirmDialog(false);
              setEditConfirmStep(1);
            }
          }}
        >
          <DialogContent className="bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editConfirmStep === 1
                  ? "Confirmar Edição"
                  : "Confirmação Final"}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editConfirmStep === 1 ? (
                  <>
                    Você está prestes a editar as informações do usuário{" "}
                    <strong className="text-white">{user?.name}</strong>.
                    <br />
                    <br />
                    Esta ação alterará os dados do usuário. Deseja continuar?
                  </>
                ) : (
                  <>
                    <strong className="text-red-400">ATENÇÃO:</strong> Esta é a
                    confirmação final.
                    <br />
                    <br />
                    Você confirma que deseja editar as informações do usuário{" "}
                    <strong className="text-white">{user?.name}</strong>?
                    <br />
                    <br />
                    Clique em &quot;Confirmar&quot; novamente para prosseguir.
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
                className={
                  editConfirmStep === 1
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                {editConfirmStep === 1 ? "Sim, Continuar" : "Confirmar Edição"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* KYC Documents */}
        {(() => {
          // Helper to check if a document value is valid (not null, not empty string)
          const isValidDocument = (doc: string | null | undefined): boolean => {
            return !!doc && typeof doc === "string" && doc.trim() !== "";
          };

          const hasDocuments =
            isValidDocument(user.documentFront) ||
            isValidDocument(user.documentBack) ||
            isValidDocument(user.documentSelfie);

          // Debug: Log document status
          console.log("KYC Documents Check:", {
            kycSubmittedAt: user.kycSubmittedAt,
            hasDocuments,
            documentFront: user.documentFront,
            documentBack: user.documentBack,
            documentSelfie: user.documentSelfie,
            documentFrontValid: isValidDocument(user.documentFront),
            documentBackValid: isValidDocument(user.documentBack),
            documentSelfieValid: isValidDocument(user.documentSelfie),
          });

          if (user.kycSubmittedAt && !hasDocuments) {
            console.warn("⚠️ KYC submitted but no valid documents found:", {
              kycSubmittedAt: user.kycSubmittedAt,
              documentFront: user.documentFront,
              documentBack: user.documentBack,
              documentSelfie: user.documentSelfie,
            });
          }

          return hasDocuments;
        })() ? (
          <Card className="bg-gray-800 border-gray-700 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="w-5 h-5" />
                KYC Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                {/* Document Front */}
                {user.documentFront && user.documentFront.trim() !== "" && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300">
                      Document Front
                    </label>
                    <div
                      className="relative cursor-pointer group"
                      onClick={() =>
                        handleImageClick(
                          getKycImageSrc(user.documentFront),
                          "Document Front",
                          "Document Front"
                        )
                      }
                    >
                      <img
                        src={getKycImageSrc(user.documentFront)}
                        alt="Document Front"
                        className="w-full h-48 object-cover rounded-lg border border-gray-600 group-hover:border-blue-500 transition-colors"
                        onError={(e) => {
                          console.error(
                            "Failed to load document front image:",
                            user.documentFront
                          );
                          e.currentTarget.src = "/placeholder-document.png"; // Fallback
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Document Back */}
                {user.documentBack && user.documentBack.trim() !== "" && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300">
                      Document Back
                    </label>
                    <div
                      className="relative cursor-pointer group"
                      onClick={() =>
                        handleImageClick(
                          getKycImageSrc(user.documentBack),
                          "Document Back",
                          "Document Back"
                        )
                      }
                    >
                      <img
                        src={getKycImageSrc(user.documentBack)}
                        alt="Document Back"
                        className="w-full h-48 object-cover rounded-lg border border-gray-600 group-hover:border-blue-500 transition-colors"
                        onError={(e) => {
                          console.error(
                            "Failed to load document back image:",
                            user.documentBack
                          );
                          e.currentTarget.src = "/placeholder-document.png"; // Fallback
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Selfie */}
                {user.documentSelfie && user.documentSelfie.trim() !== "" && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300">
                      Selfie with Document
                    </label>
                    <div
                      className="relative cursor-pointer group"
                      onClick={() =>
                        handleImageClick(
                          getKycImageSrc(user.documentSelfie),
                          "Document Selfie",
                          "Document Selfie"
                        )
                      }
                    >
                      <img
                        src={getKycImageSrc(user.documentSelfie)}
                        alt="Document Selfie"
                        className="w-full h-48 object-cover rounded-lg border border-gray-600 group-hover:border-blue-500 transition-colors"
                        onError={(e) => {
                          console.error(
                            "Failed to load document selfie image:",
                            user.documentSelfie
                          );
                          e.currentTarget.src = "/placeholder-document.png"; // Fallback
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-800 border-gray-700 mt-6">
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No KYC documents uploaded</p>
              {user.kycSubmittedAt && (
                <p className="text-gray-500 text-sm mt-2">
                  KYC was submitted on{" "}
                  {new Date(user.kycSubmittedAt).toLocaleDateString()} but
                  documents are missing.
                </p>
              )}
            </CardContent>
          </Card>
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
    </div>
  );
}
