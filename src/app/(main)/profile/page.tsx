"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DESKTOP_SHELL_PL, MOBILE_BOTTOM_NAV_PADDING } from "@/constants/layout-shell";
import Breadcrumb from "@/components/ui/breadcrumb";
import { useLanguage } from "@/contexts/LanguageContext";
import { getKycImageSrc } from "@/lib/kyc-image-src";
import { formatUSDT } from "@/lib/format-currency";
import { compressImageForUpload } from "@/lib/compress-image";
import { readSessionCache, writeSessionCache } from "@/lib/utils";

const USER_STATUS_CACHE_KEY = "user-status";
const PROFILE_CACHE_MS = 120_000;
import { TransactionReceipt } from "@/components/TransactionReceipt";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Mail,
  Phone,
  CreditCard,
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Camera,
  Edit,
  Save,
  X,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  AlertTriangle,
  Trash2,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  kycStatus: "PENDING" | "APPROVED" | "REJECTED";
  emailVerified: boolean;
  phoneVerified: boolean;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  kycRejectionReason: string | null;
  kycData?: { documentsToUpdate?: ("front" | "back" | "selfie")[] } | null;
  dailyDepositLimit?: number;
}

interface KYCDocuments {
  documentFront: string | null;
  documentBack: string | null;
  documentSelfie: string | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  received?: number;
  date?: Date;
}

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [kycDocuments, setKycDocuments] = useState<KYCDocuments | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
  });
  const [pendingFiles, setPendingFiles] = useState<{
    front?: File;
    back?: File;
    selfie?: File;
  }>({});
  const [pendingPreviews, setPendingPreviews] = useState<{
    front?: string;
    back?: string;
    selfie?: string;
  }>({});

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    transactionId: string;
    amount: number;
    usdtAmount: number;
    date: Date;
  } | null>(null);

  const [deleteStep1, setDeleteStep1] = useState(false);
  const [deleteStep2, setDeleteStep2] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { toast } = useToast();
  const { t, language } = useLanguage();

  useLayoutEffect(() => {
    const cached = readSessionCache<UserProfile>(
      USER_STATUS_CACHE_KEY,
      PROFILE_CACHE_MS
    );
    if (!cached) return;
    setUserProfile(cached);
    setFormData({
      name: cached.name || "",
      email: cached.email || "",
      phone: cached.phone || "",
      cpf: cached.cpf || "",
    });
    setProfileReady(true);
  }, []);

  // Auto-enable editing mode when user is PENDING
  useEffect(() => {
    if (userProfile) {
      const isPendingUser =
        userProfile.approvalStatus === "PENDING" ||
        userProfile.kycStatus === "PENDING";
      
      if (isPendingUser) {
        setEditing(true);
      } else if (
        userProfile.approvalStatus === "APPROVED" &&
        userProfile.kycStatus === "APPROVED"
      ) {
        // Only disable editing if fully approved
        setEditing(false);
      }
    }
  }, [userProfile]);

  const pendingPreviewsRef = useRef(pendingPreviews);
  useEffect(() => {
    pendingPreviewsRef.current = pendingPreviews;
  }, [pendingPreviews]);
  useEffect(() => {
    return () => {
      (Object.values(pendingPreviewsRef.current) as string[]).forEach(
        (url) => url && URL.revokeObjectURL(url)
      );
    };
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/user/status");
      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        const isPendingUser =
          user.approvalStatus === "PENDING" || user.kycStatus === "PENDING";

        setUserProfile(user);
        writeSessionCache(USER_STATUS_CACHE_KEY, user);
        setFormData({
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          cpf: user.cpf || "",
        });
        if (isPendingUser) setEditing(true);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("failedToLoadProfile"),
      });
    }
  }, [t, toast]);

  const fetchKycDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/user/kyc-documents");
      if (response.ok) {
        const data = await response.json();
        setKycDocuments(data.documents);
      }
    } catch (error) {
      console.error("Error fetching KYC documents:", error);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch("/api/transactions?limit=20");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }, []);

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleDeleteAccount = async () => {
    if (!deleteStep1 || !deleteStep2) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch("/api/user/delete-account", {
        method: "DELETE",
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Conta excluída",
          description: "Sua conta foi permanentemente excluída. Redirecionando...",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao excluir conta",
          description: data.details || data.error || "Ocorreu um erro inesperado.",
        });
      }
    } catch (error) {
      console.error("Delete account error:", error);
      toast({
        variant: "destructive",
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor para excluir sua conta.",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Initial load — single completion flag for inline skeletons (no full-page block)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await Promise.all([
          fetchUserProfile(),
          fetchKycDocuments(),
          fetchTransactions(),
        ]);
      } finally {
        if (!cancelled) setProfileReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchUserProfile, fetchKycDocuments, fetchTransactions]);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    // Only allow cancel if user is not PENDING
    if (
      userProfile &&
      userProfile.approvalStatus !== "PENDING" &&
      userProfile.kycStatus !== "PENDING"
    ) {
      setEditing(false);
      setFormData({
        name: userProfile?.name || "",
        email: userProfile?.email || "",
        phone: userProfile?.phone || "",
        cpf: userProfile?.cpf || "",
      });
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch("/api/user/update-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: t("profileUpdated") || "Perfil Atualizado",
          description:
            t("profileUpdatedSuccess") ||
            "Suas informações foram atualizadas com sucesso.",
        });
        // Don't disable editing if user is still PENDING
        if (
          userProfile &&
          userProfile.approvalStatus !== "PENDING" &&
          userProfile.kycStatus !== "PENDING"
        ) {
          setEditing(false);
        }
        fetchUserProfile();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("error") || "Erro",
        description:
          error instanceof Error
            ? error.message
            : t("failedToUpdateProfile") || "Falha ao atualizar perfil",
      });
    }
  };

  const handleSubmitForReview = async () => {
    // First save the profile data
    try {
      const saveResponse = await fetch("/api/user/update-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save profile");
      }

      // Then submit KYC for review
      const submitResponse = await fetch("/api/user/submit-kyc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (submitResponse.ok) {
        toast({
          title:
            language === "pt" ? "Enviado para Revisão" : "Submitted for Review",
          description:
            language === "pt"
              ? "Suas informações foram enviadas para revisão. Você será notificado quando houver uma atualização."
              : "Your information has been submitted for review. You will be notified when there's an update.",
        });
        fetchUserProfile();
      } else {
        throw new Error("Failed to submit for review");
      }
    } catch (error) {
      console.error("Error submitting for review:", error);
      toast({
        variant: "destructive",
        title: t("error") || "Erro",
        description:
          error instanceof Error
            ? error.message
            : language === "pt"
            ? "Falha ao enviar para revisão"
            : "Failed to submit for review",
      });
    }
  };

  const handleFileSelect = (type: "front" | "back" | "selfie", file: File) => {
    setPendingFiles((prev) => ({ ...prev, [type]: file }));
    setPendingPreviews((prev) => {
      const next = { ...prev };
      if (next[type]) URL.revokeObjectURL(next[type]!);
      next[type] = URL.createObjectURL(file);
      return next;
    });
  };

  const clearPending = (type?: "front" | "back" | "selfie") => {
    if (type) {
      setPendingPreviews((prev) => {
        if (prev[type]) URL.revokeObjectURL(prev[type]!);
        const next = { ...prev };
        delete next[type];
        return next;
      });
      setPendingFiles((prev) => {
        const next = { ...prev };
        delete next[type];
        return next;
      });
    } else {
      setPendingPreviews((prev) => {
        (Object.keys(prev) as ("front" | "back" | "selfie")[]).forEach(
          (k) => prev[k] && URL.revokeObjectURL(prev[k]!)
        );
        return {};
      });
      setPendingFiles({});
    }
  };

  const handleUploadAll = async () => {
    const { front, back, selfie } = pendingFiles;
    if (!front && !back && !selfie) return;

    try {
      setUploading(true);

      const entries = (
        [
          ["front", front],
          ["back", back],
          ["selfie", selfie],
        ] as const
      ).filter((entry): entry is [typeof entry[0], File] => !!entry[1]);

      // Compress + upload one-by-one to stay under Vercel request body limits
      for (const [type, file] of entries) {
        const compressed = await compressImageForUpload(file);
        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("type", type);

        const response = await fetch("/api/user/upload-kyc-document", {
          method: "POST",
          body: formData,
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const label =
            type === "front"
              ? language === "pt"
                ? "frente do documento"
                : "document front"
              : type === "back"
                ? language === "pt"
                  ? "verso do documento"
                  : "document back"
                : language === "pt"
                  ? "selfie com documento"
                  : "selfie with document";
          throw new Error(
            data?.error ||
              (language === "pt"
                ? `Falha ao enviar ${label}. Tente uma imagem menor em JPG/PNG.`
                : `Failed to upload ${label}. Try a smaller JPG/PNG image.`)
          );
        }
      }

      toast({
        title: t("documentUploaded"),
        description:
          language === "pt"
            ? "Seus documentos foram enviados com sucesso."
            : "Your documents have been uploaded successfully.",
      });
      clearPending();
      fetchKycDocuments();
      fetchUserProfile();
    } catch (e) {
      toast({
        variant: "destructive",
        title: t("uploadFailed"),
        description:
          e instanceof Error
            ? e.message
            : language === "pt"
              ? "Falha ao enviar documentos. Tente imagens menores em JPG/PNG."
              : t("failedToUpload"),
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("approved")}
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            {t("pending")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            {t("rejected")}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Check if user is fully approved
  const isApproved =
    userProfile?.approvalStatus === "APPROVED" &&
    userProfile?.kycStatus === "APPROVED";

  // Check if user is PENDING (for always-editable mode)
  const isPending =
    userProfile?.approvalStatus === "PENDING" ||
    userProfile?.kycStatus === "PENDING";

  const shouldShowEditableFields = isPending || (!isApproved && editing);

  const documentsToUpdate =
    (userProfile?.kycData as { documentsToUpdate?: ("front" | "back" | "selfie")[] } | undefined)
      ?.documentsToUpdate ?? [];
  const needsUpdateFront = documentsToUpdate.length === 0 || documentsToUpdate.includes("front");
  const needsUpdateBack = documentsToUpdate.length === 0 || documentsToUpdate.includes("back");
  const needsUpdateSelfie = documentsToUpdate.length === 0 || documentsToUpdate.includes("selfie");
  const needsResendDocs =
    isPending &&
    (!!userProfile?.kycRejectionReason?.trim() ||
      (Array.isArray(documentsToUpdate) && documentsToUpdate.length > 0));
  const hasAllDocs =
    !!kycDocuments?.documentFront &&
    !!kycDocuments?.documentBack &&
    !!kycDocuments?.documentSelfie;

  return (
    <div className={`min-h-screen bg-background text-foreground ${DESKTOP_SHELL_PL}`}>
      <div className={`container mx-auto px-4 py-6 ${MOBILE_BOTTOM_NAV_PADDING}`}>
        <Breadcrumb
          items={[
            { label: t("dashboard"), href: "/dashboard" },
            { label: t("profile") },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gerenciamento de Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e documentos KYC
          </p>
          {isPending && !needsResendDocs && (
            <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Status pendente:</strong>{" "}
                Preencha suas informações e envie os documentos abaixo para
                revisão.
              </p>
            </div>
          )}
          {needsResendDocs && (
            <div
              id="resend-banner"
              className="mt-4 p-5 rounded-xl border border-primary/40 bg-primary/10"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Camera className="w-5 h-5 text-primary" />
                    {t("resendDocsTitle")}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("resendDocsMessage")}
                  </p>
                  {documentsToUpdate.length > 0 && documentsToUpdate.length < 3 && (
                    <div className="mt-2 p-2 rounded-lg bg-background/80 border border-border">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Documentos a atualizar
                      </p>
                      <p className="text-sm text-foreground mt-0.5">
                        {documentsToUpdate.map((d) =>
                          d === "front"
                            ? t("documentFront")
                            : d === "back"
                              ? t("documentBack")
                              : t("selfieWithDocument")
                        ).join(", ")}
                      </p>
                    </div>
                  )}
                  {userProfile?.kycRejectionReason && (
                    <div className="mt-3 p-3 rounded-lg bg-background/80 border border-border">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t("kycRejectionReason")}
                      </p>
                      <p className="text-sm text-foreground mt-1">
                        {userProfile.kycRejectionReason}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() =>
                    document.getElementById("kyc-documents")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                  className="shrink-0 bg-primary text-primary-foreground hover:opacity-90"
                >
                  {t("goToDocuments")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {!profileReady ? (
          <div
            className="space-y-6 mt-2"
            role="status"
            aria-busy
            aria-label={t("loadingProfile")}
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="min-h-[22rem] rounded-xl border border-border bg-muted/40 animate-pulse" />
              <div className="min-h-[22rem] rounded-xl border border-border bg-muted/40 animate-pulse" />
            </div>
            <div className="min-h-[20rem] rounded-xl border border-border bg-muted/40 animate-pulse" />
            <div className="min-h-[14rem] rounded-xl border border-border bg-muted/40 animate-pulse" />
            <div className="min-h-[10rem] rounded-xl border border-border bg-muted/40 animate-pulse" />
          </div>
        ) : (
          <>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {t("personalInformation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">{t("fullName")}</Label>
                  {shouldShowEditableFields ? (
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground">
                        {userProfile?.name || t("notProvided")}
                      </p>
                      {isApproved && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">{t("email")}</Label>
                  {shouldShowEditableFields ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{userProfile?.email}</span>
                      {userProfile?.emailVerified ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">{t("phone")}</Label>
                  {shouldShowEditableFields ? (
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {userProfile?.phone || t("notProvided")}
                      </span>
                      {userProfile?.phoneVerified ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="cpf">{t("cpf")}</Label>
                  {shouldShowEditableFields ? (
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) =>
                        setFormData({ ...formData, cpf: e.target.value })
                      }
                      placeholder="000.000.000-00"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {userProfile?.cpf || t("notProvided")}
                      </span>
                      {isApproved && userProfile?.cpf && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!isApproved && (
                <div className="flex gap-2 flex-wrap">
                  {editing || isPending ? (
                    <>
                      <Button onClick={handleSave} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        {t("save") || "Salvar"}
                      </Button>
                      {!isPending && (
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          size="sm"
                        >
                          <X className="w-4 h-4 mr-2" />
                          {t("cancel") || "Cancelar"}
                        </Button>
                      )}
                      {isPending && (
                        <Button
                          onClick={handleSubmitForReview}
                          size="sm"
                          className="bg-brand-500 hover:bg-brand-600"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {language === "pt"
                            ? "Enviar para Revisão"
                            : "Submit for Review"}
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button onClick={handleEdit} size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      {t("editProfile") || "Editar Perfil"}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t("accountStatus")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("accountApproval")}
                  </span>
                  {getStatusBadge(userProfile?.approvalStatus || "PENDING")}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("kycStatus") || "Status KYC"}</span>
                  {getStatusBadge(userProfile?.kycStatus || "PENDING")}
                </div>

                <div className="pt-2 border-t border-border mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {language === "pt" ? "Limite Diário de Depósito" : "Daily Deposit Limit"}
                    </span>
                    <Badge variant="outline" className="text-sm font-bold bg-muted/50">
                      ${(userProfile?.dailyDepositLimit ?? 5000).toLocaleString()} USDT
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    {language === "pt" 
                      ? "* O limite diário é ajustado manualmente pelos administradores baseando em suas atividades."
                      : "* Your daily limit is manually adjusted by administrators based on your activity."}
                  </p>
                </div>

                {userProfile?.kycRejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      {t("kycRejectionReason")}:
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {userProfile.kycRejectionReason}
                    </p>
                  </div>
                )}

                {userProfile?.kycSubmittedAt && (
                  <div className="text-sm text-muted-foreground">
                    <p>
                      <strong>{t("submitted")}:</strong>{" "}
                      {new Date(userProfile.kycSubmittedAt).toLocaleDateString(
                        language === "pt" ? "pt-BR" : "en-US"
                      )}
                    </p>
                    {userProfile.kycReviewedAt && (
                      <p>
                        <strong>{t("reviewed")}:</strong>{" "}
                        {new Date(userProfile.kycReviewedAt).toLocaleDateString(
                          language === "pt" ? "pt-BR" : "en-US"
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KYC Documents */}
        <Card id="kyc-documents" className="mt-6 scroll-mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {t("kycDocuments")}
            </CardTitle>
            {!isApproved && (
              <p className="text-sm text-muted-foreground mt-1">
                {needsResendDocs
                  ? t("kycSectionSubtitleResend")
                  : t("kycSectionSubtitleFirst")}
              </p>
            )}
            {!isApproved && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("formatsAccepted")}. {t("allThreeRequired")}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Step 1: Document Front */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                    {t("step")} 1
                  </span>
                  <Label className="text-base">{t("documentFront")}</Label>
                  {needsResendDocs && needsUpdateFront && (
                    <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                      Requer atualização
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pl-10">
                  {t("documentFrontTip")}
                </p>
                <div className="relative border-2 border-dashed border-border rounded-xl p-4 text-center min-h-[140px] flex flex-col justify-center">
                  {pendingFiles.front ? (
                    <div className="space-y-2">
                      <Image
                        src={pendingPreviews.front || ""}
                        alt={t("documentFront") ?? "Document Front"}
                        width={400}
                        height={200}
                        className="w-full h-28 object-cover rounded-lg"
                        unoptimized={true}
                      />
                      <p className="text-xs text-muted-foreground truncate">
                        {pendingFiles.front.name}
                      </p>
                      <div className="flex gap-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect("front", file);
                          }}
                          className="hidden"
                          id="front-upload"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("front-upload")?.click()
                          }
                          className="flex-1 text-xs"
                        >
                          {t("replacePhoto")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearPending("front")}
                          className="text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : kycDocuments?.documentFront ? (
                    isApproved ? (
                      <div className="space-y-2 py-4">
                        <CheckCircle className="w-12 h-12 mx-auto text-primary" />
                        <p className="text-sm font-medium text-primary">
                          {t("approved")}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Image
                          src={getKycImageSrc(kycDocuments.documentFront)}
                          alt={t("documentFront") ?? "Document Front"}
                          width={400}
                          height={200}
                          className="w-full h-28 object-cover rounded-lg"
                          unoptimized={true}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("uploaded")}
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect("front", file);
                          }}
                          className="hidden"
                          id="front-upload"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("front-upload")?.click()
                          }
                          className="w-full text-xs"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          {t("replacePhoto")}
                        </Button>
                      </div>
                    )
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("noDocumentUploaded")}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect("front", file);
                        }}
                        className="hidden"
                        id="front-upload"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          document.getElementById("front-upload")?.click()
                        }
                        className="w-full mt-2"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {t("uploadFront")}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Step 2: Document Back */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                    {t("step")} 2
                  </span>
                  <Label className="text-base">{t("documentBack")}</Label>
                  {needsResendDocs && needsUpdateBack && (
                    <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                      Requer atualização
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pl-10">
                  {t("documentBackTip")}
                </p>
                <div className="relative border-2 border-dashed border-border rounded-xl p-4 text-center min-h-[140px] flex flex-col justify-center">
                  {pendingFiles.back ? (
                    <div className="space-y-2">
                      <Image
                        src={pendingPreviews.back || ""}
                        alt={t("documentBack") ?? "Document Back"}
                        width={400}
                        height={200}
                        className="w-full h-28 object-cover rounded-lg"
                        unoptimized={true}
                      />
                      <p className="text-xs text-muted-foreground truncate">
                        {pendingFiles.back.name}
                      </p>
                      <div className="flex gap-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect("back", file);
                          }}
                          className="hidden"
                          id="back-upload"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("back-upload")?.click()
                          }
                          className="flex-1 text-xs"
                        >
                          {t("replacePhoto")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearPending("back")}
                          className="text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : kycDocuments?.documentBack ? (
                    isApproved ? (
                      <div className="space-y-2 py-4">
                        <CheckCircle className="w-12 h-12 mx-auto text-primary" />
                        <p className="text-sm font-medium text-primary">
                          {t("approved")}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Image
                          src={getKycImageSrc(kycDocuments.documentBack)}
                          alt={t("documentBack") ?? "Document Back"}
                          width={400}
                          height={200}
                          className="w-full h-28 object-cover rounded-lg"
                          unoptimized={true}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("uploaded")}
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect("back", file);
                          }}
                          className="hidden"
                          id="back-upload"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("back-upload")?.click()
                          }
                          className="w-full text-xs"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          {t("replacePhoto")}
                        </Button>
                      </div>
                    )
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("noDocumentUploaded")}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect("back", file);
                        }}
                        className="hidden"
                        id="back-upload"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          document.getElementById("back-upload")?.click()
                        }
                        className="w-full mt-2"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {t("uploadBack")}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Step 3: Selfie */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                    {t("step")} 3
                  </span>
                  <Label className="text-base">{t("selfieWithDocument")}</Label>
                  {needsResendDocs && needsUpdateSelfie && (
                    <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                      Requer atualização
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pl-10">
                  {t("selfieTip")}
                </p>
                <div className="relative border-2 border-dashed border-border rounded-xl p-4 text-center min-h-[140px] flex flex-col justify-center">
                  {pendingFiles.selfie ? (
                    <div className="space-y-2">
                      <Image
                        src={pendingPreviews.selfie || ""}
                        alt={t("selfieWithDocument") ?? "Selfie with Document"}
                        width={400}
                        height={200}
                        className="w-full h-28 object-cover rounded-lg"
                        unoptimized={true}
                      />
                      <p className="text-xs text-muted-foreground truncate">
                        {pendingFiles.selfie.name}
                      </p>
                      <div className="flex gap-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect("selfie", file);
                          }}
                          className="hidden"
                          id="selfie-upload"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("selfie-upload")?.click()
                          }
                          className="flex-1 text-xs"
                        >
                          {t("replacePhoto")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearPending("selfie")}
                          className="text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : kycDocuments?.documentSelfie ? (
                    isApproved ? (
                      <div className="space-y-2 py-4">
                        <CheckCircle className="w-12 h-12 mx-auto text-primary" />
                        <p className="text-sm font-medium text-primary">
                          {t("approved")}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Image
                          src={getKycImageSrc(kycDocuments.documentSelfie)}
                          alt={t("selfieWithDocument") ?? "Selfie with Document"}
                          width={400}
                          height={200}
                          className="w-full h-28 object-cover rounded-lg"
                          unoptimized={true}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("uploaded")}
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect("selfie", file);
                          }}
                          className="hidden"
                          id="selfie-upload"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("selfie-upload")?.click()
                          }
                          className="w-full text-xs"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          {t("replacePhoto")}
                        </Button>
                      </div>
                    )
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("noSelfieUploaded")}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect("selfie", file);
                        }}
                        className="hidden"
                        id="selfie-upload"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          document.getElementById("selfie-upload")?.click()
                        }
                        className="w-full mt-2"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {t("uploadSelfie")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Send all documents at once */}
            {!isApproved && (pendingFiles.front || pendingFiles.back || pendingFiles.selfie) && (
              <div className="mt-6 p-5 rounded-xl border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  {[pendingFiles.front, pendingFiles.back, pendingFiles.selfie].filter(Boolean).length}{" "}
                  {t("documentsSelected")}
                </p>
                <Button
                  onClick={handleUploadAll}
                  disabled={
                    uploading ||
                    (hasAllDocs
                      ? false
                      : !pendingFiles.front || !pendingFiles.back || !pendingFiles.selfie)
                  }
                  className="w-full bg-primary text-primary-foreground hover:opacity-90"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2" />
                      {t("uploading")}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {t("uploadAllDocuments")}
                    </>
                  )}
                </Button>
                {!hasAllDocs &&
                  (!pendingFiles.front || !pendingFiles.back || !pendingFiles.selfie) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("allThreeRequired")}
                  </p>
                )}
              </div>
            )}

            {/* Submit for review – prominent when all 3 docs present */}
            {!isApproved && hasAllDocs && (
              <div className="mt-6 pt-4 border-t border-border">
                <Button
                  onClick={handleSubmitForReview}
                  className="w-full bg-primary text-primary-foreground hover:opacity-90 py-6 text-base font-medium"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  {language === "pt"
                    ? "Enviar para revisão"
                    : "Submit for review"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transition History */}
        <Card className="mt-8 rounded-xl sm:rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                {t("purchaseHistory") || "Histórico de Transações"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map((transaction, index) => {
                  const date = new Date(transaction.createdAt);
                  const time = date.toLocaleTimeString(
                    language === "pt" ? "pt-BR" : "en-US",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  );
                  const dateStr = date.toLocaleDateString(
                    language === "pt" ? "pt-BR" : "en-US",
                    {
                      day: "2-digit",
                      month: "2-digit",
                    }
                  );

                  let icon = <ArrowUpRight className="w-4 h-4" />;
                  let bgColor = "bg-primary/10";
                  let iconColor = "text-primary";
                  let title = "";
                  let amountColor = "text-primary";
                  let prefix = "+";

                  const formattedAmount =
                    transaction.currency === "BRL"
                      ? formatBRL(transaction.amount)
                      : formatUSDT(transaction.amount).replace(
                          " USDT",
                          ` ${transaction.currency || "USDT"}`
                        );

                  if (
                    transaction.type === "DEPOSIT" ||
                    transaction.type === "BUY_CRYPTO"
                  ) {
                    icon = <ArrowUpRight className="w-4 h-4" />;
                    bgColor = "bg-primary/10";
                    iconColor = "text-primary";
                    amountColor = "text-primary";
                    title =
                      transaction.type === "BUY_CRYPTO"
                        ? "Compra de USDT"
                        : "Depósito";
                    prefix = "+";
                  } else if (
                    transaction.type === "WITHDRAWAL" ||
                    transaction.type === "WITHDRAW"
                  ) {
                    icon = <ArrowDownRight className="w-4 h-4" />;
                    bgColor = "bg-destructive/10";
                    iconColor = "text-destructive";
                    amountColor = "text-destructive";
                    title = "Saque";
                    prefix = "-";
                  } else if (transaction.type === "SELL") {
                    icon = <TrendingDown className="w-4 h-4" />;
                    bgColor = "bg-orange-500/10";
                    iconColor = "text-orange-400";
                    amountColor = "text-orange-400";
                    title = "Venda";
                    prefix = "-";
                  } else {
                    title = transaction.type;
                  }

                  const isCompleted = 
                    transaction.status === "COMPLETED" || 
                    transaction.status === "APPROVED" || 
                    transaction.status === "CONFIRMED";

                  return (
                    <div
                      key={transaction.id || index}
                      onClick={() => {
                        if (isCompleted) {
                          setReceiptData({
                            transactionId: transaction.id,
                            amount: Number(transaction.amount),
                            usdtAmount: Number(transaction.received || transaction.amount),
                            date: new Date(transaction.createdAt),
                          });
                          setShowReceipt(true);
                        }
                      }}
                      className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors active:bg-muted/60 ${isCompleted ? 'cursor-pointer' : ''}`}
                    >
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}
                      >
                        <div className={iconColor}>{icon}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 mb-0.5">
                          <h4 className="font-medium text-foreground text-xs sm:text-sm truncate">
                            {title}
                          </h4>
                          <p
                            className={`font-semibold text-xs sm:text-sm ${amountColor} whitespace-nowrap`}
                          >
                            {prefix}
                            {formattedAmount}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {dateStr} {language === "pt" ? "às" : "at"} {time}
                          </p>
                          {transaction.status && (
                            <span
                              className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded ${
                                isCompleted
                                  ? "bg-primary/20 text-primary"
                                  : transaction.status === "PENDING" ||
                                    transaction.status === "Pendente"
                                  ? "bg-warning/20 text-warning"
                                  : transaction.status === "FAILED" ||
                                    transaction.status === "REJECTED"
                                  ? "bg-destructive/20 text-destructive"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {transaction.status}
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[10px] text-primary flex items-center gap-1 ml-auto">
                              <FileText className="w-3 h-3" />
                              {language === "pt" ? "Ver Comprovante" : "View Receipt"}
                            </span>
                          )}
                        </div>
                      </div>
                      {isCompleted && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma transação encontrada.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Account Section */}
        <Card className="mt-12 border-destructive/30 bg-destructive/5 overflow-hidden">
          <CardHeader className="bg-destructive/10">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Excluir Conta Permanentemente
            </CardTitle>
            <p className="text-sm text-destructive/80 mt-1">
              Esta ação é irreversível. Todos os seus dados, saldo e histórico serão perdidos para sempre.
            </p>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="p-4 bg-background/50 rounded-lg border border-destructive/20 space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="delete-step-1" 
                  checked={deleteStep1}
                  onCheckedChange={(checked) => setDeleteStep1(!!checked)}
                  className="mt-1 border-destructive/50 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                />
                <div className="grid gap-1.5 leading-none cursor-pointer" onClick={() => setDeleteStep1(!deleteStep1)}>
                  <label
                    htmlFor="delete-step-1"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Eu entendo que esta ação é permanente e irreversível.
                  </label>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="delete-step-2" 
                  checked={deleteStep2}
                  onCheckedChange={(checked) => setDeleteStep2(!!checked)}
                  className="mt-1 border-destructive/50 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                />
                <div className="grid gap-1.5 leading-none cursor-pointer" onClick={() => setDeleteStep2(!deleteStep2)}>
                  <label
                    htmlFor="delete-step-2"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Eu não tenho saldo pendente e confirmo que desejo apagar meus dados.
                  </label>
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              className="w-full sm:w-auto h-12 px-8 font-bold disabled:opacity-30"
              disabled={!deleteStep1 || !deleteStep2 || isDeleting}
              onClick={() => setShowDeleteDialog(true)}
            >
              {isDeleting ? "Excluindo..." : "EXCLUIR MINHA CONTA AGORA"}
            </Button>
          </CardContent>
        </Card>

        </>
        )}

        {/* Receipt Modal */}
        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent
            hideClose
            className="z-[100] left-1/2 top-[max(0.5rem,env(safe-area-inset-top))] max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-0.5rem))] w-[calc(100vw-1.5rem)] max-w-full sm:max-w-2xl -translate-x-1/2 translate-y-0 overflow-y-auto overscroll-y-contain border-none bg-transparent p-0 pb-[env(safe-area-inset-bottom,0px)] shadow-none outline-none ring-0 sm:top-1/2 sm:max-h-[92dvh] sm:-translate-y-1/2 sm:w-full"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>
                {language === "pt"
                  ? "Comprovante de pagamento"
                  : "Payment receipt"}
              </DialogTitle>
            </DialogHeader>
            {receiptData && (
              <TransactionReceipt
                transaction={{
                  id: receiptData.transactionId,
                  amount: receiptData.amount,
                  usdtAmount: receiptData.usdtAmount,
                  date: receiptData.date,
                  status: "COMPLETED",
                  type: "PIX",
                }}
                onClose={() => {
                  setShowReceipt(false);
                  setReceiptData(null);
                }}
                language={language}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog for Deletion */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="bg-card border-destructive/50 text-foreground max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Confirmação Final
              </DialogTitle>
              <DialogDescription className="text-foreground/80 pt-2 font-semibold">
                Você tem certeza absoluta? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                Sua conta será permanentemente removida de nossos servidores, incluindo todo o histórico de transações e saldos.
              </p>
              <div className="flex gap-3 mt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
