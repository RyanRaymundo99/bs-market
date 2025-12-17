"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import BackToDashboardButton from "@/components/admin/BackToDashboardButton";
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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export default function AdminUserDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const { id } = await params;
        const response = await fetch(`/api/admin/users/${id}`);
        if (response.ok) {
          const data = await response.json();
          console.log("User details fetched:", {
            hasDocumentFront: !!data.user?.documentFront,
            hasDocumentBack: !!data.user?.documentBack,
            hasDocumentSelfie: !!data.user?.documentSelfie,
            documentFront: data.user?.documentFront,
            documentBack: data.user?.documentBack,
            documentSelfie: data.user?.documentSelfie,
          });
          setUser(data.user);
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load user details",
          });
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
      }
    };

    fetchUserDetails();
  }, [params, toast]);

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
                      {user.phone || "Not provided"}
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
                    CPF
                  </label>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <span className="text-white">
                      {user.cpf || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="w-5 h-5" />
                Account Status
              </CardTitle>
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
                          user.documentFront!,
                          "Document Front",
                          "Document Front"
                        )
                      }
                    >
                      <img
                        src={user.documentFront}
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
                          user.documentBack!,
                          "Document Back",
                          "Document Back"
                        )
                      }
                    >
                      <img
                        src={user.documentBack}
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
                          user.documentSelfie!,
                          "Document Selfie",
                          "Document Selfie"
                        )
                      }
                    >
                      <img
                        src={user.documentSelfie}
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

        {/* Full-size Image Modal */}
        {selectedImage && (
          <Dialog
            open={!!selectedImage}
            onOpenChange={() => setSelectedImage(null)}
          >
            <DialogContent className="max-w-7xl max-h-[95vh] p-0 bg-gray-900 border-gray-700">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-white text-xl">
                  {selectedImage.title}
                </DialogTitle>
              </DialogHeader>
              <div className="p-6 pt-4">
                <div className="relative">
                  <img
                    src={selectedImage.src}
                    alt={selectedImage.alt}
                    className="w-full h-auto max-h-[80vh] object-contain rounded-lg border border-gray-600"
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
