"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import NavbarNew from "@/components/ui/navbar-new";
import Breadcrumb from "@/components/ui/breadcrumb";
import { useLanguage } from "@/contexts/LanguageContext";
import { getKycImageSrc } from "@/lib/kyc-image-src";
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
  MessageCircle,
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
}

interface KYCDocuments {
  documentFront: string | null;
  documentBack: string | null;
  documentSelfie: string | null;
}

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [kycDocuments, setKycDocuments] = useState<KYCDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
  });
  const [selectedFile, setSelectedFile] = useState<{
    type: "front" | "back" | "selfie";
    file: File;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { toast } = useToast();
  const { t, language } = useLanguage();

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      // Call logout API to clear session
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Clear local storage
      localStorage.removeItem("auth-session");
      localStorage.removeItem("user");
      sessionStorage.clear();

      // Force redirect to home page using window.location for reliability
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API fails, clear local storage and redirect
      localStorage.removeItem("auth-session");
      localStorage.removeItem("user");
      sessionStorage.clear();
      // Force redirect using window.location
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  // Fetch all data in parallel for faster loading
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUserProfile(), fetchKycDocuments()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Auto-enable editing mode when user is PENDING
  useEffect(() => {
    if (userProfile) {
      const isPendingUser =
        userProfile.approvalStatus === "PENDING" ||
        userProfile.kycStatus === "PENDING";
      console.log("Profile Status Check:", {
        approvalStatus: userProfile.approvalStatus,
        kycStatus: userProfile.kycStatus,
        isPendingUser,
        currentEditing: editing,
      });
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
  }, [userProfile, editing]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/user/status");
      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        const isPendingUser =
          user.approvalStatus === "PENDING" || user.kycStatus === "PENDING";

        setUserProfile(user);
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
    } finally {
      setLoading(false);
    }
  };

  const fetchKycDocuments = async () => {
    try {
      const response = await fetch("/api/user/kyc-documents");
      if (response.ok) {
        const data = await response.json();
        setKycDocuments(data.documents);
      }
    } catch (error) {
      console.error("Error fetching KYC documents:", error);
    }
  };

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
    setSelectedFile({ type, file });
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile.file);
      formData.append("type", selectedFile.type);

      const response = await fetch("/api/user/upload-kyc-document", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast({
          title: t("documentUploaded"),
          description: t("documentUploadedSuccess"),
        });
        setSelectedFile(null);
        setPreviewUrl(null);
        fetchKycDocuments();
      } else {
        throw new Error("Failed to upload document");
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("uploadFailed"),
        description: t("failedToUpload"),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>{t("loadingProfile")}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
      <div className="container mx-auto px-4 py-6">
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
                  <span className="text-sm font-medium">{t("kycStatus")}</span>
                  {getStatusBadge(userProfile?.kycStatus || "PENDING")}
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
                  {kycDocuments?.documentFront ? (
                    isApproved ? (
                      <div className="space-y-2 py-4">
                        <CheckCircle className="w-12 h-12 mx-auto text-primary" />
                        <p className="text-sm font-medium text-primary">
                          {t("approved")}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <img
                          src={getKycImageSrc(kycDocuments.documentFront)}
                          alt={t("documentFront")}
                          className="w-full h-28 object-cover rounded-lg"
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
                  {kycDocuments?.documentBack ? (
                    isApproved ? (
                      <div className="space-y-2 py-4">
                        <CheckCircle className="w-12 h-12 mx-auto text-primary" />
                        <p className="text-sm font-medium text-primary">
                          {t("approved")}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <img
                          src={getKycImageSrc(kycDocuments.documentBack)}
                          alt={t("documentBack")}
                          className="w-full h-28 object-cover rounded-lg"
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
                  {kycDocuments?.documentSelfie ? (
                    isApproved ? (
                      <div className="space-y-2 py-4">
                        <CheckCircle className="w-12 h-12 mx-auto text-primary" />
                        <p className="text-sm font-medium text-primary">
                          {t("approved")}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <img
                          src={getKycImageSrc(kycDocuments.documentSelfie)}
                          alt={t("selfieWithDocument")}
                          className="w-full h-28 object-cover rounded-lg"
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

            {/* Preview & confirm upload */}
            {selectedFile && !isApproved && (
              <div className="mt-6 p-5 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-foreground">
                    {t("preview")} —{" "}
                    {selectedFile.type === "front"
                      ? t("documentFront")
                      : selectedFile.type === "back"
                      ? t("documentBack")
                      : t("selfieWithDocument")}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt={t("preview")}
                    className="w-full max-w-sm h-44 object-contain rounded-lg mb-4 bg-background/50"
                  />
                )}
                <Button
                  onClick={handleFileUpload}
                  disabled={uploading}
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
                      {t("uploadDocument")}
                    </>
                  )}
                </Button>
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

        {/* Contact Support */}
        <Card id="support" className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {t("contactSupport")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("contactSupportDescription")}
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <a
              href={`https://wa.me/${
                process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5511984284867"
              }`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 border border-[#25D366]/40 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">{t("contactViaWhatsApp")}</span>
              <span className="text-sm opacity-90">+55 11 98428-4867</span>
            </a>
            <a
              href={`mailto:${
                process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
                "suporte@bsmarket.com.br"
              }`}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span className="font-medium">{t("contactViaEmail")}</span>
              <span className="text-sm opacity-90 truncate max-w-[200px]">
                {process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
                  "suporte@bsmarket.com.br"}
              </span>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
