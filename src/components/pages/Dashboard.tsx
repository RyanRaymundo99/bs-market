"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/ui/navbar";
import Image from "next/image";

const TOP_MOVERS = [
  { name: "Pudgy Pe...", price: "R$ 0,1714", change: "+34,01%" },
  { name: "Mog Coin", price: "R$ 0,00001076", change: "+14,35%" },
  { name: "The Sand...", price: "R$ 1,77", change: "+12,03%" },
];

const PORTFOLIO = [
  {
    name: "Tether",
    symbol: "USDT",
    price: "R$ 5,5800",
    amount: "0.00000000",
    change: "-0,08%",
  },
  {
    name: "Quant",
    symbol: "QNT",
    price: "R$ 627,02",
    amount: "0.00000000",
    change: "+0,00%",
  },
  {
    name: "SAROS",
    symbol: "SAROS",
    price: "R$ 1,36804",
    amount: "0.00000000",
    change: "+0,00%",
  },
];

const NEWS = [
  {
    title: "Explodir Para $125.000 Ou Recuar Para $110.000?",
    time: "Há 2h",
    description:
      "Após uma forte alta na semana passada que levou o Bitcoin a um novo recorde histórico de $118.667, a principal criptomoeda do mundo parece estar fazendo uma pausa.",
    image: "/next.svg",
  },
  {
    title: "Meus colegas porcos e eu estamos nos banqueteando.",
    time: "Há 2h",
    description:
      "Robert Kiyosaki, autor de 'Pai Rico, Pai Pobre', voltou ao mercado de Bitcoin com uma jogada ousada.",
    image: "/next.svg",
  },
  {
    title: "",
    time: "Há 3h",
    description: "",
    image: "/next.svg",
  },
];

export default function Dashboard() {
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
    <div className="min-h-screen bg-black text-white">
      {/* Universal Navbar */}
      <Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-3 flex flex-col gap-8">
          {/* Balance and Top Movers */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Balance */}
            <div className="bg-black/60 border border-white/10 rounded-xl p-6 flex flex-col gap-4 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
              {/* Mirror effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

              <div className="text-lg font-bold mb-2 relative z-10">Saldo</div>
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <div className="text-sm text-gray-300">Disponível</div>
                  <div className="text-2xl font-bold">R$0,00</div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
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
                    size="sm"
                    variant="outline"
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
              <div className="flex justify-between items-center mt-2 relative z-10">
                <div className="text-sm text-gray-300">Em uso</div>
                <div className="text-lg font-semibold">R$0,00</div>
              </div>
            </div>
            {/* Top Movers */}
            <div className="md:col-span-2 flex flex-col gap-4">
              <div className="text-lg font-bold mb-2">Em alta</div>
              <div className="flex gap-4">
                {TOP_MOVERS.map((coin) => (
                  <div
                    key={coin.name}
                    className="bg-black/60 border border-white/10 rounded-xl p-4 flex-1 flex flex-col items-center shadow-2xl backdrop-blur-[20px] relative overflow-hidden"
                  >
                    {/* Mirror effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

                    <Badge className="mb-2 relative z-10 bg-white/10 text-white border-white/20">
                      {coin.name}
                    </Badge>
                    <div className="text-lg font-bold relative z-10">
                      {coin.price}
                    </div>
                    <div className="text-green-400 font-semibold relative z-10">
                      {coin.change}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Portfolio and Statement */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Portfolio */}
            <div className="bg-black/60 border border-white/10 rounded-xl p-6 flex flex-col gap-4 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
              {/* Mirror effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

              <div className="text-lg font-bold mb-2 relative z-10">
                Portfólio
              </div>
              <div className="flex justify-between items-center mb-2 relative z-10">
                <div className="text-sm text-gray-300">Total</div>
                <div className="text-2xl font-bold">R$0,00</div>
                <div className="text-green-400 font-semibold">0,00%</div>
              </div>
              <div className="divide-y divide-white/10 relative z-10">
                {PORTFOLIO.map((asset) => (
                  <div
                    key={asset.name}
                    className="flex justify-between items-center py-2"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{asset.name}</span>
                      <span className="text-xs text-gray-300">
                        {asset.amount} {asset.symbol}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold">{asset.price}</span>
                      <span
                        className={
                          asset.change.startsWith("-")
                            ? "text-red-400 text-xs"
                            : "text-green-400 text-xs"
                        }
                      >
                        {asset.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="text-blue-300 text-sm mt-2 cursor-pointer hover:text-blue-200 hover:underline transition-colors relative z-10"
                onClick={() => (window.location.href = "/portfolio")}
              >
                Ver tudo
              </div>
            </div>
            {/* Statement */}
            <div className="bg-black/60 border border-white/10 rounded-xl p-6 flex flex-col gap-4 items-center justify-center shadow-2xl backdrop-blur-[20px] relative overflow-hidden min-h-[200px]">
              {/* Mirror effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

              <Image
                src="/user-profile.svg"
                alt="Statement"
                width={128}
                height={128}
                className="w-32 h-32 mb-4 relative z-10"
              />
              <div className="text-center text-gray-300 relative z-10">
                Você poderá ver suas transações recentes aqui :)
              </div>
            </div>
          </div>
        </div>
        {/* News */}
        <aside className="lg:col-span-1 flex flex-col gap-8">
          <div className="bg-black/60 border border-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
            {/* Mirror effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            <div className="text-lg font-bold mb-4 relative z-10">
              Novidades
            </div>
            <div className="flex flex-col gap-4 relative z-10">
              {NEWS.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 border-b border-white/10 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="font-semibold text-base">{item.title}</div>
                  <div className="text-xs text-gray-300">{item.time}</div>
                  <div className="text-sm text-gray-300">
                    {item.description}
                  </div>
                  <Image
                    src={item.image}
                    alt="news"
                    width={384}
                    height={96}
                    className="w-full h-24 object-cover rounded mt-2"
                  />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
