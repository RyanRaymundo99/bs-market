"use client";
import React, { useState, useEffect } from "react";
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

import {
  
  ChevronDown,
  
  TrendingUp,
  TrendingDown,

} from "lucide-react";

export default function OTCPage() {
  const [showModal, setShowModal] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [selectedCurrency] = useState("USDT/BRL");
  const [quantity, setQuantity] = useState("");
  const [total, setTotal] = useState("");
  const [activeTab, setActiveTab] = useState("comprar");
  const [currentTime, setCurrentTime] = useState("");
 
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if user has chosen not to see the modal
  useEffect(() => {
    const hasSeenModal = localStorage.getItem("otc-modal-seen");
    if (hasSeenModal === "true") {
      setShowModal(false);
    }
  }, []);

  const handleModalClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("otc-modal-seen", "true");
    }
    setShowModal(false);
  };

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    // Calculate total based on a sample rate (you can adjust this)
    if (value && !isNaN(parseFloat(value))) {
      const rate = 5.58; // USDT/BRL rate
      setTotal((parseFloat(value) * rate).toFixed(2));
    } else {
      setTotal("");
    }
  };

  const handleMaxClick = () => {
    setQuantity("1000.00");
    handleQuantityChange("1000.00");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Universal Navbar */}
      <Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* OTC Banner */}
        <div className="bg-card rounded-lg p-6 mb-8 flex items-center justify-between">
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
          <div className="bg-card rounded-lg p-6">
            {/* Balance Information */}
            <div className="mb-6">
              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground mb-1">
                  Saldo disponível
                </h3>
                <div className="text-2xl font-bold">R$ 0,00</div>
                <div className="text-sm text-muted-foreground">
                  0.00000000 USDT
                </div>
              </div>
              <div>
                <h3 className="text-sm text-muted-foreground mb-1">Crédito</h3>
                <div className="text-2xl font-bold">R$ 0,00</div>
                <div className="text-sm text-muted-foreground">
                  0.00000000 USDT
                </div>
              </div>
            </div>

            {/* Currency Selection */}
            <div className="mb-6">
              <h3 className="text-sm text-muted-foreground mb-2">
                Moeda selecionada
              </h3>
              <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">T</span>
                </div>
                <span className="font-semibold">{selectedCurrency}</span>
                <ChevronDown className="w-4 h-4 ml-auto" />
              </div>
            </div>

            {/* Trading Action Buttons */}
            <div className="flex gap-3 mb-6">
              <Button
                className={`flex-1 ${
                  activeTab === "comprar" ? "bg-primary" : "bg-muted"
                }`}
                onClick={() => setActiveTab("comprar")}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Comprar
              </Button>
              <Button
                variant="outline"
                className={`flex-1 ${
                  activeTab === "vender" ? "bg-primary" : ""
                }`}
                onClick={() => setActiveTab("vender")}
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Vender
              </Button>
            </div>

            {/* Quantity and Total Inputs */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Quantidade (USDT)
                </label>
                <Input
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder="0,00"
                  className="text-lg"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Total (BRL)
                </label>
                <div className="flex gap-2">
                  <Input
                    value={total}
                    readOnly
                    placeholder="0,00"
                    className="text-lg bg-muted/50"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMaxClick}
                    className="whitespace-nowrap"
                  >
                    MAX
                  </Button>
                </div>
              </div>
            </div>

            {/* Request Quotation Button */}
            <Button className="w-full bg-primary hover:bg-primary/90">
              Solicitar Cotação
            </Button>
          </div>

          {/* Right Panel - Quotation Display */}
          <div className="bg-card rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">
              Cotação para {activeTab === "comprar" ? "Comprar" : "Vender"}
            </h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Cotação
                </label>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <span className="text-2xl font-bold text-muted-foreground">
                    ---
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Quantidade (USDT)
                </label>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <span className="text-lg font-semibold text-muted-foreground">
                    ---
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Total (BRL)
                </label>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <span className="text-lg font-semibold text-muted-foreground">
                    ---
                  </span>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full mt-6" disabled>
              Solicite Nova Cotação
            </Button>
          </div>
        </div>
      </div>

      {/* Important Notices Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Avisos importantes</DialogTitle>
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
                onCheckedChange={(checked) =>
                  setDontShowAgain(checked as boolean)
                }
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
