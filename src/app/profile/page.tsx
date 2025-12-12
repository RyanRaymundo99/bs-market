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
    phone: "",
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

  useEffect(() => {
    fetchUserProfile();
    fetchKycDocuments();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/user/status");
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.user);
        setFormData({
          name: data.user.name || "",
          phone: data.user.phone || "",
        });
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
    setEditing(false);
    setFormData({
      name: userProfile?.name || "",
      phone: userProfile?.phone || "",
    });
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
          title: t("profileUpdated"),
          description: t("profileUpdatedSuccess"),
        });
        setEditing(false);
        fetchUserProfile();
      } else {
        throw new Error("Failed to update profile");
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("failedToUpdateProfile"),
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
  const isApproved = userProfile?.approvalStatus === "APPROVED" && userProfile?.kycStatus === "APPROVED";

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
                  {editing && !isApproved ? (
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
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{userProfile?.email}</span>
                    {userProfile?.emailVerified ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">{t("phone")}</Label>
                  {editing && !isApproved ? (
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
                  <div className="flex items-center gap-2 mt-1">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {userProfile?.cpf || t("notProvided")}
                    </span>
                    {isApproved && userProfile?.cpf && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
              </div>

              {!isApproved && (
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <Button onClick={handleSave} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        {t("save")}
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-2" />
                        {t("cancel")}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleEdit} size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      {t("editProfile")}
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
                  <span className="text-sm font-medium">{t("accountApproval")}</span>
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
                      {new Date(
                        userProfile.kycSubmittedAt
                      ).toLocaleDateString(language === "pt" ? "pt-BR" : "en-US")}
                    </p>
                    {userProfile.kycReviewedAt && (
                      <p>
                        <strong>{t("reviewed")}:</strong>{" "}
                        {new Date(
                          userProfile.kycReviewedAt
                        ).toLocaleDateString(language === "pt" ? "pt-BR" : "en-US")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KYC Documents */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {t("kycDocuments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Document Front */}
              <div className="space-y-3">
                <Label>{t("documentFront")}</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {kycDocuments?.documentFront ? (
                    isApproved ? (
                      <div className="space-y-3 py-8">
                        <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                        <div className="flex items-center justify-center gap-1">
                          <p className="text-sm font-medium text-green-600">Aprovado</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <img
                          src={kycDocuments.documentFront}
                          alt="Frente do Documento"
                          className="w-full h-32 object-cover rounded"
                        />
                        <div className="flex items-center justify-center gap-1">
                          <p className="text-sm text-green-600">{t("uploaded")}</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">
                        {t("noDocumentUploaded")}
                      </p>
                    </div>
                  )}
                </div>
                {!isApproved && (
                  <>
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
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t("uploadFront")}
                    </Button>
                  </>
                )}
              </div>

              {/* Document Back */}
              <div className="space-y-3">
                <Label>{t("documentBack")}</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {kycDocuments?.documentBack ? (
                    isApproved ? (
                      <div className="space-y-3 py-8">
                        <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                        <div className="flex items-center justify-center gap-1">
                          <p className="text-sm font-medium text-green-600">Aprovado</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <img
                          src={kycDocuments.documentBack}
                          alt="Verso do Documento"
                          className="w-full h-32 object-cover rounded"
                        />
                        <div className="flex items-center justify-center gap-1">
                          <p className="text-sm text-green-600">{t("uploaded")}</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">
                        {t("noDocumentUploaded")}
                      </p>
                    </div>
                  )}
                </div>
                {!isApproved && (
                  <>
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
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t("uploadBack")}
                    </Button>
                  </>
                )}
              </div>

              {/* Selfie */}
              <div className="space-y-3">
                <Label>{t("selfieWithDocument")}</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {kycDocuments?.documentSelfie ? (
                    isApproved ? (
                      <div className="space-y-3 py-8">
                        <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                        <div className="flex items-center justify-center gap-1">
                          <p className="text-sm font-medium text-green-600">Aprovado</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <img
                          src={kycDocuments.documentSelfie}
                          alt="Selfie com Documento"
                          className="w-full h-32 object-cover rounded"
                        />
                        <div className="flex items-center justify-center gap-1">
                          <p className="text-sm text-green-600">{t("uploaded")}</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">
                        {t("noSelfieUploaded")}
                      </p>
                    </div>
                  )}
                </div>
                {!isApproved && (
                  <>
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
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t("uploadSelfie")}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* File Preview and Upload */}
            {selectedFile && !isApproved && (
              <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">
                    {t("preview")}: {selectedFile.type === "front" ? t("documentFront") : selectedFile.type === "back" ? t("documentBack") : t("selfieWithDocument")}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt={t("preview")}
                    className="w-full max-w-md h-48 object-cover rounded mb-4"
                  />
                )}
                <Button
                  onClick={handleFileUpload}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
