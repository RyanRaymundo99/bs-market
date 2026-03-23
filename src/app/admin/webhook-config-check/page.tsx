"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";

interface WebhookConfig {
  webhookEndpoint: string;
  webhookAccessible: boolean;
  webhookResponse: unknown;
  reception: {
    success?: boolean;
    error?: string;
    webhookReception?: {
      totalWebhooks: number;
      latestWebhook?: {
        eventType: string;
        transactionId: string | null;
        externalId: string | null;
        status: string;
        processed: boolean;
        createdAt: string;
      };
    };
    recentOrders?: Array<{
      id: string;
      status: string;
      externalOrderId: string | null;
      createdAt: string;
    }>;
  };
  expectedUrl: string;
}

export default function WebhookConfigCheckPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<WebhookConfig | null>(null);

  const checkConfig = async () => {
    setLoading(true);
    try {
      // Check webhook endpoint accessibility
      const webhookUrl = `${
        process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      }/api/webhooks/mercadopago`;
      const webhookResponse = await fetch(webhookUrl, { method: "GET" });
      const webhookData = await webhookResponse.json();

      // Check webhook reception
      const receptionResponse = await fetch(
        "/api/debug/check-webhook-reception"
      );
      const receptionData = await receptionResponse.json();

      setConfig({
        webhookEndpoint: webhookUrl,
        webhookAccessible: webhookResponse.ok,
        webhookResponse: webhookData,
        reception: receptionData,
        expectedUrl: `${
          process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br"
        }/api/webhooks/mercadopago`,
      });
    } catch (error) {
      console.error("Config check error:", error);
      toast({
        title: "Erro",
        description: "Falha ao verificar configuração",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConfig();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">
          🔧 Verificação de Configuração de Webhook
        </h1>
        <Button onClick={checkConfig} disabled={loading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Verificar
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Verificando...</div>
      ) : config ? (
        <div className="space-y-4">
          {/* Webhook Endpoint Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status do Endpoint de Webhook</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {config.webhookAccessible ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-500">Endpoint acessível</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-500">Endpoint não acessível</span>
                  </>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">URL do Webhook:</p>
                <code className="bg-muted p-2 rounded text-sm text-foreground block">
                  {config.webhookEndpoint}
                </code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  URL Esperada (para configurar no provedor de pagamento):
                </p>
                <code className="bg-muted p-2 rounded text-sm text-foreground block">
                  {config.expectedUrl}
                </code>
              </div>
              {config.webhookResponse != null ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Resposta do Endpoint:
                  </p>
                  <pre className="bg-muted p-2 rounded text-xs text-foreground overflow-x-auto">
                    {JSON.stringify(config.webhookResponse, null, 2)}
                  </pre>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Webhook Reception Status */}
          <Card>
            <CardHeader>
              <CardTitle>Recepção de Webhooks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.reception?.success ? (
                <>
                  <div className="flex items-center gap-2">
                    {(config.reception.webhookReception?.totalWebhooks ?? 0) >
                    0 ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-500">
                          {config.reception.webhookReception?.totalWebhooks ??
                            0}{" "}
                          webhook(s) recebido(s)
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                        <span className="text-yellow-500">
                          Nenhum webhook recebido ainda
                        </span>
                      </>
                    )}
                  </div>
                  {config.reception.webhookReception?.latestWebhook && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Último Webhook Recebido:
                      </p>
                      <div className="bg-muted p-3 rounded space-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Evento:</span>{" "}
                          <span className="text-foreground">
                            {
                              config.reception.webhookReception.latestWebhook
                                .eventType
                            }
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Transaction ID:</span>{" "}
                          <span className="text-foreground font-mono">
                            {config.reception.webhookReception.latestWebhook
                              .transactionId || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">External ID:</span>{" "}
                          <span className="text-foreground font-mono">
                            {config.reception.webhookReception.latestWebhook
                              .externalId || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>{" "}
                          <Badge>
                            {
                              config.reception.webhookReception.latestWebhook
                                .status
                            }
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Processado:</span>{" "}
                          {config.reception.webhookReception.latestWebhook
                            .processed ? (
                            <Badge className="bg-green-600 font-bold">Sim</Badge>
                          ) : (
                            <Badge className="bg-red-600 font-bold">Não</Badge>
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Data:</span>{" "}
                          <span className="text-foreground">
                            {new Date(
                              config.reception.webhookReception.latestWebhook.createdAt
                            ).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-red-500">
                  Erro ao verificar recepção: {config.reception?.error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Instruções de Configuração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  1. Configure o Webhook no Dashboard do Provedor de Pagamento:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Acesse o dashboard do Provedor de Pagamento</li>
                  <li>Vá para Configurações → Webhooks</li>
                  <li>Adicione a URL do webhook:</li>
                </ol>
                <code className="bg-muted p-2 rounded text-sm text-foreground block mt-2">
                  {config.expectedUrl}
                </code>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  2. Eventos a Configurar:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>transaction.created</li>
                  <li>transaction.completed</li>
                  <li>transaction.failed</li>
                  <li>transaction.pending</li>
                  <li>payment.created</li>
                  <li>payment.completed</li>
                  <li>payment.failed</li>
                  <li>payment.pending</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  3. Verifique o Webhook Secret:
                </p>
                <p className="text-sm text-muted-foreground">
                  O webhook secret deve estar configurado na variável de
                  ambiente{" "}
                  <code className="bg-muted px-1 rounded">
                    PAYMENT_WEBHOOK_SECRET
                  </code>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  4. Teste o Webhook:
                </p>
                <p className="text-sm text-muted-foreground">
                  Use a página de teste de webhook ou faça um pagamento de teste
                  para verificar se os webhooks estão sendo recebidos.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders for Reference */}
          {config.reception?.recentOrders &&
            config.reception.recentOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Ordens Recentes (para referência)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {config.reception.recentOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="bg-muted p-3 rounded text-sm"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-muted-foreground">Order ID:</span>{" "}
                            <span className="text-foreground font-mono">
                              {order.id.slice(-12)}
                            </span>
                          </div>
                          <Badge className={
                            order.status === "COMPLETED"
                              ? "bg-green-600"
                              : "bg-yellow-600"
                          }>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="mt-1">
                          <span className="text-muted-foreground">
                            External Order ID:
                          </span>{" "}
                          <span className="text-foreground font-mono">
                            {order.externalOrderId || "NÃO DEFINIDO"}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Erro ao carregar configuração
        </div>
      )}
    </div>
  );
}
