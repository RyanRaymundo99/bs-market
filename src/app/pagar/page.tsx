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

export default function PagarPage() {

  const [searchTerm, setSearchTerm] = useState("");
  const [digitalLine, setDigitalLine] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  const paymentHistory = [
    {
      id: "P001",
      type: "Boleto",
      company: "Energia Elétrica",
      amount: "R$ 150,00",
      dueDate: "15/07/2024",
      paymentDate: "10/07/2024",
      status: "Pago",
    },
    {
      id: "P002",
      type: "Boleto",
      company: "Água e Esgoto",
      amount: "R$ 85,50",
      dueDate: "20/07/2024",
      paymentDate: "12/07/2024",
      status: "Pago",
    },
    {
      id: "P003",
      type: "Boleto",
      company: "Internet",
      amount: "R$ 120,00",
      dueDate: "25/07/2024",
      paymentDate: "15/07/2024",
      status: "Agendado",
    },
  ];

  const filteredHistory = paymentHistory.filter(
    (item) =>
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Universal Navbar */}
      <Navbar
        isLoggingOut={isLoggingOut}
        handleLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Pagar boleto</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Panel - Payment Form */}
          <div className="bg-card rounded-lg p-6">
            {/* Balance Information */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm text-muted-foreground mb-1">
                    Saldo disponível
                  </h3>
                  <div className="text-2xl font-bold">0.00000000 BTC</div>
                </div>
                <div className="text-right">
                  <h3 className="text-sm text-muted-foreground mb-1">Em uso</h3>
                  <div className="text-2xl font-bold">0.00000000 BTC</div>
                </div>
              </div>
            </div>

            {/* Currency Selection */}
            <div className="mb-6">
              <h3 className="text-sm text-muted-foreground mb-2">
                Moeda selecionada
              </h3>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold">Bitcoin</span>
                <span className="text-muted-foreground">BTC</span>
                <ChevronDown className="w-4 h-4 ml-auto" />
              </div>
            </div>

            {/* Digital Line Input */}
            <div className="mb-6">
              <h3 className="text-sm text-muted-foreground mb-2">
                Linha digitável
              </h3>
              <Input
                placeholder="Digite a linha digitável do boleto"
                value={digitalLine}
                onChange={(e) => setDigitalLine(e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Continue Button */}
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-lg py-3"
              disabled={!digitalLine.trim()}
            >
              CONTINUAR
            </Button>
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
                  Não há cobrança de taxas para o pagamento de boletos.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm">
                  O horário para o pagamento de boletos é de 07h às 19h. Caso
                  você realize o pagamento após esse horário, o boleto será pago
                  no próximo dia útil.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm">
                  Você consegue agendar um pagamento para outra data, basta
                  selecionar a data desejada na página de pagamento.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm">
                  O limite para o pagamento de boletos é de R$ 5.000,00 por
                  pagamento e R$ 10.000,00 ao dia.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm">
                  É possível realizar pagamentos utilizando seu saldo em reais
                  ou em criptomoeda.
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

        {/* Payment History */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold">Histórico de pagamentos</h2>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">ID</th>
                  <th className="text-left p-4 font-semibold">Tipo</th>
                  <th className="text-left p-4 font-semibold">Empresa</th>
                  <th className="text-left p-4 font-semibold">Valor</th>
                  <th className="text-left p-4 font-semibold">Vencimento</th>
                  <th className="text-left p-4 font-semibold">Pagamento</th>
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
                        <Badge variant="outline">{item.type}</Badge>
                      </td>
                      <td className="p-4 text-sm">{item.company}</td>
                      <td className="p-4 font-semibold">{item.amount}</td>
                      <td className="p-4 text-sm">{item.dueDate}</td>
                      <td className="p-4 text-sm">{item.paymentDate}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            item.status === "Pago" ? "default" : "secondary"
                          }
                          className={
                            item.status === "Pago"
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
                      colSpan={7}
                      className="p-8 text-center text-muted-foreground"
                    >
                      {searchTerm
                        ? `Nenhum resultado encontrado para "${searchTerm}"`
                        : "Nenhum pagamento encontrado"}
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
