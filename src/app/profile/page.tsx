"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import NavbarNew from "@/components/ui/navbar-new";
import Breadcrumb from "@/components/ui/breadcrumb";
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
  const router = useRouter();
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
        title: "Error",
        description: "Failed to load profile information",
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
          title: "Profile Updated",
          description: "Your profile has been updated successfully",
        });
        setEditing(false);
        fetchUserProfile();
      } else {
        throw new Error("Failed to update profile");
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
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
          title: "Document Uploaded",
          description: "Your document has been uploaded successfully",
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
        title: "Upload Failed",
        description: "Failed to upload document",
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
      <div className="min-h-screen bg-background text-foreground">
        <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavbarNew isLoggingOut={false} handleLogout={() => {}} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Profile" },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile Management</h1>
          <p className="text-muted-foreground">
            Manage your personal information and KYC documents
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  {editing ? (
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      {userProfile?.name || "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
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
                  <Label htmlFor="phone">Phone</Label>
                  {editing ? (
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
                        {userProfile?.phone || "Not provided"}
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
                  <Label htmlFor="cpf">CPF</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {userProfile?.cpf || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button onClick={handleSave} size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleEdit} size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Account Approval</span>
                  {getStatusBadge(userProfile?.approvalStatus || "PENDING")}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">KYC Status</span>
                  {getStatusBadge(userProfile?.kycStatus || "PENDING")}
                </div>

                {userProfile?.kycRejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      KYC Rejection Reason:
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {userProfile.kycRejectionReason}
                    </p>
                  </div>
                )}

                {userProfile?.kycSubmittedAt && (
                  <div className="text-sm text-muted-foreground">
                    <p>
                      <strong>Submitted:</strong>{" "}
                      {new Date(
                        userProfile.kycSubmittedAt
                      ).toLocaleDateString()}
                    </p>
                    {userProfile.kycReviewedAt && (
                      <p>
                        <strong>Reviewed:</strong>{" "}
                        {new Date(
                          userProfile.kycReviewedAt
                        ).toLocaleDateString()}
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
              KYC Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Document Front */}
              <div className="space-y-3">
                <Label>Document Front</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {kycDocuments?.documentFront ? (
                    <div className="space-y-2">
                      <img
                        src={kycDocuments.documentFront}
                        alt="Document Front"
                        className="w-full h-32 object-cover rounded"
                      />
                      <p className="text-sm text-green-600">Uploaded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">
                        No document uploaded
                      </p>
                    </div>
                  )}
                </div>
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
                  Upload Front
                </Button>
              </div>

              {/* Document Back */}
              <div className="space-y-3">
                <Label>Document Back</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {kycDocuments?.documentBack ? (
                    <div className="space-y-2">
                      <img
                        src={kycDocuments.documentBack}
                        alt="Document Back"
                        className="w-full h-32 object-cover rounded"
                      />
                      <p className="text-sm text-green-600">Uploaded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">
                        No document uploaded
                      </p>
                    </div>
                  )}
                </div>
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
                  Upload Back
                </Button>
              </div>

              {/* Selfie */}
              <div className="space-y-3">
                <Label>Selfie with Document</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {kycDocuments?.documentSelfie ? (
                    <div className="space-y-2">
                      <img
                        src={kycDocuments.documentSelfie}
                        alt="Document Selfie"
                        className="w-full h-32 object-cover rounded"
                      />
                      <p className="text-sm text-green-600">Uploaded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">
                        No selfie uploaded
                      </p>
                    </div>
                  )}
                </div>
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
                  Upload Selfie
                </Button>
              </div>
            </div>

            {/* File Preview and Upload */}
            {selectedFile && (
              <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">
                    Preview: {selectedFile.type.toUpperCase()} Document
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
                    alt="Preview"
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
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
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
