"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navbar from "@/components/ui/navbar";

import {
  ChevronDown,
  Search,
  Download,
  FileText,
  Calendar,
  Filter,
  BarChart3,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export default function ExtratoPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [transactionType, setTransactionType] = useState("todas");
  const [selectedCurrency, setSelectedCurrency] = useState("todas");
  const [dateRange, setDateRange] = useState("08/07/2025 até 15/07/2025");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  const transactionTypes = [
    { value: "todas", label: "Todas" },
    { value: "deposito", label: "Depósito" },
    { value: "saque", label: "Saque" },
    { value: "compra", label: "Compra" },
    { value: "venda", label: "Venda" },
    { value: "transferencia", label: "Transferência" },
  ];

  const currencies = [
    { value: "todas", label: "Todas" },
    { value: "brl", label: "BRL" },
    { value: "btc", label: "BTC" },
    { value: "eth", label: "ETH" },
    { value: "usdt", label: "USDT" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Universal Navbar */}
      <Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Extrato</h1>
        </div>

        {/* Filter Section */}
        <div className="bg-card rounded-xl p-6 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Transaction Type Filter */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Tipo de transação
              </label>
              <Select
                value={transactionType}
                onValueChange={setTransactionType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                  <ChevronDown className="w-4 h-4 ml-auto" />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Currency Filter */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Moeda selecionada
              </label>
              <Select
                value={selectedCurrency}
                onValueChange={setSelectedCurrency}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                  <ChevronDown className="w-4 h-4 ml-auto" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Data
              </label>
              <div className="relative">
                <Input
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {/* Search Button */}
            <div>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => console.log("Searching transactions...")}
              >
                <Search className="w-4 h-4 mr-2" />
                PESQUISAR
              </Button>
            </div>
          </div>
        </div>

        {/* Transaction History Section */}
        <div className="bg-card rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Histórico de transações</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" title="Exportar CSV">
                  <FileText className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" title="Baixar relatório">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Table Headers */}
          <div className="bg-muted/50 border-b border-border">
            <div className="grid grid-cols-8 gap-4 p-4 text-sm font-semibold text-muted-foreground">
              <div>ID</div>
              <div>Tipo</div>
              <div>Destino</div>
              <div>Moeda</div>
              <div>Valor</div>
              <div>Taxa</div>
              <div>Data</div>
              <div>Status</div>
            </div>
          </div>

          {/* Empty State */}
          <div className="py-16 px-6 text-center">
            <div className="max-w-md mx-auto">
              {/* Illustration */}
              <div className="relative mb-6">
                <div className="w-32 h-32 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="relative">
                    {/* Person with magnifying glass */}
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-2">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                    {/* Magnifying glass */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <Search className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                </div>

                {/* Bar chart */}
                <div className="flex items-end justify-center gap-1 mb-4">
                  {[20, 35, 25, 40].map((height, index) => (
                    <div key={index} className="relative">
                      <div
                        className="w-3 bg-primary/30 rounded-t"
                        style={{ height: `${height}px` }}
                      ></div>
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary/60 rounded-full flex items-center justify-center">
                        <span className="text-xs text-primary-foreground">
                          !
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <h3 className="text-lg font-semibold mb-2">
                Nenhuma transação encontrada
              </h3>
              <p className="text-muted-foreground mb-6">
                Você não tem nenhuma transação com os critérios informados.
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTransactionType("todas");
                    setSelectedCurrency("todas");
                    setDateRange("08/07/2025 até 15/07/2025");
                  }}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Limpar Filtros
                </Button>
                <Button
                  onClick={() => (window.location.href = "/depositar")}
                  className="bg-primary hover:bg-primary/90"
                >
                  Fazer Primeira Transação
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats (Optional) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-card rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total de Transações
                </p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Volume Total</p>
                <p className="text-2xl font-bold">R$ 0,00</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxas Pagas</p>
                <p className="text-2xl font-bold">R$ 0,00</p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
