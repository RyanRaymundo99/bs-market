"use client";

import React from "react";
import { CheckCircle2, Clock, Download, Share2, Wallet, ArrowDownToLine, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReceiptProps {
  transaction: {
    id: string;
    amount: number;
    usdtAmount: number;
    date: Date;
    status: string;
    type?: string;
    network?: string;
    address?: string;
  };
  onClose: () => void;
  language: string;
}

export const TransactionReceipt: React.FC<ReceiptProps> = ({
  transaction,
  onClose,
  language,
}) => {
  const isCompleted = transaction.status === "COMPLETED" || transaction.status === "APPROVED" || transaction.status === "CONFIRMED";
  const isPending = !isCompleted && transaction.status !== "FAILED" && transaction.status !== "CANCELLED";

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatUSDT = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-300">
      {/* Premium Header with Gradient */}
      <div className={cn(
        "w-full h-32 rounded-t-3xl flex flex-col items-center justify-center relative overflow-hidden",
        isCompleted ? "bg-gradient-to-br from-emerald-500 to-emerald-700" : "bg-gradient-to-br from-blue-500 to-blue-700"
      )}>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Receipt className="w-24 h-24 text-white" />
        </div>
        
        <div className="bg-white/20 backdrop-blur-md rounded-full p-3 mb-2 shadow-inner">
          {isCompleted ? (
            <CheckCircle2 className="w-8 h-8 text-white" />
          ) : (
            <Clock className="w-8 h-8 text-white animate-pulse" />
          )}
        </div>
        
        <h2 className="text-white font-bold text-xl tracking-tight">
          {isCompleted 
            ? (language === "pt" ? "Pagamento Confirmado!" : "Payment Confirmed!") 
            : (language === "pt" ? "Depósito em Processamento" : "Deposit Processing")}
        </h2>
      </div>

      {/* Receipt Body - Voucher Style */}
      <div className="w-full bg-card border-x border-b border-border rounded-b-3xl p-6 shadow-2xl relative">
        {/* Decorative Scalloped Bottom Effect */}
        <div className="absolute -bottom-1 left-0 right-0 h-2 flex overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-full h-4 bg-background rounded-full -mt-2 mx-0.5 border border-border" />
          ))}
        </div>

        <div className="space-y-6">
          {/* Main Values */}
          <div className="text-center py-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
              {language === "pt" ? "Valor Creditado" : "Credited Amount"}
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-4xl font-black text-foreground">{formatUSDT(transaction.usdtAmount)}</span>
              <span className="text-xl font-bold text-primary">USDT</span>
            </div>
            {transaction.amount > 0 && (
              <p className="text-sm text-muted-foreground">
                {language === "pt" ? "Custo total:" : "Total cost:"} {formatBRL(transaction.amount)}
              </p>
            )}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div className="flex justify-between items-center group">
              <span className="text-muted-foreground">{language === "pt" ? "Status:" : "Status:"}</span>
              <Badge className={cn(
                "font-bold uppercase text-[10px] px-2 py-0.5",
                isCompleted ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : "bg-blue-500/20 text-blue-500 border-blue-500/30"
              )}>
                {isCompleted 
                  ? (language === "pt" ? "Concluído" : "Completed") 
                  : (language === "pt" ? "Em processamento" : "Processing")}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{language === "pt" ? "Data:" : "Date:"}</span>
              <span className="font-medium text-foreground">{transaction.date.toLocaleString(language === "pt" ? "pt-BR" : "en-US")}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{language === "pt" ? "ID da Transação:" : "Transaction ID:"}</span>
              <span className="font-mono text-[10px] text-foreground bg-muted px-2 py-1 rounded truncate max-w-[180px]">
                {transaction.id}
              </span>
            </div>

            {transaction.type === "CRYPTO" && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{language === "pt" ? "Rede:" : "Network:"}</span>
                  <Badge variant="outline" className="font-bold">{transaction.network}</Badge>
                </div>
                {transaction.address && (
                  <div className="flex flex-col gap-1 pt-2">
                    <span className="text-muted-foreground text-xs">{language === "pt" ? "Endereço de Depósito:" : "Deposit Address:"}</span>
                    <span className="font-mono text-[10px] break-all p-2 bg-muted rounded border border-border">
                      {transaction.address}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Security Note */}
          <div className="bg-muted/30 rounded-2xl p-4 flex gap-3 items-start border border-border/50">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-foreground">
                {language === "pt" ? "Transação Segura" : "Secure Transaction"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {language === "pt" 
                  ? "Esta transação foi processada através de nossa infraestrutura de segurança criptográfica de ponta." 
                  : "This transaction was processed through our state-of-the-art cryptographic security infrastructure."}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="h-12 rounded-2xl gap-2 border-border hover:bg-muted font-bold transition-all"
            >
              <Download className="w-4 h-4" />
              {language === "pt" ? "Recibo" : "Receipt"}
            </Button>
            <Button
              onClick={onClose}
              className="h-12 rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              {language === "pt" ? "Fechar" : "Close"}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-8 flex items-center gap-2 opacity-40 grayscale hover:grayscale-0 transition-all">
        <ArrowDownToLine className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">BS Market Official Receipt</span>
      </div>
    </div>
  );
};
