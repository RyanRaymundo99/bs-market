"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/ui/navbar";
import {
  ChevronDown,
  Crosshair,
  TrendingUp,
  Type,
  Ruler,
  ZoomIn,
  Magnet,
  Lock,
  Plus,
  Minus,
} from "lucide-react";



const CHART_TOOLS = [
  { icon: Crosshair, label: "Crosshair" },
  { icon: TrendingUp, label: "Trend Line" },
  { icon: Ruler, label: "Ruler" },
  { icon: Type, label: "Text" },
  { icon: ZoomIn, label: "Zoom" },
  { icon: Magnet, label: "Magnet" },
  { icon: Lock, label: "Lock" },
];

const TIME_INTERVALS = ["30m", "1H", "4H", "1D", "1W", "1M"];

export default function NegociacaoAvancada() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1H");
  const [activeTab, setActiveTab] = useState("limitada");
  const [orderTab, setOrderTab] = useState("abertas");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Universal Navbar */}
      <Navbar
        
        isLoggingOut={isLoggingOut}
        handleLogout={handleLogout}
      />

      {/* Trading Header */}
      <div className="bg-card border-b border-border px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-green-500/20 text-green-400"
            >
              BTC/BRL
            </Badge>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        <Button variant="ghost" size="sm">
          Data
        </Button>
      </div>

      {/* Main Trading Interface */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Sidebar - Tools */}
        <div className="w-16 bg-card border-r border-border flex flex-col items-center py-4 space-y-4">
          {/* Time Intervals */}
          <div className="flex flex-col gap-1">
            {TIME_INTERVALS.map((interval) => (
              <Button
                key={interval}
                variant={selectedTimeframe === interval ? "secondary" : "ghost"}
                size="sm"
                className="w-10 h-8 text-xs"
                onClick={() => setSelectedTimeframe(interval)}
              >
                {interval}
              </Button>
            ))}
          </div>

          <div className="border-t border-border w-8 my-2" />

          {/* Chart Tools */}
          <div className="flex flex-col gap-1">
            {CHART_TOOLS.map((tool) => (
              <Button
                key={tool.label}
                variant="ghost"
                size="sm"
                className="w-10 h-8"
                title={tool.label}
              >
                <tool.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>

          <div className="border-t border-border w-8 my-2" />

          {/* Additional Tools */}
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-8"
            title="Comparar"
          >
            <TrendingUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-8"
            title="Indicadores"
          >
            <span className="text-xs">fx</span>
          </Button>
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="sm" className="w-10 h-8" title="Undo">
              <Minus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="w-10 h-8" title="Redo">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="flex-1 flex flex-col">
          {/* Chart Header */}
          <div className="bg-card border-b border-border p-4">
            <div className="text-sm text-muted-foreground">
              BRBTC:BTC/BRL - 30 BRBTC
            </div>
            <div className="text-sm">
              Abr <span className="text-muted-foreground">data goes here</span>{" "}
              Máx. <span className="text-muted-foreground">data goes here</span>{" "}
              Mín. <span className="text-muted-foreground">data goes here</span>{" "}
              Fch <span className="text-muted-foreground">data goes here</span>{" "}
              <span className="text-red-400">data goes here</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Volume SMA 9{" "}
              <span className="text-muted-foreground">data goes here</span>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 bg-background relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-muted-foreground">
                Candlestick chart data goes here
              </span>
            </div>
            {/* Price Lines */}
            <div className="absolute top-1/4 left-0 right-0 border-t border-green-400 border-dashed">
              <span className="bg-green-400 text-black px-2 text-xs">
                657414,98
              </span>
            </div>
            <div className="absolute top-1/2 left-0 right-0 border-t border-gray-400 border-dashed">
              <span className="bg-gray-400 text-black px-2 text-xs">
                655675,24
              </span>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Order Book & Trades */}
        <div className="w-80 bg-card border-l border-border flex flex-col">
          {/* Order Book */}
          <div className="flex-1 p-4 border-b border-border">
            <h3 className="font-semibold mb-4">Ordem de compra</h3>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
              <span>Preço</span>
              <span>Quantidade</span>
              <span>Total</span>
            </div>
            {/* Sell Orders */}
            <div className="space-y-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-red-400">data goes here</span>
                  <span className="text-muted-foreground">data goes here</span>
                  <span className="text-muted-foreground">data goes here</span>
                </div>
              ))}
            </div>

            {/* Current Price */}
            <div className="text-center py-2 bg-green-500/20 rounded mb-4">
              <div className="text-green-400 font-bold text-lg">657.414,98</div>
              <div className="text-green-400 text-sm">↗</div>
            </div>

            {/* Buy Orders */}
            <div className="space-y-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-green-400">data goes here</span>
                  <span className="text-muted-foreground">data goes here</span>
                  <span className="text-muted-foreground">data goes here</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Trades */}
          <div className="h-48 p-4 border-b border-border">
            <h3 className="font-semibold mb-4">Negociações recentes</h3>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
              <span>Quantidade</span>
              <span>Preço</span>
              <span>Data</span>
            </div>
            <div className="space-y-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-muted-foreground">data goes here</span>
                  <span
                    className={i % 2 === 0 ? "text-green-400" : "text-red-400"}
                  >
                    data goes here
                  </span>
                  <span className="text-muted-foreground">data goes here</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panels */}
      <div className="flex h-64 border-t border-border">
        {/* Left Panel - Orders */}
        <div className="w-1/2 bg-card border-r border-border">
          <div className="flex border-b border-border">
            <Button
              variant={orderTab === "abertas" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setOrderTab("abertas")}
              className="rounded-none"
            >
              Ordens Abertas
            </Button>
            <Button
              variant={orderTab === "executadas" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setOrderTab("executadas")}
              className="rounded-none"
            >
              Ordens Executadas
            </Button>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-8 gap-2 text-xs text-muted-foreground mb-2">
              <span>Moeda</span>
              <span>Tipo</span>
              <span>Lado</span>
              <span>Preço</span>
              <span>Quantidade</span>
              <span>Total</span>
              <span>Condição</span>
              <span>Data</span>
            </div>
            <div className="text-center text-muted-foreground py-8">
              Você não tem ordens disponíveis.
            </div>
          </div>
        </div>

        {/* Right Panel - Trading Forms */}
        <div className="w-1/2 bg-card">
          <div className="flex border-b border-border">
            {["limitada", "mercado", "stop-limit", "oco"].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className="rounded-none capitalize"
              >
                {tab === "limitada"
                  ? "Limitada"
                  : tab === "mercado"
                  ? "Mercado"
                  : tab === "stop-limit"
                  ? "Stop-Limit"
                  : "OCO"}
              </Button>
            ))}
          </div>

          <div className="flex h-full">
            {/* Buy Form */}
            <div className="flex-1 p-4 border-r border-border">
              <h3 className="font-semibold text-green-400 mb-4">
                Comprar Bitcoin
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Preço</label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    className="w-full p-2 bg-background border border-border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Quantidade
                  </label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    className="w-full p-2 bg-background border border-border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Total</label>
                  <div className="w-full p-2 bg-background border border-border rounded text-sm">
                    R$ 0,00
                  </div>
                </div>
                <Button className="w-full bg-green-500 hover:bg-green-600">
                  Comprar
                </Button>
              </div>
            </div>

            {/* Sell Form */}
            <div className="flex-1 p-4">
              <h3 className="font-semibold text-red-400 mb-4">
                Vender Bitcoin
              </h3>
              <div className="mb-3">
                <span className="text-xs text-muted-foreground">Saldo: </span>
                <span className="text-sm">0.00000000 BTC</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Preço</label>
                  <div className="flex">
                    <input
                      type="text"
                      placeholder="R$ 0,00"
                      className="flex-1 p-2 bg-background border border-border rounded-l text-sm"
                    />
                    <div className="px-3 py-2 bg-background border border-l-0 border-border rounded-r text-sm">
                      BRL
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Quantidade
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      placeholder="0.00000000"
                      className="flex-1 p-2 bg-background border border-border rounded-l text-sm"
                    />
                    <div className="px-3 py-2 bg-background border border-l-0 border-border rounded-r text-sm">
                      BTC
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Total</label>
                  <div className="flex">
                    <div className="flex-1 p-2 bg-background border border-border rounded-l text-sm">
                      R$ 0,00
                    </div>
                    <div className="px-3 py-2 bg-background border border-l-0 border-border rounded-r text-sm">
                      BRL
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-red-500 hover:bg-red-600">
                  Vender
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
