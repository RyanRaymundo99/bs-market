"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Eye, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WebhookEvent {
  id: string;
  eventType: string;
  source: string;
  transactionId: string | null;
  externalId: string | null;
  status: string | null;
  orderId: string | null;
  processed: boolean;
  error: string | null;
  signatureValid: boolean | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  payload: any;
}

export default function WebhookLogsPage() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEvent | null>(null);
  const [showPayload, setShowPayload] = useState(false);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug/webhooks?limit=100");
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks || []);
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.error || "Falha ao carregar webhooks",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
    // Refresh every 10 seconds
    const interval = setInterval(fetchWebhooks, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (webhook: WebhookEvent) => {
    if (webhook.error) {
      return <Badge variant="destructive">Erro</Badge>;
    }
    if (webhook.processed) {
      return <Badge variant="default" className="bg-green-600">Processado</Badge>;
    }
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const getEventTypeBadge = (eventType: string) => {
    if (eventType.includes("completed")) {
      return <Badge className="bg-green-600">{eventType}</Badge>;
    }
    if (eventType.includes("failed")) {
      return <Badge variant="destructive">{eventType}</Badge>;
    }
    if (eventType.includes("pending") || eventType.includes("created")) {
      return <Badge className="bg-yellow-600">{eventType}</Badge>;
    }
    return <Badge variant="outline">{eventType}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (loading && webhooks.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Webhook Logs
          </h1>
          <p className="text-gray-400">
            Monitoramento de webhooks recebidos do NutzPay
          </p>
        </div>
        <Button
          onClick={fetchWebhooks}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">
            Nenhum webhook recebido ainda. Os webhooks aparecerão aqui quando forem recebidos.
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="text-gray-300">Data/Hora</TableHead>
                <TableHead className="text-gray-300">Evento</TableHead>
                <TableHead className="text-gray-300">Transaction ID</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Processado</TableHead>
                <TableHead className="text-gray-300">Assinatura</TableHead>
                <TableHead className="text-gray-300">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => (
                <TableRow key={webhook.id} className="border-gray-800">
                  <TableCell className="text-gray-300 text-sm">
                    {formatDate(webhook.createdAt)}
                  </TableCell>
                  <TableCell>
                    {getEventTypeBadge(webhook.eventType)}
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm font-mono">
                    {webhook.transactionId || webhook.externalId || "-"}
                  </TableCell>
                  <TableCell>
                    {webhook.status ? (
                      <Badge variant="outline">{webhook.status}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(webhook)}</TableCell>
                  <TableCell>
                    {webhook.signatureValid === null ? (
                      <Badge variant="outline">N/A</Badge>
                    ) : webhook.signatureValid ? (
                      <Badge className="bg-green-600">Válida</Badge>
                    ) : (
                      <Badge variant="destructive">Inválida</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedWebhook(webhook);
                        setShowPayload(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Payload Viewer Dialog */}
      <Dialog open={showPayload} onOpenChange={setShowPayload}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Webhook Payload
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Detalhes completos do webhook recebido
            </DialogDescription>
          </DialogHeader>
          {selectedWebhook && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">ID do Evento</p>
                  <p className="text-white font-mono text-sm">{selectedWebhook.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Tipo de Evento</p>
                  <p className="text-white">{selectedWebhook.eventType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Transaction ID</p>
                  <p className="text-white font-mono text-sm">
                    {selectedWebhook.transactionId || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">External ID</p>
                  <p className="text-white font-mono text-sm">
                    {selectedWebhook.externalId || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Order ID</p>
                  <p className="text-white font-mono text-sm">
                    {selectedWebhook.orderId || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">IP Address</p>
                  <p className="text-white text-sm">{selectedWebhook.ipAddress || "-"}</p>
                </div>
                {selectedWebhook.error && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-400 mb-1">Erro</p>
                    <p className="text-red-400 text-sm">{selectedWebhook.error}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Payload Completo</p>
                <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(selectedWebhook.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



