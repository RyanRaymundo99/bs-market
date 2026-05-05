"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, FileText } from "lucide-react";
import Image from "next/image";
import { Spinner } from "@/components/ui/loading";
import { formatBRL } from "@/lib/trade-utils";
import { useRouter } from "next/navigation";

interface PixPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pixData: {
    qrCode: string;
    qrCodeBase64: string | null;
    qrCodeUrl: string | null;
    amount: number;
    usdtAmount: number;
    transactionId: string;
  } | null;
  copied: boolean;
  copyPixCode: () => void;
  language: string;
  handleSimulatePixPayment: () => void;
  isSimulating: boolean;
}

export const PixPaymentDialog: React.FC<PixPaymentDialogProps> = ({
  open,
  onOpenChange,
  pixData,
  copied,
  copyPixCode,
  language,
  handleSimulatePixPayment,
  isSimulating,
}) => {
  const router = useRouter();

  if (!pixData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-2xl w-full p-4 sm:p-6">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-foreground text-lg sm:text-xl">
            {language === "pt" ? "Pagamento via PIX" : "Payment via PIX"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {language === "pt"
              ? "Escaneie o QR Code ou copie o código PIX abaixo para completar sua compra."
              : "Scan the QR Code or copy the PIX code below to complete your purchase."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-5">
          {/* QR Code Container */}
          <div className="flex flex-col items-center space-y-3">
            {pixData.qrCodeBase64 ? (
              <div className="p-2 bg-white rounded-2xl shadow-inner">
                <Image
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR Code PIX"
                  width={224}
                  height={224}
                  className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-border rounded-xl"
                />
              </div>
            ) : (
              <div className="w-48 h-48 sm:w-56 sm:h-56 bg-muted border-2 border-border rounded-xl flex items-center justify-center">
                <p className="text-muted-foreground text-sm text-center px-4">
                  {language === "pt"
                    ? "QR Code indisponível. Use o código Copia e Cola."
                    : "QR Code unavailable. Use the Copy and Paste code."}
                </p>
              </div>
            )}

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                {language === "pt" ? "Valor em reais (BRL):" : "Amount in BRL:"}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-primary">
                {formatBRL(pixData.amount)}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {language === "pt" ? "Quantidade em USDT:" : "USDT amount:"}{" "}
                {pixData.usdtAmount.toFixed(2)} USDT
              </p>
            </div>
          </div>

          {/* Copy and Paste Section */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium text-foreground">
              {language === "pt" ? "PIX Copia e Cola" : "PIX Copy and Paste"}
            </label>
            <button
              onClick={copyPixCode}
              disabled={!pixData.qrCode}
              className="w-full py-2.5 px-3 sm:py-3 sm:px-4 bg-muted hover:bg-muted/80 disabled:bg-muted/50 disabled:cursor-not-allowed border-2 border-warning/50 hover:border-warning/70 text-foreground rounded-lg transition-colors flex items-center justify-between gap-2 font-medium min-h-[52px]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                  <span className="text-sm sm:text-base text-primary font-semibold">
                    {language === "pt" ? "Copiado!" : "Copied!"}
                  </span>
                  <div className="w-4 h-4 sm:w-5 sm:h-5" />
                </>
              ) : (
                <>
                  {pixData.qrCode ? (
                    <code className="flex-1 text-[10px] sm:text-xs text-left font-mono break-all pr-2 text-foreground">
                      {pixData.qrCode}
                    </code>
                  ) : (
                    <span className="flex-1 text-xs sm:text-sm text-muted-foreground text-left">
                      {language === "pt" ? "Código não disponível" : "Code not available"}
                    </span>
                  )}
                  <Copy className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-warning" />
                </>
              )}
            </button>
          </div>

          <p className="text-[10px] sm:text-xs text-muted-foreground text-center pt-2">
            {language === "pt"
              ? "O tempo de processamento pode levar alguns minutos após o pagamento."
              : "Processing time may take a few minutes after payment."}
          </p>

          <Button 
            variant="outline" 
            className="w-full mt-4 h-12 rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => router.push(`/transaction/${pixData.transactionId}`)}
          >
            <FileText className="h-4 w-4" />
            {language === "pt" ? "Acompanhar Status Detalhado" : "Track Detailed Status"}
          </Button>

          {/* Development simulation button */}
          {process.env.NODE_ENV === "development" && (
            <Button
              onClick={handleSimulatePixPayment}
              disabled={isSimulating}
              variant="secondary"
              className="w-full h-12 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20 rounded-xl gap-2 font-bold shadow-sm mt-2"
            >
              {isSimulating ? (
                <>
                  <Spinner size="sm" />
                  {language === "pt" ? "Simulando..." : "Simulating..."}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {language === "pt" ? "Simular Pagamento (Dev)" : "Simulate Payment (Dev)"}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
