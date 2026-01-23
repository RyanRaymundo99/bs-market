"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, AlertCircle, X, Upload } from "lucide-react";

interface KYCBannerProps {
  status: "PENDING" | "APPROVED" | "REJECTED";
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export const KYCBanner: React.FC<KYCBannerProps> = ({
  status,
  onDismiss,
  showDismiss = true,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case "PENDING":
        return {
          icon: <Clock className="w-5 h-5" />,
          title: "Verificação KYC Pendente",
          message:
            "Sua verificação KYC está pendente. Complete o upload dos documentos para habilitar depósitos e saques.",
          badge: (
            <Badge
              variant="secondary"
              className="bg-yellow-100 text-yellow-800 border-yellow-200"
            >
              <Clock className="w-3 h-3 mr-1" />
              Pendente
            </Badge>
          ),
          bgColor: "bg-yellow-50 border-yellow-200",
          textColor: "text-yellow-800",
          showAction: true,
        };
      case "APPROVED":
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          title: "Conta Aprovada",
          message:
            "Parabéns! Sua conta foi aprovada e agora você pode acessar todos os recursos.",
          badge: (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-800 border-green-200"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Aprovado
            </Badge>
          ),
          bgColor: "bg-green-50 border-green-200",
          textColor: "text-green-800",
          showAction: false,
        };
      case "REJECTED":
        return {
          icon: <XCircle className="w-5 h-5" />,
          title: "Conta Rejeitada",
          message:
            "A verificação da sua conta foi rejeitada. Por favor, entre em contato com o suporte para mais informações.",
          badge: (
            <Badge
              variant="secondary"
              className="bg-red-100 text-red-800 border-red-200"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Rejeitado
            </Badge>
          ),
          bgColor: "bg-red-50 border-red-200",
          textColor: "text-red-800",
          showAction: false,
        };
      default:
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          title: "Status Desconhecido",
          message: "O status da sua conta é desconhecido. Por favor, entre em contato com o suporte.",
          badge: (
            <Badge
              variant="secondary"
              className="bg-gray-100 text-gray-800 border-gray-200"
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              Desconhecido
            </Badge>
          ),
          bgColor: "bg-gray-50 border-gray-200",
          textColor: "text-gray-800",
          showAction: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Card className={`mb-6 ${config.bgColor} border-2`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`${config.textColor} mt-1`}>{config.icon}</div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className={`font-semibold ${config.textColor}`}>
                  {config.title}
                </h3>
                {config.badge}
              </div>
              <p className={`text-sm ${config.textColor} opacity-90 mb-3`}>
                {config.message}
              </p>
              {config.showAction && status === "PENDING" && (
                <Link href="/profile">
                  <Button
                    size="sm"
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Documentos KYC
                  </Button>
                </Link>
              )}
            </div>
          </div>
          {showDismiss && onDismiss && status !== "PENDING" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className={`${config.textColor} hover:bg-white/50`}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default KYCBanner;
