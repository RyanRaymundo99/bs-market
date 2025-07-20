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
    <div className="min-h-screen bg-black text-white">
      {/* Universal Navbar */}
      <Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Sacar</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Panel - Withdrawal Form */}
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
                  <div className="text-2xl font-bold text-white">R$ 0,00</div>
                </div>
                <div className="text-right">
                  <h3 className="text-sm text-gray-300 mb-1">Em uso</h3>
                  <div className="text-2xl font-bold text-white">R$ 0,00</div>
                </div>
              </div>
            </div>

            {/* Currency Selection */}
            <div className="mb-6 relative z-10">
              <h3 className="text-sm text-gray-300 mb-2">Moeda selecionada</h3>
              <div className="flex items-center gap-2 p-3 bg-black/60 border border-white/10 rounded-lg">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">R$</span>
                </div>
                <span className="font-semibold text-white">Reais</span>
                <span className="text-gray-300">BRL</span>
                <ChevronDown className="w-4 h-4 ml-auto text-white" />
              </div>
            </div>

            {/* Withdrawal Method */}
            <div className="mb-6 relative z-10">
              <h3 className="text-sm text-gray-300 mb-2">Faça um Pix ou TED</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className={`w-full justify-between p-4 h-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden ${
                    selectedMethod === "PIX"
                      ? "border-blue-300 bg-blue-500/20"
                      : ""
                  }`}
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                  }}
                  onClick={() => setSelectedMethod("PIX")}
                >
                  {/* Mirror effect for button */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">P</span>
                    </div>
                    <span className="font-semibold">PIX</span>
                  </div>
                  <ChevronDown className="w-4 h-4 relative z-10" />
                </Button>

                <Button
                  variant="outline"
                  className={`w-full justify-between p-4 h-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden ${
                    selectedMethod === "TED"
                      ? "border-blue-300 bg-blue-500/20"
                      : ""
                  }`}
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                  }}
                  onClick={() => setSelectedMethod("TED")}
                >
                  {/* Mirror effect for button */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold">TED</span>
                  </div>
                  <ChevronDown className="w-4 h-4 relative z-10" />
                </Button>
              </div>
            </div>
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
                  Só são processados saques solicitados para contas bancárias de{" "}
                  <span className="font-semibold text-white">
                    mesma titularidade
                  </span>
                  . Caso contrário, o saque será cancelado e o valor retornará
                  para o seu saldo em reais.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-gray-300">
                  Se você possuir o mesmo tipo de chave PIX em dois ou mais
                  bancos, é possível que o valor seja enviado para alguma destas
                  contas bancárias, e talvez seja necessário checar as mesmas.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-gray-300">
                  Saques via PIX podem demorar até cinco minutos para serem
                  creditados na conta de destino, enquanto saques via TED podem
                  ser creditados em até duas horas úteis. Confira todos os
                  prazos{" "}
                  <a href="#" className="text-blue-300 hover:underline">
                    aqui
                  </a>
                  .
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-gray-300">
                  Caso sua chave PIX tenha sido gerada recentemente, é possível
                  que o sistema não a identifique num primeiro momento. Nesse
                  caso, basta aguardar ou utilizar outra chave.
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

        {/* Withdrawal History */}
        <div className="bg-black/60 border border-white/10 rounded-xl shadow-2xl backdrop-blur-[20px] overflow-hidden relative">
          {/* Mirror effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

          <div className="p-6 border-b border-white/10 relative z-10">
            <h2 className="text-xl font-bold text-white">
              Histórico de saques em Reais
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
                    Destino
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Moeda
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Valor
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Taxa
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Data
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
                        <Badge
                          className={
                            item.type === "PIX"
                              ? "bg-cyan-500 text-white border-cyan-500"
                              : "bg-gray-500 text-white border-gray-500"
                          }
                        >
                          {item.type}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-white">
                        {item.destination}
                      </td>
                      <td className="p-4 text-sm text-white">
                        {item.currency}
                      </td>
                      <td className="p-4 font-semibold text-white">
                        R$ {item.amount}
                      </td>
                      <td className="p-4 text-sm text-white">R$ {item.fee}</td>
                      <td className="p-4 text-sm text-white">{item.date}</td>
                      <td className="p-4">
                        <Badge
                          className={
                            item.status === "Concluído"
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
                    <td colSpan={8} className="p-8 text-center text-gray-300">
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
