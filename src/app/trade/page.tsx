"use client";

import React, { useState, useCallback, useEffect } from "react";
import NavbarNew from "@/components/ui/navbar-new";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, TrendingUp, Clock } from "lucide-react";

const TradePage = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toast } = useToast();

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      // Call logout API to clear session
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Clear local storage
      localStorage.removeItem("auth-session");
      localStorage.removeItem("user");
      sessionStorage.clear();

      // Force redirect to home page using window.location for reliability
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API fails, clear local storage and redirect
      localStorage.removeItem("auth-session");
      localStorage.removeItem("user");
      sessionStorage.clear();
      // Force redirect using window.location
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  // Estados para compra
  const [buyBRL, setBuyBRL] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeBase64: string | null;
    qrCodeUrl: string | null;
    amount: number;
    usdtAmount: number;
    transactionId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [usdtPrice, setUsdtPrice] = useState<number>(5.5); // Default fallback price
  const [priceLoading, setPriceLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    transactionId: string;
    amount: number;
    usdtAmount: number;
    date: Date;
  } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Estado para o histórico de transações
  const [transactionHistory, setTransactionHistory] = useState<
    Array<{
      id: string;
      date: Date;
      type: "buy";
      amount: number;
      received: number;
      fee: number;
      rate: number;
      status: string;
    }>
  >([]);

  // Constantes
  const FEE_RATE = 0.03; // 3% de taxa

  // Currency formatting functions
  const formatBRL = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatUSDT = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  // Format BRL input value (for display in input field)
  const formatBRLInput = (value: string): string => {
    // Remove all non-digit characters except comma
    const cleaned = value.replace(/[^\d,]/g, "");

    // Handle empty or just comma
    if (!cleaned || cleaned === ",") return "";

    // Split by comma to handle decimals
    const parts = cleaned.split(",");
    const integerPart = parts[0].replace(/\D/g, "");
    const decimalPart = parts[1]?.replace(/\D/g, "").slice(0, 2) || "";

    // Format integer part with thousand separators
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // Combine parts
    if (decimalPart) {
      return `${formattedInteger},${decimalPart}`;
    } else if (cleaned.includes(",")) {
      return `${formattedInteger},`;
    } else {
      return formattedInteger;
    }
  };

  // Parse BRL input value (convert formatted string to number)
  const parseBRLInput = (value: string): number => {
    if (!value) return 0;
    // Replace Brazilian format (dots as thousand separators, comma as decimal)
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Handle BRL input change
  const handleBRLInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatBRLInput(inputValue);
    setBuyBRL(formatted);
  };

  // Cálculos para compra (BRL → USDT)
  // Fee is ADDED on top of the purchase amount
  const buyAmountBRL = parseBRLInput(buyBRL); // Parse formatted input to number
  const buyFeeBRL = buyAmountBRL * FEE_RATE; // 3% fee on top
  const buyTotalBRL = buyAmountBRL + buyFeeBRL; // Total to charge (base + fee)
  const buyUSDTReceived = buyAmountBRL / usdtPrice; // USDT received based on base amount (not including fee)

  // Fetch USDT rate and transaction history on mount
  useEffect(() => {
    fetchUSDTRate();
    fetchTransactionHistory();
  }, []);

  const fetchUSDTRate = async () => {
    try {
      setPriceLoading(true);
      const response = await fetch("/api/crypto/usdt-rate");

      if (!response.ok) {
        console.warn("Failed to fetch USDT rate, using fallback");
        return; // Keep current price or use fallback
      }

      const data = await response.json();
      if (data.rate && typeof data.rate === "number" && data.rate > 0) {
        setUsdtPrice(data.rate);
      } else {
        console.warn("Invalid rate data received, using fallback");
      }
    } catch (error) {
      console.error("Error fetching USDT rate:", error);
      // Keep current price or use fallback - don't break the UI
    } finally {
      setPriceLoading(false);
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      // Fetch orders from API
      const response = await fetch("/api/crypto/orders");
      if (response.ok) {
        const data = await response.json();
        if (data.orders) {
          interface OrderResponse {
            id: string;
            type: string;
            baseCurrency: string;
            total: number | string;
            amount: number | string;
            price: number | string;
            createdAt: string;
            status: string;
            externalOrderId?: string | null;
          }
          const buyOrders = (data.orders as OrderResponse[])
            .filter(
              (order) => order.type === "BUY" && order.baseCurrency === "USDT"
            )
            .map((order) => {
              const total = parseFloat(order.total.toString());
              // Total includes fee, so calculate base and fee
              const baseAmount = total / 1.03;
              const fee = total - baseAmount;
              // Use externalOrderId (transaction_id) as id if available, otherwise use order.id
              // This ensures consistency with how new transactions are added
              const transactionId = order.externalOrderId || order.id;
              return {
                id: transactionId,
                date: new Date(order.createdAt),
                type: "buy" as const,
                amount: total, // Total paid
                received: parseFloat(order.amount.toString()),
                fee: fee,
                rate: parseFloat(order.price.toString()),
                status: order.status,
              };
            });
          setTransactionHistory(buyOrders);
        }
      }
    } catch (error) {
      console.error("Error fetching transaction history:", error);
    }
  };

  const handleBuyConfirm = async () => {
    if (buyAmountBRL <= 0) {
      toast({
        title: "Erro",
        description: "O valor deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/crypto/buy-usdt-pix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: buyTotalBRL, // Total amount to charge (base + 3% fee)
          usdt_amount: buyUSDTReceived, // USDT based on base amount
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar compra");
      }

      if (data.success && data.data) {
        // Extract PIX code from various possible structures
        // NutzPay API returns: qrCode, pixKey, or pix_data.qr_code
        let pixCode =
          data.data.pix_data?.qr_code ||
          data.data.pix_data?.qrCode ||
          data.data.qrCode ||
          data.data.pixKey ||
          "";

        // Extract QR code image (base64 or URL)
        const qrCodeBase64 = data.data.pix_data?.qr_code_base64 || null;
        const qrCodeUrl =
          data.data.pix_data?.qr_code_url || data.data.qrCodeUrl || null;

        console.log("=== FRONTEND PIX DATA ===");
        console.log("Full response data:", JSON.stringify(data.data, null, 2));
        console.log(
          "PIX Code extracted:",
          pixCode ? pixCode.substring(0, 50) + "..." : "EMPTY"
        );
        console.log(
          "QR Code Base64:",
          qrCodeBase64 ? "Present" : "Not present"
        );
        console.log("QR Code URL:", qrCodeUrl || "Not present");
        console.log("=========================");

        // If PIX code is missing but QR code image is available, try to decode it
        if (!pixCode && qrCodeBase64) {
          try {
            // Dynamically import jsQR for client-side QR code decoding
            const jsQRModule = await import("jsqr");
            const jsQR = jsQRModule.default || jsQRModule;
            
            // Create an image element to decode the QR code
            const img = new Image();
            img.crossOrigin = "anonymous";
            
            const decodedCode = await new Promise<string | null>((resolve) => {
              img.onload = () => {
                try {
                  const canvas = document.createElement("canvas");
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    resolve(code?.data || null);
                  } else {
                    resolve(null);
                  }
                } catch (error) {
                  console.error("Error decoding QR code:", error);
                  resolve(null);
                }
              };
              img.onerror = () => {
                console.error("Error loading QR code image");
                resolve(null);
              };
              
              // Set image source
              const base64Data = qrCodeBase64.includes(',') 
                ? qrCodeBase64 
                : `data:image/png;base64,${qrCodeBase64}`;
              img.src = base64Data;
            });

            if (decodedCode) {
              console.log("✅ Successfully decoded PIX code from QR image!");
              console.log("Decoded PIX code:", decodedCode.substring(0, 50) + "...");
              pixCode = decodedCode;
            } else {
              console.log("⚠️ Could not decode PIX code from QR image");
            }
          } catch (error) {
            console.error("Error importing or using jsQR:", error);
          }
        }

        // Show PIX QR code modal
        setPixData({
          qrCode: pixCode,
          qrCodeBase64: qrCodeBase64,
          qrCodeUrl: qrCodeUrl,
          amount: data.data.amount_brl,
          usdtAmount: data.data.amount_usdt,
          transactionId: data.data.transaction_id,
        });
        setShowPixModal(true);
        setBuyBRL(""); // Clear the field

        // Payment confirmation will be handled by NutzPay webhook
        // The webhook will update the order status in the database
        // User will see confirmation when they refresh or return to the page

        // Add to transaction history
        // Total amount includes fee, so calculate base and fee
        const totalBRL = data.data.amount_brl; // Total paid (base + fee)
        const baseAmount = totalBRL / 1.03; // Base amount
        const fee = totalBRL - baseAmount; // Fee amount
        const newTransaction = {
          id: data.data.transaction_id,
          date: new Date(),
          type: "buy" as const,
          amount: totalBRL, // Total paid
          received: data.data.amount_usdt,
          fee: fee,
          rate: data.data.exchange_rate,
          status: data.data.status,
        };
        setTransactionHistory((prev) => [newTransaction, ...prev]);

        toast({
          title: "Compra iniciada!",
          description: "Escaneie o QR Code PIX para finalizar o pagamento",
        });
      }
    } catch (error: unknown) {
      console.error("Purchase error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao processar compra de USDT";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (pixData?.qrCode) {
      try {
        await navigator.clipboard.writeText(pixData.qrCode);
        setCopied(true);
        toast({
          title: "Copiado!",
          description: "Código PIX copiado para a área de transferência",
        });
        // Reset copied state after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
        toast({
          title: "Erro",
          description: "Não foi possível copiar o código PIX",
          variant: "destructive",
        });
      }
    }
  };

  // Check payment status manually (webhook updates the database)
  // This is called when user clicks "Check Status" button or when page becomes visible
  const checkPaymentStatus = useCallback(
    async (transactionId: string) => {
      setCheckingStatus(true);
      try {
        console.log("🔍 Checking payment status for:", transactionId);
        const response = await fetch(`/api/crypto/orders/${transactionId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ API error:", response.status, errorData);
          toast({
            title: "Erro ao verificar status",
            description: errorData.error || `Erro ${response.status}: Não foi possível verificar o status do pagamento`,
            variant: "destructive",
          });
          return false;
        }

        const data = await response.json();
        console.log("📊 Order data:", data);
        const order = data.order;

        if (!order) {
          console.error("❌ No order found in response");
          toast({
            title: "Pedido não encontrado",
            description: "Não foi possível encontrar o pedido. Tente novamente.",
            variant: "destructive",
          });
          return false;
        }

        console.log("📊 Order status:", order.status);

        if (order.status === "COMPLETED") {
          // Payment confirmed by webhook!
          toast({
            title: "Pagamento confirmado! 🎉",
            description: `Você recebeu ${formatUSDT(
              pixData?.usdtAmount || Number(order.amount)
            )} USDT`,
            duration: 5000,
          });

          // Show receipt
          setReceiptData({
            transactionId: transactionId,
            amount: pixData?.amount || Number(order.total),
            usdtAmount: pixData?.usdtAmount || Number(order.amount),
            date: new Date(),
          });

          // Close PIX modal
          setShowPixModal(false);

          // Show receipt modal
          setShowReceipt(true);

          // Refresh transaction history to get updated status from database
          // This ensures we have the latest status from the webhook-updated order
          await fetchTransactionHistory();
          return true; // Payment confirmed
        } else if (order.status === "FAILED") {
          toast({
            title: "Pagamento falhou",
            description:
              "O pagamento não foi confirmado. Tente novamente.",
            variant: "destructive",
          });
          return true; // Payment failed
        } else {
          // Still pending - show more helpful message
          let description = `Status atual: ${order.status}. `;
          
          if (data.synced) {
            description += "Tentamos sincronizar com NutzPay, mas o pagamento ainda está pendente. ";
          } else {
            description += "O pagamento ainda está sendo processado. ";
          }
          
          description += "Se você já fez o pagamento PIX, aguarde alguns minutos ou tente verificar novamente.";
          
          toast({
            title: "Pagamento pendente",
            description,
            duration: 5000,
          });
          return false;
        }
      } catch (error) {
        console.error("❌ Error checking payment status:", error);
        toast({
          title: "Erro ao verificar status",
          description: error instanceof Error ? error.message : "Não foi possível verificar o status do pagamento",
          variant: "destructive",
        });
        return false;
      } finally {
        setCheckingStatus(false);
      }
    },
    [pixData, toast, formatUSDT, fetchTransactionHistory]
  );

  // Check payment status when page becomes visible (user returns to tab)
  useEffect(() => {
    if (!pixData?.transactionId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // User returned to the page, check if payment was confirmed
        checkPaymentStatus(pixData.transactionId);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pixData?.transactionId, checkPaymentStatus]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-500 via-purple-600 to-brand-600 bg-clip-text text-transparent mb-2">
            Comprar USDT
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Compre USDT via PIX • Taxa de 3% sobre o valor
          </p>
        </div>

        {/* Purchase Card */}
        <Card className="rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm mb-6 sm:mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg sm:text-xl text-white">
                Comprar USDT via PIX
              </CardTitle>
              <Badge variant="secondary" className="bg-brand-500/20 text-brand-400 border-brand-500/30">
                {priceLoading
                  ? "Carregando..."
                  : `1 USDT = ${formatBRL(usdtPrice)}`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valor em BRL
              </label>
              <input
                type="text"
                value={buyBRL}
                onChange={handleBRLInputChange}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>

            <div className="bg-gray-800/30 rounded-xl p-4 space-y-2 border border-gray-700/50">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Valor base:</span>
                <span className="text-white">{formatBRL(buyAmountBRL)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Taxa (3%):</span>
                <span className="text-red-400">{formatBRL(buyFeeBRL)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-700">
                <span className="font-medium text-gray-300">Total a pagar:</span>
                <span className="font-semibold text-white text-lg">
                  {formatBRL(buyTotalBRL)}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-brand-500/20 to-green-500/20 rounded-xl p-4 sm:p-6 border border-brand-500/30">
              <div className="text-sm text-gray-300 mb-2">Você receberá:</div>
              <div className="text-2xl sm:text-3xl font-bold text-brand-400">
                {formatUSDT(buyUSDTReceived)} USDT
              </div>
            </div>

            <Button
              onClick={handleBuyConfirm}
              disabled={buyAmountBRL <= 0 || loading}
              className="w-full h-12 sm:h-14 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-base sm:text-lg"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processando...
                </>
              ) : (
                "Comprar USDT via PIX"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Histórico de Compras
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionHistory.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400 mb-1">Nenhuma compra realizada ainda</p>
                <p className="text-sm text-gray-500">
                  Suas compras aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactionHistory.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/50 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge
                            className={
                              transaction.status === "COMPLETED"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : transaction.status === "PENDING"
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                : "bg-red-500/20 text-red-400 border-red-500/30"
                            }
                          >
                            {transaction.status === "COMPLETED"
                              ? "Concluída"
                              : transaction.status === "PENDING"
                              ? "Pendente"
                              : "Falhou"}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {transaction.date.toLocaleDateString("pt-BR")} às{" "}
                            {transaction.date.toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs">Valor pago</p>
                            <p className="text-white font-medium">
                              {formatBRL(transaction.amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Recebido</p>
                            <p className="text-brand-400 font-semibold">
                              {formatUSDT(transaction.received)} USDT
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Taxa</p>
                            <p className="text-gray-300">
                              {formatBRL(transaction.fee)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Taxa</p>
                            <p className="text-gray-300">
                              @ {formatBRL(transaction.rate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs sm:text-sm text-gray-400">
            • As cotações são atualizadas em tempo real
            <br />
            • Taxa de 3% aplicada em todas as operações
            <br />• Pagamento via PIX com confirmação automática
          </p>
        </div>
      </div>

      {/* PIX QR Code Modal */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="bg-[#1E1E1E] border-gray-800 text-white max-w-6xl w-full">
          <DialogHeader>
            <DialogTitle className="text-white">
              Escaneie o QR Code PIX
            </DialogTitle>
            <DialogDescription className="text-[#A1A1AA]">
              Escaneie o código abaixo com o app do seu banco para finalizar o
              pagamento
            </DialogDescription>
          </DialogHeader>
          {pixData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - PIX Payment Info */}
              <div className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  {pixData.qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                      alt="QR Code PIX"
                      className="w-64 h-64 border border-gray-700 rounded-lg"
                    />
                  ) : (
                    <div className="w-64 h-64 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center">
                      <p className="text-[#A1A1AA] text-sm">
                        QR Code não disponível
                      </p>
                    </div>
                  )}
                  <div className="text-center space-y-2">
                    <p className="text-sm text-[#A1A1AA]">Valor:</p>
                    <p className="text-2xl font-bold text-[#10B981]">
                      {formatBRL(pixData.amount)}
                    </p>
                    <p className="text-sm text-[#A1A1AA]">
                      Você receberá: {formatUSDT(pixData.usdtAmount)} USDT
                    </p>
                  </div>
                </div>

                {/* Copy Button with PIX Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Código PIX (Copia e Cola):
                  </label>
                  <button
                    onClick={copyPixCode}
                    disabled={!pixData.qrCode}
                    className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed border-2 border-yellow-500/50 hover:border-yellow-500/70 text-white rounded-lg transition-colors flex items-center justify-between gap-2 font-medium min-h-[56px]"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-green-400 font-semibold">Código copiado!</span>
                      </>
                    ) : pixData.qrCode ? (
                      <>
                        <code className="flex-1 text-xs text-left font-mono break-all pr-2 text-gray-200">
                          {pixData.qrCode}
                        </code>
                        <Copy className="w-5 h-5 flex-shrink-0 text-yellow-400" />
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-400 text-left">
                          Código PIX não disponível. Use o QR Code acima para escanear.
                        </span>
                        <Copy className="w-5 h-5 flex-shrink-0 text-gray-500" />
                      </>
                    )}
                  </button>
                </div>

                {/* Check Status Button */}
                <button
                  onClick={async () => {
                    if (pixData?.transactionId) {
                      await checkPaymentStatus(pixData.transactionId);
                    } else {
                      toast({
                        title: "Erro",
                        description: "ID da transação não encontrado",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={checkingStatus}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  {checkingStatus ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Verificando...
                    </>
                  ) : (
                    "Verificar Status do Pagamento"
                  )}
                </button>

                <p className="text-xs text-[#A1A1AA] text-center mt-4">
                  Após o pagamento, seus USDT serão creditados automaticamente via webhook.
                  Você pode verificar o status a qualquer momento.
                </p>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="bg-[#1E1E1E] border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Check className="w-6 h-6 text-green-400" />
              Pagamento Confirmado!
            </DialogTitle>
            <DialogDescription className="text-[#A1A1AA]">
              Seu pagamento foi processado com sucesso
            </DialogDescription>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#A1A1AA]">Valor pago:</span>
                  <span className="text-xl font-bold text-white">
                    {formatBRL(receiptData.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#A1A1AA]">USDT recebido:</span>
                  <span className="text-xl font-bold text-[#10B981]">
                    {formatUSDT(receiptData.usdtAmount)} USDT
                  </span>
                </div>
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[#A1A1AA]">
                      ID da transação:
                    </span>
                    <span className="text-xs font-mono text-white">
                      {receiptData.transactionId.substring(0, 20)}...
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#A1A1AA]">Data:</span>
                    <span className="text-sm text-white">
                      {receiptData.date.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReceipt(false);
                  setReceiptData(null);
                }}
                className="w-full py-3 bg-[#10B981] hover:bg-[#059669] text-white font-semibold rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TradePage;
