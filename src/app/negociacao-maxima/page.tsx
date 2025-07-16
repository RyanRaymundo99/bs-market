"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/ui/navbar";

import {

  Crosshair,
  TrendingUp,
  Type,
  Ruler,
  ZoomIn,
  ZoomOut,
  Magnet,
  Lock,
  Trash2,

} from "lucide-react";

export default function NegociacaoMaxima() {
  const [buyValue, setBuyValue] = useState("");
  const [sellValue, setSellValue] = useState("");
  const [buyQuantity, setBuyQuantity] = useState("");
  const [sellQuantity, setSellQuantity] = useState("");
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
      <Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      {/* Main Trading Interface */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Chart Tools */}
        <div className="w-12 bg-card border-r border-border flex flex-col items-center py-4 gap-2">
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
            <Crosshair className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
            <TrendingUp className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
            <Type className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
            <Ruler className="w-4 h-4" />
          </Button>
          <div className="flex flex-col gap-1 mt-4">
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-col gap-1 mt-4">
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Magnet className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Lock className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="flex-1 flex flex-col">
          {/* Chart Header Info */}
          <div className="bg-card border-b border-border p-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                BRBTC:BTC/BRL · 30 · BRBTC
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Abr</span>{" "}
                <span className="font-semibold">647.921,38</span>{" "}
                <span className="text-muted-foreground">Máx.</span>{" "}
                <span className="text-green-500">651.523,90</span>{" "}
                <span className="text-muted-foreground">Mín.</span>{" "}
                <span className="text-red-500">647.921,38</span>{" "}
                <span className="text-muted-foreground">Fch</span>{" "}
                <span className="font-semibold">650.115,16</span>{" "}
                <span className="text-green-500">+2.193,78 (+0,34%)</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Volume SMA 9 0,00655746
            </div>
          </div>

          {/* Chart Placeholder */}
          <div className="flex-1 bg-background p-4">
            <div className="w-full h-full bg-card rounded-lg border border-border flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground mb-2">
                  📈
                </div>
                <div className="text-lg font-semibold text-muted-foreground mb-1">
                  Gráfico de Negociação Maximizada
                </div>
                <div className="text-sm text-muted-foreground">
                  Interface avançada para negociação com ferramentas maximizadas
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Order Management */}
          <div className="bg-card border-t border-border p-4">
            <Tabs defaultValue="abertas" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="abertas">Ordens Abertas</TabsTrigger>
                <TabsTrigger value="encerradas">Ordens Encerradas</TabsTrigger>
              </TabsList>
              <TabsContent value="abertas" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  Você não tem ordens disponíveis.
                </div>
              </TabsContent>
              <TabsContent value="encerradas" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma ordem encerrada encontrada.
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Sidebar - Price and Trading Forms */}
        <div className="w-80 bg-card border-l border-border flex flex-col">
          {/* Price Information */}
          <div className="p-4 border-b border-border">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Preço venda
                </span>
                <span className="text-red-500 font-semibold">656.287,63</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Preço compra
                </span>
                <span className="text-green-500 font-semibold">654.958,92</span>
              </div>
            </div>
          </div>

          {/* Trading Forms */}
          <div className="flex-1 p-4 space-y-6">
            {/* Buy Form */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-green-500">
                  Comprar Bitcoin
                </h3>
                <select className="bg-background border border-border rounded px-2 py-1 text-sm">
                  <option>10x</option>
                  <option>5x</option>
                  <option>2x</option>
                </select>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Disponível
                  </label>
                  <div className="text-sm font-semibold">R$ 0,00</div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">
                    Preço de mercado
                  </label>
                  <Input
                    value={buyValue}
                    onChange={(e) => setBuyValue(e.target.value)}
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">
                    Valor (BRL)
                  </label>
                  <Input
                    value={buyValue}
                    onChange={(e) => setBuyValue(e.target.value)}
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">
                    Quantidade (BTC)
                  </label>
                  <Input
                    value={buyQuantity}
                    onChange={(e) => setBuyQuantity(e.target.value)}
                    placeholder="0,00000000"
                    className="mt-1"
                  />
                </div>

                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Comprar/Long
                </Button>
              </div>
            </div>

            {/* Sell Form */}
            <div className="space-y-4 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-red-500">Vender Bitcoin</h3>
                <select className="bg-background border border-border rounded px-2 py-1 text-sm">
                  <option>10x</option>
                  <option>5x</option>
                  <option>2x</option>
                </select>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Disponível
                  </label>
                  <div className="text-sm font-semibold">R$ 0,00</div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">
                    Preço de mercado
                  </label>
                  <Input
                    value={sellValue}
                    onChange={(e) => setSellValue(e.target.value)}
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">
                    Valor (BRL)
                  </label>
                  <Input
                    value={sellValue}
                    onChange={(e) => setSellValue(e.target.value)}
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">
                    Quantidade (BTC)
                  </label>
                  <Input
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(e.target.value)}
                    placeholder="0,00000000"
                    className="mt-1"
                  />
                </div>

                <Button className="w-full bg-red-600 hover:bg-red-700">
                  Vender/Short
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
