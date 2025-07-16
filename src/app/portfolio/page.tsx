"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/ui/navbar";

import {
  TrendingUp,
  ChevronDown,
  Zap,
  ArrowDown,
  ArrowUp,
  DollarSign,
  Building2,
  Cloud,
  Apple,
  Car,
  Users,
  Globe,
  Star,
} from "lucide-react";

export default function PortfolioPage() {

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  const portfolioAssets = [
    {
      id: "brl",
      name: "Reais",
      symbol: "BRL",
      icon: <DollarSign className="w-4 h-4 text-white" />,
      iconBg: "bg-green-500",
      availableBalance: "0,00",
      inUseBalance: "0,00",
      totalBalance: "0,00",
      value: "R$ 0,00",
    },
    {
      id: "tslax",
      name: "Tesla xStock",
      symbol: "TSLAX",
      icon: <Car className="w-4 h-4 text-white" />,
      iconBg: "bg-red-500",
      availableBalance: "0.00000000",
      inUseBalance: "0.00000000",
      totalBalance: "0.00000000",
      value: "R$ 0,00",
    },
    {
      id: "metax",
      name: "Meta xStock",
      symbol: "METAX",
      icon: <Users className="w-4 h-4 text-white" />,
      iconBg: "bg-blue-500",
      availableBalance: "0.00000000",
      inUseBalance: "0.00000000",
      totalBalance: "0.00000000",
      value: "R$ 0,00",
    },
    {
      id: "storj",
      name: "Storj",
      symbol: "STORJ",
      icon: <Cloud className="w-4 h-4 text-white" />,
      iconBg: "bg-sky-400",
      availableBalance: "0.00000000",
      inUseBalance: "0.00000000",
      totalBalance: "0.00000000",
      value: "R$ 0,00",
    },
    {
      id: "googlx",
      name: "Alphabet xStock",
      symbol: "GOOGLX",
      icon: <Globe className="w-4 h-4 text-white" />,
      iconBg: "bg-blue-600",
      availableBalance: "0.00000000",
      inUseBalance: "0.00000000",
      totalBalance: "0.00000000",
      value: "R$ 0,00",
    },
    {
      id: "aaplx",
      name: "Apple xStock",
      symbol: "AAPLX",
      icon: <Apple className="w-4 h-4 text-white" />,
      iconBg: "bg-gray-500",
      availableBalance: "0.00000000",
      inUseBalance: "0.00000000",
      totalBalance: "0.00000000",
      value: "R$ 0,00",
    },
    {
      id: "enj",
      name: "Enjin Coin",
      symbol: "ENJ",
      icon: <Star className="w-4 h-4 text-white" />,
      iconBg: "bg-purple-500",
      availableBalance: "0.00000000",
      inUseBalance: "0.00000000",
      totalBalance: "0.00000000",
      value: "R$ 0,00",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Universal Navbar */}
      <Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Meu Portfólio</h1>
        </div>

        {/* Total Assets Summary */}
        <div className="bg-card rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-muted-foreground mb-2">
                Patrimônio Total
              </h2>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold">R$ 0,00</div>
                <div className="flex items-center gap-1 text-green-500 font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  +0,00%
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="bg-muted hover:bg-muted/80 text-white"
                onClick={() => (window.location.href = "/depositar")}
              >
                Depositar
              </Button>
              <Button
                variant="secondary"
                className="bg-muted hover:bg-muted/80 text-white"
                onClick={() => (window.location.href = "/negociacao-basica")}
              >
                Negociar
              </Button>
              <Button
                variant="secondary"
                className="bg-muted hover:bg-muted/80 text-white"
                onClick={() => (window.location.href = "/sacar")}
              >
                Sacar
              </Button>
            </div>
          </div>
        </div>

        {/* Assets Table */}
        <div className="bg-card rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold text-muted-foreground">
                    Moeda
                  </th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">
                    Saldo disponível
                  </th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">
                    Saldo em uso
                  </th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">
                    <div className="flex items-center gap-1">
                      Saldo total
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {portfolioAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${asset.iconBg}`}
                        >
                          {asset.icon}
                        </div>
                        <div>
                          <div className="font-semibold">{asset.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {asset.symbol}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold">
                        {asset.availableBalance}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {asset.value}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold">{asset.inUseBalance}</div>
                      <div className="text-sm text-muted-foreground">
                        {asset.value}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold">{asset.totalBalance}</div>
                      <div className="text-sm text-muted-foreground">
                        {asset.value}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-4">
                        <button
                          className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 text-sm"
                          onClick={() =>
                            (window.location.href = "/negociacao-basica")
                          }
                        >
                          <Zap className="w-3 h-3" />
                          Negociar
                        </button>
                        <button
                          className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 text-sm"
                          onClick={() => (window.location.href = "/depositar")}
                        >
                          <ArrowDown className="w-3 h-3" />
                          Depositar
                        </button>
                        <button
                          className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 text-sm"
                          onClick={() => (window.location.href = "/sacar")}
                        >
                          <ArrowUp className="w-3 h-3" />
                          Sacar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State Message */}
        {portfolioAssets.every(
          (asset) =>
            parseFloat(asset.availableBalance.replace(",", ".")) === 0 &&
            parseFloat(asset.inUseBalance.replace(",", ".")) === 0
        ) && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Portfólio Vazio</h3>
            <p className="text-muted-foreground mb-6">
              Comece a investir depositando fundos ou negociando ativos
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => (window.location.href = "/depositar")}
                className="bg-primary hover:bg-primary/90"
              >
                Fazer Primeiro Depósito
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/negociacao-basica")}
              >
                Começar a Negociar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
