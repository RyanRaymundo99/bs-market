"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/ui/navbar";

import {
  TrendingUp,
  TrendingDown,
  Bitcoin,
  BarChart3,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";

export default function NegociacaoBasica() {
  const [selectedPair, setSelectedPair] = useState("BTC/BRL");
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState("comprar");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  const tradingPairs = [
    {
      symbol: "BTC/BRL",
      name: "Bitcoin",
      price: "657.672,43",
      change: "+2.193,78",
      changePercent: "+0,34%",
      isPositive: true,
    },
    {
      symbol: "ETH/BRL",
      name: "Ethereum",
      price: "18.245,67",
      change: "-156,32",
      changePercent: "-0,85%",
      isPositive: false,
    },
    {
      symbol: "USDT/BRL",
      name: "Tether",
      price: "5,58",
      change: "+0,02",
      changePercent: "+0,36%",
      isPositive: true,
    },
  ];

  const recentTrades = [
    { time: "12:45:23", price: "657.672,43", amount: "0,0012", type: "buy" },
    { time: "12:45:18", price: "657.650,00", amount: "0,0008", type: "sell" },
    { time: "12:45:15", price: "657.672,43", amount: "0,0021", type: "buy" },
    { time: "12:45:10", price: "657.680,00", amount: "0,0015", type: "sell" },
    { time: "12:45:05", price: "657.672,43", amount: "0,0009", type: "buy" },
  ];

  const orderBook = [
    { price: "657.680,00", amount: "0,1250", total: "82.210,00", type: "sell" },
    { price: "657.675,00", amount: "0,0890", total: "58.533,08", type: "sell" },
    {
      price: "657.670,00",
      amount: "0,1560",
      total: "102.596,52",
      type: "sell",
    },
    { price: "657.665,00", amount: "0,0780", total: "51.297,87", type: "sell" },
    {
      price: "657.660,00",
      amount: "0,2030",
      total: "133.504,98",
      type: "sell",
    },
    { price: "657.655,00", amount: "0,0450", total: "29.594,48", type: "buy" },
    { price: "657.650,00", amount: "0,1670", total: "109.827,55", type: "buy" },
    { price: "657.645,00", amount: "0,0920", total: "60.503,34", type: "buy" },
    { price: "657.640,00", amount: "0,1340", total: "88.123,76", type: "buy" },
    { price: "657.635,00", amount: "0,0780", total: "51.295,53", type: "buy" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Universal Navbar */}
      <Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      {/* Main Trading Interface */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Chart and Trading Pairs */}
        <div className="flex-1 flex flex-col">
          {/* Trading Pairs */}
          <div className="bg-card border-b border-border p-4">
            <div className="flex gap-4">
              {tradingPairs.map((pair) => (
                <div
                  key={pair.symbol}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedPair === pair.symbol
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedPair(pair.symbol)}
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Bitcoin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{pair.symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      {pair.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">R$ {pair.price}</div>
                    <div
                      className={`text-sm ${
                        pair.isPositive ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {pair.changePercent}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart Area */}
          <div className="flex-1 bg-background p-4">
            <div className="w-full h-full bg-card rounded-lg border border-border flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <div className="text-xl font-bold text-muted-foreground mb-2">
                  Gráfico de Negociação Básica
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Interface simplificada para negociação de criptoativos
                </div>
                <div className="flex gap-2 justify-center">
                  <Badge variant="outline">1m</Badge>
                  <Badge variant="outline">5m</Badge>
                  <Badge variant="outline">15m</Badge>
                  <Badge variant="outline">1h</Badge>
                  <Badge variant="outline">4h</Badge>
                  <Badge variant="outline">1d</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div className="bg-card border-t border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Negociações Recentes</h3>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {recentTrades.map((trade, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-muted-foreground">{trade.time}</span>
                  <span className="font-semibold">R$ {trade.price}</span>
                  <span className="text-muted-foreground">
                    {trade.amount} BTC
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      trade.type === "buy"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {trade.type === "buy" ? "Compra" : "Venda"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Trading Forms and Order Book */}
        <div className="w-96 bg-card border-l border-border flex flex-col">
          {/* Balance Display */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Seu Saldo</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBalance(!showBalance)}
              >
                {showBalance ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">BRL</span>
                <span className="font-semibold">
                  {showBalance ? "R$ 1.250,00" : "••••••"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">BTC</span>
                <span className="font-semibold">
                  {showBalance ? "0,0012 BTC" : "••••••"}
                </span>
              </div>
            </div>
          </div>

          {/* Trading Forms */}
          <div className="flex-1 p-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="comprar" className="text-green-500">
                  Comprar
                </TabsTrigger>
                <TabsTrigger value="vender" className="text-red-500">
                  Vender
                </TabsTrigger>
              </TabsList>

              <TabsContent value="comprar" className="mt-4 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Preço (BRL)
                    </label>
                    <Input
                      value="657.672,43"
                      readOnly
                      className="mt-1 bg-muted/50"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">
                      Quantidade (BTC)
                    </label>
                    <Input
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      placeholder="0,00000000"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">
                      Total (BRL)
                    </label>
                    <Input
                      value={
                        buyAmount
                          ? (parseFloat(buyAmount) * 657672.43).toFixed(2)
                          : ""
                      }
                      readOnly
                      className="mt-1 bg-muted/50"
                    />
                  </div>

                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Comprar BTC
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="vender" className="mt-4 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Preço (BRL)
                    </label>
                    <Input
                      value="657.672,43"
                      readOnly
                      className="mt-1 bg-muted/50"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">
                      Quantidade (BTC)
                    </label>
                    <Input
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      placeholder="0,00000000"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">
                      Total (BRL)
                    </label>
                    <Input
                      value={
                        sellAmount
                          ? (parseFloat(sellAmount) * 657672.43).toFixed(2)
                          : ""
                      }
                      readOnly
                      className="mt-1 bg-muted/50"
                    />
                  </div>

                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Vender BTC
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Order Book */}
          <div className="p-4 border-t border-border">
            <h3 className="font-semibold mb-3">Livro de Ordens</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {/* Sell Orders */}
              {orderBook.slice(0, 5).map((order, index) => (
                <div
                  key={`sell-${index}`}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-red-500 font-semibold">
                    R$ {order.price}
                  </span>
                  <span className="text-muted-foreground">{order.amount}</span>
                  <span className="text-muted-foreground">{order.total}</span>
                </div>
              ))}

              {/* Current Price */}
              <div className="flex justify-between items-center text-sm py-1 border-y border-border my-2">
                <span className="font-bold text-lg">R$ 657.672,43</span>
                <span className="text-green-500 font-semibold">+0,34%</span>
              </div>

              {/* Buy Orders */}
              {orderBook.slice(5).map((order, index) => (
                <div
                  key={`buy-${index}`}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-green-500 font-semibold">
                    R$ {order.price}
                  </span>
                  <span className="text-muted-foreground">{order.amount}</span>
                  <span className="text-muted-foreground">{order.total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
