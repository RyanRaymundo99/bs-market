"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, ArrowLeftRight, DollarSign, Bitcoin } from "lucide-react";

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalculatorModal({
  isOpen,
  onClose,
}: CalculatorModalProps) {
  const [fromCurrency, setFromCurrency] = useState<"BRL" | "BTC">("BRL");
  const [toCurrency, setToCurrency] = useState<"BRL" | "BTC">("BTC");
  const [quantity, setQuantity] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");

  // Mock BTC price (you can replace with real API data)
  const btcPrice = 657672.43; // R$ 657.672,43

  const handleQuantityChange = (value: string) => {
    setQuantity(value);

    if (value && !isNaN(parseFloat(value))) {
      const numValue = parseFloat(value);
      if (fromCurrency === "BRL" && toCurrency === "BTC") {
        // Convert BRL to BTC
        const btcAmount = numValue / btcPrice;
        setReceivedAmount(btcAmount.toFixed(8));
      } else if (fromCurrency === "BTC" && toCurrency === "BRL") {
        // Convert BTC to BRL
        const brlAmount = numValue * btcPrice;
        setReceivedAmount(brlAmount.toFixed(2));
      }
    } else {
      setReceivedAmount("");
    }
  };

  const handleCurrencySwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setQuantity(receivedAmount);
    setReceivedAmount(quantity);
  };

  const handleTrade = () => {
    // Navigate to trading page with pre-filled values
    const params = new URLSearchParams({
      from: fromCurrency,
      to: toCurrency,
      amount: quantity,
    });
    window.location.href = `/negociacao-basica?${params.toString()}`;
  };

  const getPriceDisplay = () => {
    if (fromCurrency === "BRL" && toCurrency === "BTC") {
      return `R$ ${btcPrice.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`;
    } else if (fromCurrency === "BTC" && toCurrency === "BRL") {
      return `R$ ${btcPrice.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`;
    }
    return "R$ 0,00";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/80 border border-white/10 max-w-md backdrop-blur-[20px] relative overflow-hidden">
        {/* Mirror effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

        <DialogHeader className="flex items-center justify-between relative z-10">
          <DialogTitle className="text-xl font-bold text-white">
            Calculadora de Conversão
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-white hover:text-blue-300 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6 relative z-10">
          {/* Currency Selection */}
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-sm text-gray-300 mb-2">De</div>
              <Button
                variant={fromCurrency === "BRL" ? "default" : "secondary"}
                className={`h-12 px-4 ${
                  fromCurrency === "BRL"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                }`}
                onClick={() => setFromCurrency("BRL")}
              >
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center mr-2">
                  <DollarSign className="w-3 h-3 text-green-500" />
                </div>
                BRL
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCurrencySwap}
              className="mx-4 text-white hover:text-blue-300 hover:bg-white/10"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>

            <div className="text-center">
              <div className="text-sm text-gray-300 mb-2">Para</div>
              <Button
                variant={toCurrency === "BTC" ? "default" : "secondary"}
                className={`h-12 px-4 ${
                  toCurrency === "BTC"
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                }`}
                onClick={() => setToCurrency("BTC")}
              >
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center mr-2">
                  <Bitcoin className="w-3 h-3 text-orange-500" />
                </div>
                BTC
              </Button>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="text-sm text-gray-300 mb-2 block">
              Quantidade
            </label>
            <Input
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="0,00"
              className="h-12 text-lg bg-black/60 border border-white/10 text-white placeholder:text-gray-400 focus:border-white/20"
            />
          </div>

          {/* Received Amount */}
          <div>
            <label className="text-sm text-gray-300 mb-2 block">
              Vou receber
            </label>
            <Input
              value={receivedAmount}
              readOnly
              placeholder="0,00000000"
              className="h-12 text-lg bg-black/60 border border-white/10 text-white placeholder:text-gray-400"
            />
          </div>

          {/* Price Display */}
          <div>
            <label className="text-sm text-gray-300 mb-2 block">Preço</label>
            <div className="h-12 flex items-center px-3 bg-black/60 border border-white/10 rounded-md">
              <span className="text-lg font-semibold text-white">
                {getPriceDisplay()}
              </span>
            </div>
          </div>

          {/* Trade Button */}
          <Button
            onClick={handleTrade}
            className="w-full h-12 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden text-lg font-semibold"
            style={{
              boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
            }}
            disabled={!quantity || !receivedAmount}
          >
            {/* Mirror effect for button */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <span className="relative z-10">NEGOCIAR</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
