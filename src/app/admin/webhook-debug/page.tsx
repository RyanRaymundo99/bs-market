"use client";

import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Search, AlertCircle, CheckCircle } from "lucide-react";

interface MatchResult {
  method: string;
  order: {
    id: string;
    externalOrderId: string | null;
    status: string;
    total: number;
  };
}

interface DebugResults {
  matches: MatchResult[];
  deposit?: {
    id: string;
    externalId: string;
    amount: number;
  };
  recentOrders?: Array<{
    id: string;
    externalOrderId: string | null;
    status: string;
  }>;
}

export default function WebhookDebugPage() {
  const { toast } = useToast();
  const [transactionId, setTransactionId] = useState("");
  const [externalId, setExternalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DebugResults | null>(null);

  const checkMatching = async () => {
    if (!transactionId && !externalId) {
      toast({
        title: "Erro",
        description: "Por favor, forneça um Transaction ID ou External ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (transactionId) params.append("transactionId", transactionId);
      if (externalId) params.append("externalId", externalId);

      const response = await fetch(`/api/debug/check-order-matching?${params}`);
      const data = await response.json();

      if (response.ok) {
        setResults(data);
        if (data.matches.length > 0) {
          toast({
            title: "✅ Pedido Encontrado",
            description: `Encontrado ${data.matches.length} correspondência(s)`,
          });
        } else {
          toast({
            title: "⚠️ Nenhum Pedido Encontrado",
            description: "Nenhum pedido corresponde aos IDs fornecidos",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro",
          description: data.error || "Falha ao verificar correspondência",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking matching:", error);
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Debug de Webhook - Verificar Correspondência de Pedidos
        </h1>
        <p className="text-gray-400">
          Verifique se um webhook consegue encontrar o pedido correspondente
        </p>
      </div>

      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Buscar Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Transaction ID (do NutzPay)
            </label>
            <Input
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Ex: 136688691130"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              External ID (nosso ID original)
            </label>
            <Input
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="Ex: purchase_user123_timestamp"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <Button
            onClick={checkMatching}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Verificar Correspondência
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-4">
          {results.matches.length > 0 ? (
            <Card className="bg-green-900/20 border-green-800">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {results.matches.length} Correspondência(s) Encontrada(s)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results.matches.map((match, index) => (
                  <div key={index} className="mb-4 p-4 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">
                      Método: {match.method}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Order ID:</span>{" "}
                        <span className="text-white font-mono">
                          {match.order.id}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">
                          External Order ID:
                        </span>{" "}
                        <span className="text-white font-mono">
                          {match.order.externalOrderId || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>{" "}
                        <span className="text-white">{match.order.status}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Total:</span>{" "}
                        <span className="text-white">
                          R$ {match.order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-red-900/20 border-red-800">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Nenhuma Correspondência Encontrada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 mb-4">
                  O webhook não conseguiria encontrar o pedido com os IDs
                  fornecidos.
                </p>
                {results.deposit && (
                  <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                    <p className="text-sm font-semibold text-white mb-2">
                      Deposit Encontrado:
                    </p>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-gray-400">Deposit ID:</span>{" "}
                        <span className="text-white font-mono">
                          {results.deposit.id}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">External ID:</span>{" "}
                        <span className="text-white font-mono">
                          {results.deposit.externalId}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Amount:</span>{" "}
                        <span className="text-white">
                          R$ {results.deposit.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {results.recentOrders && results.recentOrders.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">
                  Pedidos Recentes (últimos 5)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3 bg-gray-800 rounded text-sm"
                    >
                      <div className="flex justify-between">
                        <span className="text-gray-400">ID:</span>
                        <span className="text-white font-mono">{order.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">External ID:</span>
                        <span className="text-white font-mono">
                          {order.externalOrderId || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className="text-white">{order.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
