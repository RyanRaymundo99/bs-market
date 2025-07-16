"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/ui/navbar";

import {

  ChevronDown,
 
  Search,

} from "lucide-react";

export default function PacotesPage() {
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

  const packages = [
    {
      id: "defis",
      name: "Pacote DeFi",
      code: "DEFIS",
      price: "20.314",
      variation: "+3,12",
      isPositive: true,
      icons: [
        { symbol: "A", color: "bg-red-500", name: "Avalanche" },
        { symbol: "P", color: "bg-purple-500", name: "Polygon" },
        { symbol: "O", color: "bg-blue-500", name: "Optimism" },
      ],
    },
    {
      id: "mtv5",
      name: "Pacote Metaverso",
      code: "MTV5",
      price: "6.077",
      variation: "+3,02",
      isPositive: true,
      icons: [
        { symbol: "D", color: "bg-blue-600", name: "Decentraland" },
        { symbol: "∞", color: "bg-white text-black", name: "The Sandbox" },
        { symbol: "A", color: "bg-pink-500", name: "Axie Infinity" },
      ],
    },
    {
      id: "nft5",
      name: "Pacote NFT",
      code: "NFT5",
      price: "3.357",
      variation: "+2,90",
      isPositive: true,
      icons: [
        { symbol: "D", color: "bg-blue-600", name: "Decentraland" },
        { symbol: "A", color: "bg-pink-500", name: "Axie Infinity" },
        { symbol: "E", color: "bg-green-500", name: "Enjin Coin" },
      ],
    },
    {
      id: "web3",
      name: "Pacote Web 3",
      code: "WEB3",
      price: "12.710",
      variation: "+2,34",
      isPositive: true,
      icons: [
        { symbol: "P", color: "bg-pink-500", name: "Polkadot" },
        { symbol: "C", color: "bg-blue-500", name: "Chainlink" },
        { symbol: "F", color: "bg-cyan-500", name: "Filecoin" },
      ],
    },
    {
      id: "fut5",
      name: "Pacote Futebol",
      code: "FUT5",
      price: "3.007",
      variation: "+0,03",
      isPositive: true,
      icons: [
        { symbol: "FCB", color: "bg-red-600", name: "FC Barcelona" },
        { symbol: "PSG", color: "bg-blue-600", name: "Paris Saint-Germain" },
        { symbol: "MCI", color: "bg-sky-500", name: "Manchester City" },
      ],
    },
    {
      id: "mm5",
      name: "Pacote Maiores Moedas",
      code: "MM5",
      price: "59.168",
      variation: "-1,42",
      isPositive: false,
      icons: [
        { symbol: "B", color: "bg-yellow-500", name: "Bitcoin" },
        { symbol: "E", color: "bg-purple-500", name: "Ethereum" },
        { symbol: "X", color: "bg-cyan-400", name: "XRP" },
      ],
    },
  ];

  const filteredPackages = packages.filter(
    (pkg) =>
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Simple sparkline data for charts
  const generateSparkline = (isPositive: boolean) => {
    const points = isPositive
      ? [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]
      : [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20];

    return points
      .map((point, index) => `${index * 6},${100 - point}`)
      .join(" ");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Universal Navbar */}
      <Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      {/* Search Bar */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-end">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar pacotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Pacotes</h1>
        </div>

        {/* Packages Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-4 gap-4 p-4 border-b border-border bg-muted/50">
            <div className="font-semibold">Nome</div>
            <div className="font-semibold">Preço</div>
            <div className="font-semibold">Gráfico</div>
            <div className="font-semibold flex items-center gap-1">
              Variação
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Package Rows */}
          <div className="divide-y divide-border">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="grid grid-cols-4 gap-4 p-4 hover:bg-muted/30 transition-colors"
              >
                {/* Name Column */}
                <div className="flex flex-col">
                  <div className="font-semibold">{pkg.name}</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {pkg.code}
                  </div>
                  <div className="flex items-center gap-1">
                    {pkg.icons.map((icon, index) => (
                      <div
                        key={index}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${icon.color}`}
                        title={icon.name}
                      >
                        {icon.symbol}
                      </div>
                    ))}
                    
                  </div>
                </div>

                {/* Price Column */}
                <div className="flex items-center">
                  <span className="text-lg font-semibold">R$ {pkg.price}</span>
                </div>

                {/* Chart Column */}
                <div className="flex items-center">
                  <svg className="w-16 h-8" viewBox="0 0 96 32">
                    <polyline
                      fill="none"
                      stroke={pkg.isPositive ? "#10b981" : "#ef4444"}
                      strokeWidth="2"
                      points={generateSparkline(pkg.isPositive)}
                    />
                  </svg>
                </div>

                {/* Variation Column */}
                <div className="flex items-center justify-between">
                  <span
                    className={`font-semibold ${
                      pkg.isPositive ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {pkg.variation}
                  </span>
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    Negociar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* No Results Message */}
        {filteredPackages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
             
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
