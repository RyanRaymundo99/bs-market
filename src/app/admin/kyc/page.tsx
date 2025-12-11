"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  User,
  AlertCircle,
  Shield,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ZoomIn } from "lucide-react";
import ImageAnalysisPanel from "@/components/admin/ImageAnalysisPanel";
import NotificationBell from "@/components/admin/NotificationBell";
import BackToDashboardButton from "@/components/admin/BackToDashboardButton";

interface KYCUser {
  id: string;
  name: string;
  email: string;
  cpf: string;
  documentType?: string | null;
  documentNumber?: string | null;
  documentFront?: string | null;
  documentBack?: string | null;
  documentSelfie?: string | null;
  kycStatus: "PENDING" | "APPROVED" | "REJECTED";
  kycSubmittedAt?: string | null;
  kycReviewedAt?: string | null;
  kycRejectionReason?: string | null;
  createdAt: string;
}

const AdminKYCPage = () => {
  const [users, setUsers] = useState<KYCUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<KYCUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [, setSelectedUser] = useState<KYCUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);

  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/kyc");
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users);
      } else {
        throw new Error(data.error || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao buscar usuários",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const filterUsers = useCallback(() => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.cpf.includes(searchTerm)
      );
    }

    // Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((user) => user.kycStatus === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, statusFilter]);

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const handleApprove = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/kyc/${userId}/approve`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
        title: "Sucesso",
        description: "KYC do usuário aprovado com sucesso",
        });
        fetchUsers();
        setSelectedUser(null);
      } else {
        throw new Error(data.error || "Failed to approve KYC");
      }
    } catch (error) {
      console.error("Error approving KYC:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao aprovar KYC",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Motivo da rejeição obrigatório",
        description: "Por favor, forneça um motivo para a rejeição",
      });
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/kyc/${userId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
        title: "Sucesso",
        description: "KYC do usuário rejeitado com sucesso",
        });
        fetchUsers();
        setSelectedUser(null);
        setRejectionReason("");
      } else {
        throw new Error(data.error || "Failed to reject KYC");
      }
    } catch (error) {
      console.error("Error rejecting KYC:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao rejeitar KYC",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetToPending = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/kyc/${userId}/reset`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
        title: "Sucesso",
        description: "Status KYC redefinido para pendente para nova revisão",
        });
        fetchUsers();
        setSelectedUser(null);
      } else {
        throw new Error(data.error || "Failed to reset KYC status");
      }
    } catch (error) {
      console.error("Error resetting KYC:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao redefinir status KYC",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-yellow-600 text-white">
            Pendente
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="secondary" className="bg-green-600 text-white">
            Aprovado
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="secondary" className="bg-red-600 text-white">
            Rejeitado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-600 text-white">
            Desconhecido
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleImageClick = (src: string, alt: string, title: string) => {
    setSelectedImage({ src, alt, title });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back to Dashboard Button */}
        <BackToDashboardButton className="mb-6" />
        
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Verificação KYC
              </h1>
              <p className="text-gray-300">
                Revise e verifique documentos de identidade dos usuários
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationBell className="text-white hover:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome, email ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os Status</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="APPROVED">Aprovado</SelectItem>
                    <SelectItem value="REJECTED">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={statusFilter === "ALL" ? "default" : "outline"}
            onClick={() => handleStatusFilter("ALL")}
            size="sm"
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            Todos os Status ({users.length})
          </Button>
          <Button
            variant={statusFilter === "PENDING" ? "default" : "outline"}
            onClick={() => handleStatusFilter("PENDING")}
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Pendente ({users.filter((u) => u.kycStatus === "PENDING").length})
          </Button>
          <Button
            variant={statusFilter === "APPROVED" ? "default" : "outline"}
            onClick={() => handleStatusFilter("APPROVED")}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Aprovado ({users.filter((u) => u.kycStatus === "APPROVED").length})
          </Button>
          <Button
            variant={statusFilter === "REJECTED" ? "default" : "outline"}
            onClick={() => handleStatusFilter("REJECTED")}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Rejeitado ({users.filter((u) => u.kycStatus === "REJECTED").length})
          </Button>
        </div>

        {/* Users List */}
        <div className="grid gap-4">
          {filteredUsers.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Nenhum usuário encontrado
                </h3>
                <p className="text-gray-300">
                  {searchTerm || statusFilter !== "ALL"
                    ? "Tente ajustar sua busca ou critérios de filtro"
                    : "Nenhum usuário enviou documentos KYC ainda"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((user) => (
              <Card
                key={user.id}
                className="hover:shadow-md transition-shadow bg-gray-900 border-gray-800"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{user.name}</h3>
                        <p className="text-sm text-gray-300">{user.email}</p>
                        <p className="text-xs text-gray-400">CPF: {user.cpf}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="mb-1">
                          {getStatusBadge(user.kycStatus)}
                        </div>
                        <p className="text-xs text-gray-400">
                          Enviado: {user.kycSubmittedAt ? formatDate(user.kycSubmittedAt) : 'N/A'}
                        </p>
                        {user.kycReviewedAt && (
                          <p className="text-xs text-gray-400">
                            Revisado: {formatDate(user.kycReviewedAt)}
                          </p>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                              className="border-gray-600 text-white hover:bg-gray-700"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Revisar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700">
                            <DialogHeader>
                              <DialogTitle className="text-white">
                                Revisão de Documentos KYC - {user.name}
                              </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-6">
                              {/* User Info */}
                              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-700 rounded-lg">
                                <div>
                                  <label className="text-sm font-medium text-gray-300">
                                    Nome
                                  </label>
                                  <p className="text-sm text-white">
                                    {user.name}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">
                                    Email
                                  </label>
                                  <p className="text-sm text-white">
                                    {user.email}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">
                                    CPF
                                  </label>
                                  <p className="text-sm text-white">
                                    {user.cpf}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">
                                    Tipo de Documento
                                  </label>
                                  <p className="text-sm text-white">
                                    {user.documentType || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">
                                    Número do Documento
                                  </label>
                                  <p className="text-sm text-white">
                                    {user.documentNumber || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">
                                    Status
                                  </label>
                                  <div className="mt-1">
                                    {getStatusBadge(user.kycStatus)}
                                  </div>
                                </div>
                              </div>

                              {/* Documents */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                                    Frente do Documento
                                    <ZoomIn className="w-4 h-4 text-gray-400" />
                                  </h4>
                                  {user.documentFront ? (
                                    <div
                                      className="relative cursor-pointer group"
                                      onClick={() =>
                                        handleImageClick(
                                          user.documentFront!,
                                          "Frente do Documento",
                                          "Frente do Documento"
                                        )
                                      }
                                    >
                                      <img
                                        src={user.documentFront}
                                        alt="Frente do Documento"
                                        className="w-full h-48 object-cover rounded-lg border border-gray-600 group-hover:border-blue-500 transition-colors"
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-full h-48 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center">
                                      <p className="text-gray-400">Nenhum documento enviado</p>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                                    Verso do Documento
                                    <ZoomIn className="w-4 h-4 text-gray-400" />
                                  </h4>
                                  {user.documentBack ? (
                                    <div
                                      className="relative cursor-pointer group"
                                      onClick={() =>
                                        handleImageClick(
                                          user.documentBack!,
                                          "Verso do Documento",
                                          "Verso do Documento"
                                        )
                                      }
                                    >
                                      <img
                                        src={user.documentBack}
                                        alt="Verso do Documento"
                                        className="w-full h-48 object-cover rounded-lg border border-gray-600 group-hover:border-blue-500 transition-colors"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </div>
                                  ) : (
                                    <div className="w-full h-48 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center">
                                      <p className="text-gray-400">Nenhum documento enviado</p>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                                    Selfie com Documento
                                    <ZoomIn className="w-4 h-4 text-gray-400" />
                                  </h4>
                                  {user.documentSelfie ? (
                                    <div
                                      className="relative cursor-pointer group"
                                      onClick={() =>
                                        handleImageClick(
                                          user.documentSelfie!,
                                          "Selfie com Documento",
                                          "Selfie com Documento"
                                        )
                                      }
                                    >
                                      <img
                                        src={user.documentSelfie}
                                      alt="Selfie com Documento"
                                      className="w-full h-48 object-cover rounded-lg border border-gray-600 group-hover:border-blue-500 transition-colors"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </div>
                                  ) : (
                                    <div className="w-full h-48 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center">
                                      <p className="text-gray-400">Nenhum documento enviado</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Image Analysis */}
                              <div className="mt-6">
                                <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                                  <Shield className="w-5 h-5" />
                                  Análise de Detecção de Fraude
                                </h4>
                                <ImageAnalysisPanel
                                  documentFront={user.documentFront || ''}
                                  documentBack={user.documentBack || ''}
                                  selfie={user.documentSelfie || ''}
                                  onAnalysisComplete={(result) => {
                                    console.log("Analysis complete:", result);
                                  }}
                                />
                              </div>

                              {/* Actions */}
                              <div className="flex space-x-4 pt-4 border-t border-gray-600">
                                {user.kycStatus === "PENDING" && (
                                  <>
                                    <Button
                                      onClick={() => handleApprove(user.id)}
                                      disabled={actionLoading === user.id}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Aprovar
                                    </Button>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="destructive">
                                          <XCircle className="w-4 h-4 mr-2" />
                                          Reject
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="bg-gray-800 border-gray-700">
                                        <DialogHeader>
                                          <DialogTitle className="text-white">
                                            Rejeitar Verificação KYC
                                          </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <label className="text-sm font-medium text-gray-300">
                                              Motivo da Rejeição
                                            </label>
                                            <textarea
                                              value={rejectionReason}
                                              onChange={(e) =>
                                                setRejectionReason(
                                                  e.target.value
                                                )
                                              }
                                              placeholder="Por favor, forneça um motivo para a rejeição..."
                                              className="w-full mt-1 p-3 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder:text-gray-400"
                                              rows={4}
                                            />
                                          </div>
                                          <div className="flex justify-end space-x-2">
                                            <Button
                                              variant="outline"
                                              onClick={() =>
                                                setRejectionReason("")
                                              }
                                              className="border-gray-600 text-white hover:bg-gray-700"
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              onClick={() =>
                                                handleReject(user.id)
                                              }
                                              disabled={
                                                actionLoading === user.id ||
                                                !rejectionReason.trim()
                                              }
                                            >
                                              Reject KYC
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </>
                                )}

                                {/* Recheck button for approved/rejected users */}
                                {(user.kycStatus === "APPROVED" ||
                                  user.kycStatus === "REJECTED") && (
                                  <div className="flex space-x-2">
                                    <Button
                                      onClick={() =>
                                        handleResetToPending(user.id)
                                      }
                                      disabled={actionLoading === user.id}
                                      className="bg-orange-600 hover:bg-orange-700"
                                    >
                                      <Clock className="w-4 h-4 mr-2" />
                                      Redefinir para Pendente
                                    </Button>
                                    <Button
                                      onClick={() => handleApprove(user.id)}
                                      disabled={actionLoading === user.id}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Reaprovar
                                    </Button>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="destructive">
                                          <XCircle className="w-4 h-4 mr-2" />
                                          Reject
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="bg-gray-800 border-gray-700">
                                        <DialogHeader>
                                          <DialogTitle className="text-white">
                                            Rejeitar Verificação KYC
                                          </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <label className="text-sm font-medium text-gray-300">
                                              Motivo da Rejeição
                                            </label>
                                            <textarea
                                              value={rejectionReason}
                                              onChange={(e) =>
                                                setRejectionReason(
                                                  e.target.value
                                                )
                                              }
                                              placeholder="Por favor, forneça um motivo para a rejeição..."
                                              className="w-full mt-1 p-3 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder:text-gray-400"
                                              rows={4}
                                            />
                                          </div>
                                          <div className="flex justify-end space-x-2">
                                            <Button
                                              variant="outline"
                                              onClick={() =>
                                                setRejectionReason("")
                                              }
                                              className="border-gray-600 text-white hover:bg-gray-700"
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              onClick={() =>
                                                handleReject(user.id)
                                              }
                                              disabled={
                                                actionLoading === user.id ||
                                                !rejectionReason.trim()
                                              }
                                            >
                                              Reject KYC
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                )}
                              </div>

                              {user.kycStatus === "REJECTED" &&
                                user.kycRejectionReason && (
                                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <h4 className="font-medium text-red-900 mb-2">
                                      Motivo da Rejeição
                                    </h4>
                                    <p className="text-sm text-red-700">
                                      {user.kycRejectionReason}
                                    </p>
                                  </div>
                                )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

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
  );
};

export default AdminKYCPage;
