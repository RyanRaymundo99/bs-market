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
      <DialogContent className="bg-card border border-border max-w-md">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle className="text-xl font-bold">Calculadora</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Currency Selection */}
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">De</div>
              <Button
                variant={fromCurrency === "BRL" ? "default" : "secondary"}
                className={`h-12 px-4 ${
                  fromCurrency === "BRL"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-muted hover:bg-muted/80"
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
              className="mx-4"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>

            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">Para</div>
              <Button
                variant={toCurrency === "BTC" ? "default" : "secondary"}
                className={`h-12 px-4 ${
                  toCurrency === "BTC"
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-muted hover:bg-muted/80"
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
            <label className="text-sm text-muted-foreground mb-2 block">
              Quantidade
            </label>
            <Input
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="0,00"
              className="h-12 text-lg"
            />
          </div>

          {/* Received Amount */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Vou receber
            </label>
            <Input
              value={receivedAmount}
              readOnly
              placeholder="0,00000000"
              className="h-12 text-lg bg-muted/50"
            />
          </div>

          {/* Price Display */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Preço
            </label>
            <div className="h-12 flex items-center px-3 bg-muted/50 rounded-md">
              <span className="text-lg font-semibold">{getPriceDisplay()}</span>
            </div>
          </div>

          {/* Trade Button */}
          <Button
            onClick={handleTrade}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-lg font-semibold"
            disabled={!quantity || !receivedAmount}
          >
            NEGOCIAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
