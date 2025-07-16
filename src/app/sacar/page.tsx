"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/ui/navbar";

import {
  
  ChevronDown,
  
  ExternalLink,
  AlertCircle,
  Building2,
} from "lucide-react";

export default function SacarPage() {
 
  const [selectedMethod, setSelectedMethod] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  const withdrawalHistory = [
    {
      id: "W001",
      type: "PIX",
      destination: "pix@user.com.br",
      currency: "BRL",
      amount: "150,00",
      fee: "0,00",
      date: "15/07/2024",
      status: "Concluído",
    },
    {
      id: "W002",
      type: "TED",
      destination: "Banco do Brasil",
      currency: "BRL",
      amount: "500,00",
      fee: "0,00",
      date: "12/07/2024",
      status: "Concluído",
    },
    {
      id: "W003",
      type: "PIX",
      destination: "pix@user.com.br",
      currency: "BRL",
      amount: "75,50",
      fee: "0,00",
      date: "10/07/2024",
      status: "Processando",
    },
  ];

  const filteredHistory = withdrawalHistory.filter(
    (item) =>
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Universal Navbar */}
      <Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Sacar</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Panel - Withdrawal Form */}
          <div className="bg-card rounded-lg p-6">
            {/* Balance Information */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm text-muted-foreground mb-1">
                    Saldo disponível
                  </h3>
                  <div className="text-2xl font-bold">R$ 0,00</div>
                </div>
                <div className="text-right">
                  <h3 className="text-sm text-muted-foreground mb-1">Em uso</h3>
                  <div className="text-2xl font-bold">R$ 0,00</div>
                </div>
              </div>
            </div>

            {/* Currency Selection */}
            <div className="mb-6">
              <h3 className="text-sm text-muted-foreground mb-2">
                Moeda selecionada
              </h3>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">R$</span>
                </div>
                <span className="font-semibold">Reais</span>
                <span className="text-muted-foreground">BRL</span>
                <ChevronDown className="w-4 h-4 ml-auto" />
              </div>
            </div>

            {/* Withdrawal Method */}
            <div className="mb-6">
              <h3 className="text-sm text-muted-foreground mb-2">
                Faça um Pix ou TED
              </h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className={`w-full justify-between p-4 h-auto ${
                    selectedMethod === "PIX"
                      ? "border-primary bg-primary/10"
                      : ""
                  }`}
                  onClick={() => setSelectedMethod("PIX")}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">P</span>
                    </div>
                    <span className="font-semibold">PIX</span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  className={`w-full justify-between p-4 h-auto ${
                    selectedMethod === "TED"
                      ? "border-primary bg-primary/10"
                      : ""
                  }`}
                  onClick={() => setSelectedMethod("TED")}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold">TED</span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel - Instructions */}
          <div className="bg-card rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">Orientações</h2>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm">
                  Só são processados saques solicitados para contas bancárias de{" "}
                  <span className="font-semibold">mesma titularidade</span>.
                  Caso contrário, o saque será cancelado e o valor retornará
                  para o seu saldo em reais.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm">
                  Se você possuir o mesmo tipo de chave PIX em dois ou mais
                  bancos, é possível que o valor seja enviado para alguma destas
                  contas bancárias, e talvez seja necessário checar as mesmas.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm">
                  Saques via PIX podem demorar até cinco minutos para serem
                  creditados na conta de destino, enquanto saques via TED podem
                  ser creditados em até duas horas úteis. Confira todos os
                  prazos{" "}
                  <a href="#" className="text-primary hover:underline">
                    aqui
                  </a>
                  .
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm">
                  Caso sua chave PIX tenha sido gerada recentemente, é possível
                  que o sistema não a identifique num primeiro momento. Nesse
                  caso, basta aguardar ou utilizar outra chave.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <a
                  href="#"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <span className="font-semibold">
                    FAQ (Perguntas Frequentes)
                  </span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Pesquisar:
                </label>
                <Input
                  placeholder="Buscar no histórico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold">Histórico de saques em Reais</h2>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">ID</th>
                  <th className="text-left p-4 font-semibold">Tipo</th>
                  <th className="text-left p-4 font-semibold">Destino</th>
                  <th className="text-left p-4 font-semibold">Moeda</th>
                  <th className="text-left p-4 font-semibold">Valor</th>
                  <th className="text-left p-4 font-semibold">Taxa</th>
                  <th className="text-left p-4 font-semibold">Data</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4 font-mono text-sm">{item.id}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            item.type === "PIX" ? "default" : "secondary"
                          }
                        >
                          {item.type}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm">{item.destination}</td>
                      <td className="p-4 text-sm">{item.currency}</td>
                      <td className="p-4 font-semibold">R$ {item.amount}</td>
                      <td className="p-4 text-sm">R$ {item.fee}</td>
                      <td className="p-4 text-sm">{item.date}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            item.status === "Concluído"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            item.status === "Concluído"
                              ? "bg-green-500"
                              : "bg-yellow-500"
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-muted-foreground"
                    >
                      {searchTerm
                        ? `Nenhum resultado encontrado para "${searchTerm}"`
                        : "Nenhum saque encontrado"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
