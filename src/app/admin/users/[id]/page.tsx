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
  Edit,
  Save,
  X,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  LogIn,
  Tag,
  StickyNote,
  Plus,
  Loader2,
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
  dailyDepositLimit: number;
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
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<{ id: string; note: string; createdAt: string }[]>([]);
  const [newTag, setNewTag] = useState("");
  const [newNote, setNewNote] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [updatingLimit, setUpdatingLimit] = useState(false);
  const [customLimit, setCustomLimit] = useState("");
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
          tagsResponse,
          notesResponse,
        ] = await Promise.all([
          fetch(`/api/admin/users/${id}`),
          fetch(`/api/admin/users/${id}?include=balance`),
          fetch(`/api/admin/users/${id}?include=transactions`),
          fetch("/api/crypto/usdt-rate"),
          fetch(`/api/admin/users/${id}/tags`),
          fetch(`/api/admin/users/${id}/notes`),
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

        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          setTags(tagsData.tags || []);
        }
        if (notesResponse.ok) {
          const notesData = await notesResponse.json();
          setNotes((notesData.notes || []).map((n: { id: string; note: string; createdAt: string }) => ({ id: n.id, note: n.note, createdAt: n.createdAt })));
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
    } catch {
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
      const rawAmount = parseFloat(balanceAdjustment.amount);
      const isCredit = rawAmount > 0;
      const amount = Math.abs(rawAmount);
      const response = await fetch("/api/admin/balance/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          currency: "USDT",
          amount,
          operation: isCredit ? "CREDIT" : "DEDUCT",
          reason: balanceAdjustment.reason || "Admin adjustment",
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
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || data?.details || "Failed to adjust balance");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to adjust balance";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
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

  const handleAddTag = async () => {
    if (!userId || !newTag.trim()) return;
    setAddingTag(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: newTag.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setTags((prev) => (prev.includes(data.tag) ? prev : [...prev, data.tag]));
        setNewTag("");
        toast({ title: "Tag added", description: data.tag });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.error || "Failed to add tag" });
      }
    } finally {
      setAddingTag(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/tags?tag=${encodeURIComponent(tag)}`, { method: "DELETE" });
      if (res.ok) {
        setTags((prev) => prev.filter((t) => t !== tag));
        toast({ title: "Tag removed", description: tag });
      } else {
        const data = await res.json();
        toast({ variant: "destructive", title: "Error", description: data.error || "Failed to remove tag" });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to remove tag" });
    }
  };

  const handleAddNote = async () => {
    if (!userId || !newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.note) {
        setNotes((prev) => [{ id: data.note.id, note: data.note.note, createdAt: data.note.createdAt }, ...prev]);
        setNewNote("");
        toast({ title: "Note added" });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.error || "Failed to add note" });
      }
    } finally {
      setAddingNote(false);
    }
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

  const handleUpdateLimit = async (limit: number) => {
    if (!userId) return;
    setUpdatingLimit(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/limits`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyDepositLimit: limit }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser((prev) => (prev ? { ...prev, dailyDepositLimit: limit } : null));
        toast({
          title: "Limite Atualizado",
          description: `Novo limite diário: ${limit} USDT`,
        });
        setCustomLimit("");
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: data.error || "Falha ao atualizar limite",
        });
      }
    } catch (err) {
      console.error("Error updating limit:", err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao conectar com o servidor",
      });
    } finally {
      setUpdatingLimit(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6">
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
      <div className="min-h-screen p-6">
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
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <BackToDashboardButton />
            <div>
              <h1 className="text-3xl font-bold">{user.name}</h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Personal Information */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Nome Completo
                      </Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        className="mt-1 bg-muted border-border text-foreground"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Telefone
                      </Label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                        className="mt-1 bg-muted border-border text-foreground"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        CPF/CNPJ
                      </Label>
                      <Input
                        value={editForm.cpf}
                        onChange={(e) =>
                          setEditForm({ ...editForm, cpf: e.target.value })
                        }
                        className="mt-1 bg-muted border-border text-foreground"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={handleSaveProfileClick}
                        disabled={saving}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
                        className="border-border"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Full Name
                      </label>
                      <p className="text-foreground">{user.name}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Email
                      </label>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{user.email}</span>
                        {user.emailVerified ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Phone
                      </label>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">
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
                      <label className="text-sm font-medium text-muted-foreground">
                        CPF/CNPJ
                      </label>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">
                          {formatCPF(user.cpf)}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="mt-2 border-border text-muted-foreground hover:bg-muted"
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
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <FileText className="w-5 h-5" />
                  Account Status
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleLoginAsUser}
                  disabled={loggingInAsUser}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
                  <span className="text-sm font-medium text-muted-foreground">
                    Account Approval
                  </span>
                  {getStatusBadge(user.approvalStatus)}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
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

                <div className="text-sm text-muted-foreground space-y-1">
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

        {/* Rewards & Limits Section */}
        <Card className="bg-card border-border mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="w-5 h-5 text-primary" />
              Rewards & Análise de Limite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    Status de Recompensas
                  </label>
                  <div className="flex items-center gap-2">
                    {user.dailyDepositLimit >= 10000 ? (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 py-1 px-3">
                        💎 Cliente VIP / Premium
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 py-1 px-3">
                        ✨ Cliente Padrão
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    Limite Diário de Depósito (USDT)
                  </label>
                  <div className="text-3xl font-bold text-foreground">
                    {formatUSDT(user.dailyDepositLimit || 5000)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este limite regula quanto o cliente pode depositar via PIX por dia.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-muted-foreground block">
                  Ajuste Rápido de Limite
                </label>
                <div className="flex flex-wrap gap-2">
                  {[5000, 10000, 20000, 50000].map((limit) => (
                    <Button
                      key={limit}
                      size="sm"
                      variant={user.dailyDepositLimit === limit ? "default" : "outline"}
                      onClick={() => handleUpdateLimit(limit)}
                      disabled={updatingLimit}
                      className="min-w-[80px]"
                    >
                      {limit >= 1000 ? `${limit / 1000}k` : limit}
                    </Button>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    Valor Personalizado
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Ex: 15000"
                      value={customLimit}
                      onChange={(e) => setCustomLimit(e.target.value)}
                      className="bg-muted border-border text-foreground"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdateLimit(Number(customLimit))}
                      disabled={updatingLimit || !customLimit}
                    >
                      Definir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tags & Notes */}
        <div className="grid gap-6 lg:grid-cols-2 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Tag className="w-5 h-5" />
                User tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1 pr-1">
                    {t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="ml-1 rounded hover:bg-muted p-0.5"
                      aria-label={`Remove ${t}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <span className="text-sm text-muted-foreground">No tags</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. VIP, High risk"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  className="bg-muted border-border text-foreground max-w-[200px]"
                />
                <Button
                  size="sm"
                  onClick={handleAddTag}
                  disabled={addingTag || !newTag.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {addingTag ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <StickyNote className="w-5 h-5" />
                Internal notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg border border-border bg-muted/50 p-3 text-sm"
                  >
                    <p className="text-foreground whitespace-pre-wrap">{n.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <textarea
                  placeholder="e.g. Asked for limit increase, KYC docs re-sent..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
                />
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="w-fit bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {addingNote ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Add note
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Balance & Quick Actions */}
        <Card className="bg-card border-border mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Wallet className="w-5 h-5 text-green-500" />
                Saldo do Usuário
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setShowBalanceDialog(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
                          className="bg-muted rounded-lg p-4 border border-border"
                        >
                          <div className="text-sm text-muted-foreground mb-1">
                            {balance.currency}{" "}
                            <span className="text-xs text-muted-foreground">
                              (calculado)
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-foreground">
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
                        className="bg-muted rounded-lg p-4 border border-border"
                      >
                        <div className="text-sm text-muted-foreground mb-1">
                          {balance.currency}
                        </div>
                        <div className="text-2xl font-bold text-foreground">
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
                      className="bg-muted rounded-lg p-4 border border-border"
                    >
                      <div className="text-sm text-muted-foreground mb-1">
                        {balance.currency}
                      </div>
                      <div className="text-2xl font-bold text-foreground">
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
                <div className="col-span-3 text-center text-muted-foreground py-4">
                  Nenhum saldo encontrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="bg-card border-border mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="w-5 h-5 text-primary" />
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
                    className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(tx.type)}
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {tx.type.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-muted-foreground">
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
              <div className="text-center text-muted-foreground py-8">
                Nenhuma transação encontrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance Adjustment Dialog */}
        <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Ajustar Saldo do Usuário
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Adicione ou remova saldo da conta de {user.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-muted-foreground">
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
                  className="mt-1 bg-muted border-border text-foreground"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Motivo</Label>
                <Input
                  placeholder="Motivo do ajuste..."
                  value={balanceAdjustment.reason}
                  onChange={(e) =>
                    setBalanceAdjustment({
                      ...balanceAdjustment,
                      reason: e.target.value,
                    })
                  }
                  className="mt-1 bg-muted border-border text-foreground"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBalanceDialog(false)}
                  className="border-border"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAdjustBalanceClick}
                  disabled={adjustingBalance || !balanceAdjustment.amount}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {balanceConfirmStep === 1
                  ? "Confirmar Ajuste de Saldo"
                  : "Confirmação Final"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {balanceConfirmStep === 1 ? (
                  <>
                    Você está prestes a ajustar o saldo do usuário{" "}
                    <strong className="text-foreground">{user?.name}</strong>.
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
                    <strong className="text-foreground">{user?.name}</strong>?
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
                className="border-border text-muted-foreground hover:bg-muted"
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
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editConfirmStep === 1
                  ? "Confirmar Edição"
                  : "Confirmação Final"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {editConfirmStep === 1 ? (
                  <>
                    Você está prestes a editar as informações do usuário{" "}
                    <strong className="text-foreground">{user?.name}</strong>.
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
                    <strong className="text-foreground">{user?.name}</strong>?
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
                className="border-border text-muted-foreground hover:bg-muted"
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
          <Card className="bg-muted border-border mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FileText className="w-5 h-5" />
                KYC Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                {/* Document Front */}
                {user.documentFront && user.documentFront.trim() !== "" && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">
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
                        className="w-full h-48 object-cover rounded-lg border border-border group-hover:border-primary transition-colors"
                        onError={(e) => {
                          console.error(
                            "Failed to load document front image:",
                            user.documentFront
                          );
                          e.currentTarget.src = "/placeholder-document.png"; // Fallback
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Document Back */}
                {user.documentBack && user.documentBack.trim() !== "" && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">
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
                        className="w-full h-48 object-cover rounded-lg border border-border group-hover:border-primary transition-colors"
                        onError={(e) => {
                          console.error(
                            "Failed to load document back image:",
                            user.documentBack
                          );
                          e.currentTarget.src = "/placeholder-document.png"; // Fallback
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Selfie */}
                {user.documentSelfie && user.documentSelfie.trim() !== "" && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">
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
                        className="w-full h-48 object-cover rounded-lg border border-border group-hover:border-primary transition-colors"
                        onError={(e) => {
                          console.error(
                            "Failed to load document selfie image:",
                            user.documentSelfie
                          );
                          e.currentTarget.src = "/placeholder-document.png"; // Fallback
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted border-border mt-6">
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No KYC documents uploaded</p>
              {user.kycSubmittedAt && (
                <p className="text-muted-foreground text-sm mt-2">
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
