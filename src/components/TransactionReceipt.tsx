"use client";

import React from "react";
import { CheckCircle2, Clock, Download, Wallet, Receipt, ShieldCheck } from "lucide-react";
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
  const isCryptoDeposit = transaction.type === "CRYPTO";
  const receiptNumber = `BSM-${transaction.id.slice(-8).toUpperCase()}`;
  const issuedAt = transaction.date.toLocaleString(language === "pt" ? "pt-BR" : "en-US");

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
        <div className="absolute -bottom-1 left-0 right-0 h-2 flex overflow-hidden" aria-hidden="true">
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
            {!isCryptoDeposit && transaction.amount > 0 && (
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
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-foreground">
                {language === "pt" ? "Comprovante emitido com segurança" : "Secure receipt issued"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {language === "pt" 
                  ? "Guarde este comprovante até a compensação final. Em caso de suporte, informe o número do recibo e o ID da transação." 
                  : "Keep this receipt until final settlement. For support, provide the receipt number and transaction ID."}
              </p>
            </div>
          </div>

          <div className="relative py-2">
            <div className="border-t border-dashed border-border" />
            <div className="absolute -left-8 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background border border-border" />
            <div className="absolute -right-8 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background border border-border" />
          </div>

          {/* Receipt Footer */}
          <div className="rounded-2xl border border-border/50 bg-background/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">{language === "pt" ? "Nº do recibo" : "Receipt no."}</p>
                <p className="font-mono font-bold text-foreground">{receiptNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">{language === "pt" ? "Emitido em" : "Issued at"}</p>
                <p className="font-medium text-foreground">{issuedAt}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {language === "pt" ? "BS Market - Comprovante digital" : "BS Market - Digital receipt"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="h-12 rounded-2xl gap-2 border-border hover:bg-muted font-bold transition-all"
            >
              <Download className="w-4 h-4" />
              {language === "pt" ? "Baixar recibo" : "Download"}
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
      <div className="mt-7 text-center opacity-60 transition-opacity hover:opacity-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {language === "pt" ? "Recibo oficial BS Market" : "BS Market Official Receipt"}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {language === "pt" ? "Documento gerado automaticamente" : "Automatically generated document"}
        </p>
      </div>
    </div>
  );
};
