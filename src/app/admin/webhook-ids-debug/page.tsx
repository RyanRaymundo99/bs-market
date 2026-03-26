"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Eye, AlertCircle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WebhookAnalysis {
  webhookId: string;
  eventType: string;
  createdAt: string;
  processed: boolean;
  error: string | null;
  transactionId: string | null;
  externalId: string | null;
  payload: Record<string, unknown>;
  matchingOrder: {
    id: string;
    externalOrderId: string | null;
    status: string;
  } | null;
  matchingDeposit: {
    id: string;
    externalId: string;
  } | null;
}

interface OrderAnalysis {
  orderId: string;
  externalOrderId: string | null;
  status: string;
  userId: string;
  amount: string;
  createdAt: string;
  relatedDeposit: {
    externalId: string;
    status: string;
  } | null;
  matchingWebhooks: Array<{
    id: string;
    eventType: string;
  }>;
}

interface AnalysisSummary {
  totalWebhooks: number;
  processedWebhooks: number;
  failedWebhooks: number;
  unmatchedWebhooks: number;
  pendingOrders: number;
  unmatchedOrders: number;
  completedOrders: number;
}

export default function WebhookIdsDebugPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [webhookAnalysis, setWebhookAnalysis] = useState<WebhookAnalysis[]>([]);
  const [orderAnalysis, setOrderAnalysis] = useState<OrderAnalysis[]>([]);
  const [selectedPayload, setSelectedPayload] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [showPayload, setShowPayload] = useState(false);
  const [filter, setFilter] = useState<"all" | "unmatched" | "matched">("all");

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug/webhook-analysis");
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setWebhookAnalysis(data.webhookAnalysis || []);
        setOrderAnalysis(data.orderAnalysis || []);
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.error || "Falha ao carregar análise",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching analysis:", error);
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalysis();
    // Refresh every 15 seconds
    const interval = setInterval(fetchAnalysis, 15000);
    return () => clearInterval(interval);
  }, [fetchAnalysis]);

  const filteredWebhooks = webhookAnalysis.filter((w) => {
    if (filter === "unmatched") return !w.matchingOrder;
    if (filter === "matched") return !!w.matchingOrder;
    return true;
  });

  const filteredOrders = orderAnalysis.filter((o) => {
    if (filter === "unmatched")
      return o.matchingWebhooks.length === 0 && o.status === "PENDING";
    if (filter === "matched") return o.matchingWebhooks.length > 0;
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          🔍 Debug: IDs e Pagamentos dos Webhooks
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              try {
                const response = await fetch(
                  "/api/debug/check-webhook-reception"
                );
                const data = await response.json();
                toast({
                  title: data.success ? "✅ Webhook Status" : "❌ Erro",
                  description: data.success
                    ? `Total webhooks: ${data.webhookReception.totalWebhooks}. Endpoint: ${data.webhookEndpoint}`
                    : data.error,
                  variant: data.success ? "default" : "destructive",
                });
              } catch {
                toast({
                  title: "Erro",
                  description: "Falha ao verificar recepção de webhooks",
                  variant: "destructive",
                });
              }
            }}
            variant="outline"
          >
            🔍 Verificar Recepção
          </Button>
          <Button onClick={fetchAnalysis} disabled={loading}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Webhooks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalWebhooks}</div>
              <div className="text-xs text-muted-foreground">
                {summary.processedWebhooks} processados,{" "}
                {summary.failedWebhooks} com erro
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Webhooks Não Matched</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {summary.unmatchedWebhooks}
              </div>
              <div className="text-xs text-muted-foreground">
                Webhooks sem ordem correspondente
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ordens Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {summary.pendingOrders}
              </div>
              <div className="text-xs text-muted-foreground">
                {summary.unmatchedOrders} sem webhook
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ordens Completas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {summary.completedOrders}
              </div>
              <div className="text-xs text-muted-foreground">
                Pagamentos confirmados
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          Todos
        </Button>
        <Button
          variant={filter === "unmatched" ? "default" : "outline"}
          onClick={() => setFilter("unmatched")}
        >
          Não Matched ({summary?.unmatchedWebhooks || 0})
        </Button>
        <Button
          variant={filter === "matched" ? "default" : "outline"}
          onClick={() => setFilter("matched")}
        >
          Matched
        </Button>
      </div>

      {/* Webhooks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooks Recebidos (IDs e Payloads)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredWebhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum webhook encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>External ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Processado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWebhooks.map((webhook) => (
                    <TableRow key={webhook.webhookId}>
                      <TableCell className="text-xs">
                        {new Date(webhook.createdAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{webhook.eventType}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {webhook.transactionId || (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {webhook.externalId || (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {webhook.error ? (
                          <Badge variant="destructive">Erro</Badge>
                        ) : webhook.processed ? (
                          <Badge className="bg-green-600">Processado</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {webhook.matchingOrder ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-xs">
                              Ordem #{webhook.matchingOrder.id.slice(-8)}
                            </span>
                          </div>
                        ) : webhook.matchingDeposit ? (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                            <span className="text-xs">Depósito encontrado</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-500">
                              Sem match
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{webhook.processed ? "Sim" : "Não"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPayload(webhook.payload);
                            setShowPayload(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ordens (IDs para Comparação)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma ordem encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>External Order ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Webhooks</TableHead>
                    <TableHead>Depósito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.orderId}>
                      <TableCell className="text-xs">
                        {new Date(order.createdAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {order.orderId.slice(-12)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {order.externalOrderId || (
                          <span className="text-red-500">❌ NÃO DEFINIDO</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "COMPLETED"
                              ? "default"
                              : order.status === "PENDING"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        R$ {parseFloat(order.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {order.matchingWebhooks.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-xs">
                              {order.matchingWebhooks.length} webhook(s)
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-500">Nenhum</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.relatedDeposit ? (
                          <div className="text-xs">
                            <div>
                              ID:{" "}
                              {order.relatedDeposit.externalId?.slice(-12) ||
                                "N/A"}
                            </div>
                            <div className="text-muted-foreground">
                              Status: {order.relatedDeposit.status}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Não encontrado
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payload Dialog */}
      <Dialog open={showPayload} onOpenChange={setShowPayload}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payload Completo do Webhook</DialogTitle>
            <DialogDescription>
              Todos os dados enviados pelo provedor de pagamento
            </DialogDescription>
          </DialogHeader>
          <pre className="bg-card p-4 rounded text-xs overflow-x-auto">
            {JSON.stringify(selectedPayload, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
