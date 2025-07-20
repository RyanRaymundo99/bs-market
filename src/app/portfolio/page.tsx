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
    <div className="min-h-screen bg-black text-white">
      {/* Universal Navbar */}
      <Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Meu Portfólio</h1>
        </div>

        {/* Total Assets Summary */}
        <div className="bg-black/60 border border-white/10 rounded-xl p-6 mb-8 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
          {/* Mirror effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

          <div className="flex items-center justify-between relative z-10">
            <div>
              <h2 className="text-lg font-semibold text-gray-300 mb-2">
                Patrimônio Total
              </h2>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-white">R$ 0,00</div>
                <div className="flex items-center gap-1 text-green-500 font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  +0,00%
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden"
                style={{
                  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                }}
                onClick={() => (window.location.href = "/depositar")}
              >
                {/* Mirror effect for button */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <span className="relative z-10">Depositar</span>
              </Button>
              <Button
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden"
                style={{
                  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                }}
                onClick={() => (window.location.href = "/negociacao-basica")}
              >
                {/* Mirror effect for button */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <span className="relative z-10">Negociar</span>
              </Button>
              <Button
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden"
                style={{
                  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                }}
                onClick={() => (window.location.href = "/sacar")}
              >
                {/* Mirror effect for button */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <span className="relative z-10">Sacar</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Assets Table */}
        <div className="bg-black/60 border border-white/10 rounded-xl shadow-2xl backdrop-blur-[20px] overflow-hidden relative">
          {/* Mirror effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

          <div className="overflow-x-auto relative z-10">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Moeda
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Saldo disponível
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Saldo em uso
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    <div className="flex items-center gap-1">
                      Saldo total
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {portfolioAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${asset.iconBg}`}
                        >
                          {asset.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {asset.name}
                          </div>
                          <div className="text-sm text-gray-300">
                            {asset.symbol}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">
                        {asset.availableBalance}
                      </div>
                      <div className="text-sm text-gray-300">{asset.value}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">
                        {asset.inUseBalance}
                      </div>
                      <div className="text-sm text-gray-300">{asset.value}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">
                        {asset.totalBalance}
                      </div>
                      <div className="text-sm text-gray-300">{asset.value}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-4">
                        <button
                          className="text-blue-300 hover:text-blue-200 transition-colors flex items-center gap-1 text-sm"
                          onClick={() =>
                            (window.location.href = "/negociacao-basica")
                          }
                        >
                          <Zap className="w-3 h-3" />
                          Negociar
                        </button>
                        <button
                          className="text-blue-300 hover:text-blue-200 transition-colors flex items-center gap-1 text-sm"
                          onClick={() => (window.location.href = "/depositar")}
                        >
                          <ArrowDown className="w-3 h-3" />
                          Depositar
                        </button>
                        <button
                          className="text-blue-300 hover:text-blue-200 transition-colors flex items-center gap-1 text-sm"
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
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Building2 className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">
              Portfólio Vazio
            </h3>
            <p className="text-gray-300 mb-6">
              Comece a investir depositando fundos ou negociando ativos
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => (window.location.href = "/depositar")}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden"
                style={{
                  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                }}
              >
                {/* Mirror effect for button */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <span className="relative z-10">Fazer Primeiro Depósito</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/negociacao-basica")}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden"
                style={{
                  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                }}
              >
                {/* Mirror effect for button */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <span className="relative z-10">Começar a Negociar</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
