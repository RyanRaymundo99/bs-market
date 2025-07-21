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
    <div className="min-h-screen bg-black text-white">
      {/* Universal Navbar */}
      <Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Pagar boleto</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Panel - Payment Form */}
          <div className="bg-black/60 border border-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
            {/* Mirror effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            {/* Balance Information */}
            <div className="mb-6 relative z-10">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm text-gray-300 mb-1">
                    Saldo disponível
                  </h3>
                  <div className="text-2xl font-bold text-white">
                    0.00000000 BTC
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-sm text-gray-300 mb-1">Em uso</h3>
                  <div className="text-2xl font-bold text-white">
                    0.00000000 BTC
                  </div>
                </div>
              </div>
            </div>

            {/* Currency Selection */}
            <div className="mb-6 relative z-10">
              <h3 className="text-sm text-gray-300 mb-2">Moeda selecionada</h3>
              <div className="flex items-center gap-2 p-3 bg-black/60 border border-white/10 rounded-lg">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-white">Bitcoin</span>
                <span className="text-gray-300">BTC</span>
                <ChevronDown className="w-4 h-4 ml-auto text-white" />
              </div>
            </div>

            {/* Digital Line Input */}
            <div className="mb-6 relative z-10">
              <h3 className="text-sm text-gray-300 mb-2">Linha digitável</h3>
              <Input
                placeholder="Digite a linha digitável do boleto"
                value={digitalLine}
                onChange={(e) => setDigitalLine(e.target.value)}
                className="text-lg bg-black/60 border border-white/10 text-white placeholder:text-gray-400 focus:border-white/20"
              />
            </div>

            {/* Continue Button */}
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 relative z-10 transition-all duration-200 backdrop-blur-[10px] border border-white/20 hover:border-white/30"
              style={{
                boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
              }}
              disabled={!digitalLine.trim()}
            >
              {/* Mirror effect for button */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <span className="relative z-10">CONTINUAR</span>
            </Button>
          </div>

          {/* Right Panel - Instructions */}
          <div className="bg-black/60 border border-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
            {/* Mirror effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            <h2 className="text-xl font-bold mb-6 text-white relative z-10">
              Orientações
            </h2>

            <div className="space-y-4 relative z-10">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-gray-300">
                  Não há cobrança de taxas para o pagamento de boletos.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-gray-300">
                  O horário para o pagamento de boletos é de 07h às 19h. Caso
                  você realize o pagamento após esse horário, o boleto será pago
                  no próximo dia útil.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-gray-300">
                  Você consegue agendar um pagamento para outra data, basta
                  selecionar a data desejada na página de pagamento.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-gray-300">
                  O limite para o pagamento de boletos é de R$ 5.000,00 por
                  pagamento e R$ 10.000,00 ao dia.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-gray-300">
                  É possível realizar pagamentos utilizando seu saldo em reais
                  ou em criptomoeda.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <a
                  href="#"
                  className="flex items-center gap-2 text-blue-300 hover:underline"
                >
                  <span className="font-semibold">
                    FAQ (Perguntas Frequentes)
                  </span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Pesquisar:
                </label>
                <Input
                  placeholder="Buscar no histórico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 text-white placeholder:text-gray-400 focus:border-white/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-black/60 border border-white/10 rounded-xl shadow-2xl backdrop-blur-[20px] overflow-hidden relative">
          {/* Mirror effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

          <div className="p-6 border-b border-white/10 relative z-10">
            <h2 className="text-xl font-bold text-white">
              Histórico de pagamentos
            </h2>
          </div>

          {/* Table */}
          <div className="overflow-x-auto relative z-10">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    ID
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Tipo
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Empresa
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Valor
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Vencimento
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Pagamento
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 font-mono text-sm text-white">
                        {item.id}
                      </td>
                      <td className="p-4">
                        <Badge className="bg-orange-500 text-white border-orange-500">
                          {item.type}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-white">{item.company}</td>
                      <td className="p-4 font-semibold text-white">
                        {item.amount}
                      </td>
                      <td className="p-4 text-sm text-white">{item.dueDate}</td>
                      <td className="p-4 text-sm text-white">
                        {item.paymentDate}
                      </td>
                      <td className="p-4">
                        <Badge
                          className={
                            item.status === "Pago"
                              ? "bg-green-500 text-white border-green-500"
                              : "bg-yellow-500 text-white border-yellow-500"
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-300">
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
