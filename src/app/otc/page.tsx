"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from "@/components/ui/navbar";

import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { safeLocalStorageGet, safeLocalStorageSet } from "@/lib/utils";

export default function OTCPage() {
  const [showModal, setShowModal] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [selectedCurrency] = useState("USDT/BRL");
  const [quantity, setQuantity] = useState("");
  const [total, setTotal] = useState("");
  const [activeTab, setActiveTab] = useState("comprar");
  const [currentTime, setCurrentTime] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Memoize the exchange rate to prevent recalculation
  const exchangeRate = useMemo(() => 5.58, []);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  // Update time every second - optimized with useCallback
  useEffect(() => {
    const updateTime = useCallback(() => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setCurrentTime(timeString);
    }, []);

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if user has chosen not to see the modal
  useEffect(() => {
    const hasSeenModal = safeLocalStorageGet("otc-modal-seen");
    if (hasSeenModal === "true") {
      setShowModal(false);
    }
  }, []);

  const handleModalClose = useCallback(() => {
    if (dontShowAgain) {
      safeLocalStorageSet("otc-modal-seen", "true");
    }
    setShowModal(false);
  }, [dontShowAgain]);

  const handleQuantityChange = useCallback(
    (value: string) => {
      setQuantity(value);
      // Calculate total based on a sample rate (you can adjust this)
      if (value && !isNaN(parseFloat(value))) {
        const result = (parseFloat(value) * exchangeRate).toFixed(2);
        setTotal(result);
      } else {
        setTotal("");
      }
    },
    [exchangeRate]
  );

  const handleMaxClick = useCallback(() => {
    const maxValue = "1000.00";
    setQuantity(maxValue);
    handleQuantityChange(maxValue);
  }, [handleQuantityChange]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleAgreementChange = useCallback((key: string) => {
    setDontShowAgain((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Universal Navbar */}
      <Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* OTC Banner */}
        <div className="bg-black/60 border border-white/10 rounded-xl p-6 mb-8 flex items-center justify-between shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
          {/* Mirror effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">OTC</h1>
          </div>
          <div className="flex items-center gap-2 text-red-500">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm">{currentTime} - Off Market</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {/* Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Trading Forms */}
          <div className="bg-black/60 border border-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
            {/* Mirror effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            {/* Balance Information */}
            <div className="mb-6 relative z-10">
              <div className="mb-4">
                <h3 className="text-sm text-gray-300 mb-1">Saldo disponível</h3>
                <div className="text-2xl font-bold text-white">R$ 0,00</div>
                <div className="text-sm text-gray-300">0.00000000 USDT</div>
              </div>
              <div>
                <h3 className="text-sm text-gray-300 mb-1">Crédito</h3>
                <div className="text-2xl font-bold text-white">R$ 0,00</div>
                <div className="text-sm text-gray-300">0.00000000 USDT</div>
              </div>
            </div>

            {/* Currency Selection */}
            <div className="mb-6 relative z-10">
              <h3 className="text-sm text-gray-300 mb-2">Moeda selecionada</h3>
              <div className="flex items-center gap-2 p-3 bg-black/60 border border-white/10 rounded-lg">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">T</span>
                </div>
                <span className="font-semibold">{selectedCurrency}</span>
                <ChevronDown className="w-4 h-4 ml-auto" />
              </div>
            </div>

            {/* Trading Action Buttons */}
            <div className="flex gap-3 mb-6 relative z-10">
              <Button
                className={`flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden ${
                  activeTab === "comprar"
                    ? "border-cyan-300 bg-cyan-500/20"
                    : ""
                }`}
                style={{
                  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                }}
                onClick={() => handleTabChange("comprar")}
              >
                {/* Mirror effect for button */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <TrendingUp className="w-4 h-4 mr-2 relative z-10" />
                <span className="relative z-10">Comprar</span>
              </Button>
              <Button
                variant="outline"
                className={`flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden ${
                  activeTab === "vender" ? "border-cyan-300 bg-cyan-500/20" : ""
                }`}
                style={{
                  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                }}
                onClick={() => handleTabChange("vender")}
              >
                {/* Mirror effect for button */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <TrendingDown className="w-4 h-4 mr-2 relative z-10" />
                <span className="relative z-10">Vender</span>
              </Button>
            </div>

            {/* Quantity and Total Inputs */}
            <div className="space-y-4 mb-6 relative z-10">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Quantidade (USDT)
                </label>
                <Input
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder="0,00"
                  className="text-lg bg-black/60 border border-white/10 text-white placeholder:text-gray-400 focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Total (BRL)
                </label>
                <div className="flex gap-2">
                  <Input
                    value={total}
                    readOnly
                    placeholder="0,00"
                    className="text-lg bg-black/60 border border-white/10 text-white placeholder:text-gray-400"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMaxClick}
                    className="whitespace-nowrap bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden"
                    style={{
                      boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    {/* Mirror effect for button */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    <span className="relative z-10">MAX</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Request Quotation Button */}
            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-lg py-3 relative z-10 transition-all duration-200 backdrop-blur-[10px] border border-cyan-300/20 hover:border-cyan-300/30"
              style={{
                boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Mirror effect for button */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-transparent to-cyan-500/10 opacity-30 pointer-events-none rounded-md"></div>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent"></div>
              <span className="relative z-10">Solicitar Cotação</span>
            </Button>
          </div>

          {/* Right Panel - Quotation Display */}
          <div className="bg-black/60 border border-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
            {/* Mirror effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            <h2 className="text-xl font-bold mb-6 text-cyan-300 relative z-10">
              Cotação para {activeTab === "comprar" ? "Comprar" : "Vender"}
            </h2>

            <div className="space-y-6 relative z-10">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Cotação
                </label>
                <div className="p-4 bg-black/60 border border-cyan-300/20 rounded-lg text-center">
                  <span className="text-2xl font-bold text-cyan-300">---</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Quantidade (USDT)
                </label>
                <div className="p-3 bg-black/60 border border-cyan-300/20 rounded-lg text-center">
                  <span className="text-lg font-semibold text-cyan-300">
                    ---
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Total (BRL)
                </label>
                <div className="p-3 bg-black/60 border border-cyan-300/20 rounded-lg text-center">
                  <span className="text-lg font-semibold text-cyan-300">
                    ---
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-6 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden"
              disabled
              style={{
                boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Mirror effect for button */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <span className="relative z-10">Solicite Nova Cotação</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Important Notices Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-black/80 border border-white/10 max-w-md backdrop-blur-[20px] relative overflow-hidden z-[9999] !fixed !top-[15%] !left-[50%] !transform !-translate-x-1/2 !-translate-y-0">
          {/* Mirror effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

          <DialogHeader className="relative z-10">
            <DialogTitle className="text-lg font-bold text-white">
              Avisos importantes
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <span className="font-bold text-primary">1.</span>
                <p>
                  A cotação das negociações OTC duram pouco tempo, em função
                  disso ao clicar em Comprar ou Vender sua ordem será executada
                  instantaneamente, sem nenhuma confirmação adicional.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="font-bold text-primary">2.</span>
                <p>
                  A negociação sempre ocorrerá no preço que está sendo mostrado
                  em sua tela.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="font-bold text-primary">3.</span>
                <p>Nenhuma taxa será cobrada pelas transações via OTC.</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4 border-t border-border">
              <Checkbox
                id="dont-show-again"
                checked={dontShowAgain}
                onCheckedChange={handleAgreementChange}
              />
              <label
                htmlFor="dont-show-again"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Não quero ver esta mensagem novamente
              </label>
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleModalClose}
            >
              ENTENDI
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
