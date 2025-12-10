"use client";

import React, { useState, useCallback, useEffect } from "react";
import NavbarNew from "@/components/ui/navbar-new";
import Breadcrumb from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check } from "lucide-react";

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
  const [webhookTestPayload, setWebhookTestPayload] = useState<string>("");
  const [webhookTestLoading, setWebhookTestLoading] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

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
        const pixCode =
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
    <div className="min-h-screen bg-black text-white">
      <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Trade" },
          ]}
        />
      </div>
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Comprar USDT</h1>
          <p className="text-[#A1A1AA]">
            Compre USDT via PIX • Taxa de 3% sobre o valor
          </p>
        </div>

        {/* Boleta de Compra */}
        <div className="bg-[#1E1E1E] rounded-xl p-6 border border-gray-800 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              Comprar USDT via PIX
            </h2>
            <span className="text-sm text-[#A1A1AA]">
              {priceLoading
                ? "Carregando..."
                : `1 USDT = ${formatBRL(usdtPrice)}`}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#A1A1AA] mb-2">
                Valor em BRL
              </label>
              <input
                type="text"
                value={buyBRL}
                onChange={handleBRLInputChange}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors"
              />
            </div>

            <div className="text-sm text-[#A1A1AA] space-y-1">
              <div className="flex justify-between">
                <span>Valor base:</span>
                <span>{formatBRL(buyAmountBRL)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa (3%):</span>
                <span className="text-red-400">{formatBRL(buyFeeBRL)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-700">
                <span className="font-medium">Total a pagar:</span>
                <span className="font-semibold text-white">
                  {formatBRL(buyTotalBRL)}
                </span>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-[#A1A1AA] mb-1">Você receberá:</div>
              <div className="text-2xl font-bold text-[#10B981]">
                {formatUSDT(buyUSDTReceived)} USDT
              </div>
            </div>

            <button
              onClick={handleBuyConfirm}
              disabled={buyAmountBRL <= 0 || loading}
              className="w-full py-3 bg-[#10B981] hover:bg-[#059669] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? "Processando..." : "Comprar USDT via PIX"}
            </button>
          </div>
        </div>

        {/* Histórico de Transações */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            Histórico de Compras
          </h2>

          {transactionHistory.length === 0 ? (
            <div className="bg-[#1E1E1E] rounded-xl p-8 border border-gray-800 text-center">
              <div className="text-[#A1A1AA] mb-2">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-[#A1A1AA]">Nenhuma compra realizada ainda</p>
              <p className="text-sm text-gray-600 mt-1">
                Suas compras aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 overflow-hidden">
              {/* Sync All Button */}
              {transactionHistory.some((t) => t.status === "PENDING") && (
                <div className="p-4 bg-gray-900 border-b border-gray-800">
                  <button
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const response = await fetch("/api/crypto/sync-all-pending", {
                          method: "POST",
                        });
                        const data = await response.json();
                        
                        if (response.ok) {
                          toast({
                            title: "✅ Sincronização Concluída",
                            description: `${data.results.synced} pedido(s) atualizado(s)`,
                            duration: 5000,
                          });
                          // Refresh transaction history
                          await fetchTransactionHistory();
                        } else {
                          toast({
                            title: "Erro",
                            description: data.error || "Falha ao sincronizar",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Erro",
                          description: "Não foi possível sincronizar",
                          variant: "destructive",
                        });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white text-sm rounded font-medium"
                  >
                    {loading ? "Sincronizando..." : "🔄 Sincronizar Todos os Pendentes"}
                  </button>
                </div>
              )}
              
              {/* Header da tabela */}
              <div className="grid grid-cols-5 gap-4 p-4 bg-gray-900 border-b border-gray-800 text-sm font-medium text-[#A1A1AA]">
                <div>Data/Hora</div>
                <div>Status</div>
                <div>Valor</div>
                <div>Recebido</div>
                <div>Taxa</div>
              </div>

              {/* Lista de transações */}
              <div className="max-h-96 overflow-y-auto">
                {transactionHistory.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="grid grid-cols-5 gap-4 p-4 border-b border-gray-800 hover:bg-gray-900/50 transition-colors last:border-b-0"
                  >
                    {/* Data/Hora */}
                    <div className="text-sm">
                      <div className="text-white">
                        {transaction.date.toLocaleDateString("pt-BR")}
                      </div>
                      <div className="text-[#A1A1AA] text-xs">
                        {transaction.date.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.status === "COMPLETED"
                            ? "bg-green-900/30 text-green-400 border border-green-800"
                            : transaction.status === "PENDING"
                            ? "bg-yellow-900/30 text-yellow-400 border border-yellow-800"
                            : "bg-red-900/30 text-red-400 border border-red-800"
                        }`}
                      >
                        {transaction.status === "COMPLETED"
                          ? "Concluída"
                          : transaction.status === "PENDING"
                          ? "Pendente"
                          : "Falhou"}
                      </span>
                      {transaction.status === "PENDING" && (
                        <button
                          onClick={async () => {
                            if (transaction.id) {
                              await checkPaymentStatus(transaction.id);
                            }
                          }}
                          disabled={checkingStatus}
                          className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                          title="Sincronizar este pedido"
                        >
                          🔄
                        </button>
                      )}
                    </div>

                    {/* Valor */}
                    <div className="text-sm">
                      <div className="text-white">
                        {formatBRL(transaction.amount)}
                      </div>
                      <div className="text-[#A1A1AA] text-xs">
                        @ {formatBRL(transaction.rate)}
                      </div>
                    </div>

                    {/* Recebido */}
                    <div className="text-sm">
                      <div className="font-medium text-green-400">
                        {formatUSDT(transaction.received)} USDT
                      </div>
                    </div>

                    {/* Taxa */}
                    <div className="text-sm text-[#A1A1AA]">
                      {formatBRL(transaction.fee)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Informações adicionais */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#A1A1AA]">
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
                
                {/* PIX Code Display */}
                {pixData.qrCode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A1A1AA]">
                      Código PIX (Copia e Cola):
                    </label>
                    <div className="relative">
                      <div className="flex items-center gap-2 p-3 bg-gray-900 border border-gray-700 rounded-lg">
                        <code className="flex-1 text-xs text-white break-all font-mono pr-2">
                          {pixData.qrCode}
                        </code>
                        <button
                          onClick={copyPixCode}
                          className="flex-shrink-0 p-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
                          title="Copiar código PIX"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Copy Button */}
                <button
                  onClick={copyPixCode}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 text-green-400" />
                      Código copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar código PIX
                    </>
                  )}
                </button>
                
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

                  {/* Manual Sync Button - Shows if API check fails */}
                  <button
                    onClick={async () => {
                      if (!pixData?.transactionId) {
                        toast({
                          title: "Erro",
                          description: "ID da transação não encontrado",
                          variant: "destructive",
                        });
                        return;
                      }

                      setCheckingStatus(true);
                      try {
                        // Manually trigger a webhook with completed status
                        const payload = {
                          event: "transaction.completed",
                          data: {
                            transaction_id: pixData.transactionId,
                            external_id: pixData.transactionId,
                            status: "COMPLETED",
                            amount: pixData.amount,
                            currency: "BRL",
                            type: "PIX",
                            usdt_amount: pixData.usdtAmount,
                            created_at: new Date().toISOString(),
                            completed_at: new Date().toISOString(),
                          },
                          timestamp: new Date().toISOString(),
                        };

                        const response = await fetch("/api/webhooks/nutzpay", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "x-test-webhook": "true",
                          },
                          body: JSON.stringify(payload),
                        });

                        const result = await response.json();

                        if (response.ok) {
                          toast({
                            title: "✅ Status Atualizado",
                            description: "O pagamento foi marcado como confirmado manualmente.",
                            duration: 5000,
                          });

                          // Refresh payment status
                          setTimeout(() => {
                            checkPaymentStatus(pixData.transactionId);
                          }, 1000);
                        } else {
                          toast({
                            title: "Erro",
                            description: result.error || "Falha ao atualizar status",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        console.error("Error syncing status:", error);
                        toast({
                          title: "Erro",
                          description: "Não foi possível sincronizar o status",
                          variant: "destructive",
                        });
                      } finally {
                        setCheckingStatus(false);
                      }
                    }}
                    disabled={checkingStatus}
                    className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 disabled:opacity-50 text-white text-sm rounded font-medium"
                  >
                    🔄 Sincronizar Manualmente (se API falhar)
                  </button>
                
                <p className="text-xs text-[#A1A1AA] text-center">
                  Após o pagamento, seus USDT serão creditados automaticamente via webhook.
                  Você pode verificar o status a qualquer momento.
                </p>
              </div>

              {/* Right Column - Webhook Test Section */}
              <div className="space-y-4 border-l border-gray-700 pl-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    🧪 Testar Webhook (Desenvolvimento)
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Teste o webhook manualmente para verificar se o pagamento será confirmado
                  </p>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          if (pixData) {
                            // Use the flat format that NutzPay actually sends (matches webhook.site format)
                            const payload = {
                              event: "payment.confirmed",
                              transaction_id: pixData.transactionId,
                              status: "COMPLETED",
                              amount: pixData.usdtAmount, // USDT amount
                              currency: "USDT",
                              amount_paid_brl: pixData.amount, // BRL amount paid
                              payment_method: "PIX_TO_USDT",
                              acquirer: "MERCADOPAGO",
                              created_at: new Date().toISOString(),
                              completed_at: new Date().toISOString(),
                              metadata: {},
                            };
                            setWebhookTestPayload(JSON.stringify(payload, null, 2));
                          }
                        }}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded font-medium"
                      >
                        ✅ Completed
                      </button>
                      <button
                        onClick={() => {
                          if (pixData) {
                            // Use the flat format that NutzPay actually sends
                            const payload = {
                              event: "payment.received",
                              transaction_id: pixData.transactionId,
                              external_id: `purchase_${pixData.transactionId}`, // Our external_id format
                              status: "pending",
                              amount: pixData.usdtAmount,
                              amount_brl: pixData.amount,
                              created_at: new Date().toISOString(),
                            };
                            setWebhookTestPayload(JSON.stringify(payload, null, 2));
                          }
                        }}
                        className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded font-medium"
                      >
                        ⏳ Pending
                      </button>
                      <button
                        onClick={() => {
                          if (pixData) {
                            // Use the flat format that NutzPay actually sends
                            const payload = {
                              event: "payment.failed",
                              transaction_id: pixData.transactionId,
                              status: "FAILED",
                              amount: pixData.usdtAmount,
                              currency: "USDT",
                              amount_paid_brl: pixData.amount,
                              payment_method: "PIX_TO_USDT",
                              created_at: new Date().toISOString(),
                              metadata: {},
                            };
                            setWebhookTestPayload(JSON.stringify(payload, null, 2));
                          }
                        }}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded font-medium"
                      >
                        ❌ Failed
                      </button>
                    </div>

                    <textarea
                      value={webhookTestPayload}
                      onChange={(e) => setWebhookTestPayload(e.target.value)}
                      className="w-full h-64 p-3 bg-gray-900 border border-gray-700 rounded text-white font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder='{"event": "payment.confirmed", "transaction_id": "...", "status": "COMPLETED", ...}'
                    />

                    <button
                      onClick={async () => {
                        if (!webhookTestPayload) {
                          toast({
                            title: "Erro",
                            description: "Payload vazio",
                            variant: "destructive",
                          });
                          return;
                        }

                        setWebhookTestLoading(true);
                        setWebhookTestResult(null);

                        try {
                          const payload = JSON.parse(webhookTestPayload);
                          const response = await fetch("/api/webhooks/nutzpay", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "x-test-webhook": "true",
                            },
                            body: JSON.stringify(payload),
                          });

                          const result = await response.json();

                          if (response.ok) {
                            setWebhookTestResult({
                              success: true,
                              message: result.message || "Webhook processado com sucesso",
                            });
                            toast({
                              title: "✅ Webhook Testado",
                              description: "Webhook foi processado. Verifique o status do pedido.",
                            });
                            // Refresh payment status
                            if (pixData?.transactionId) {
                              setTimeout(() => {
                                checkPaymentStatus(pixData.transactionId);
                              }, 1000);
                            }
                          } else {
                            setWebhookTestResult({
                              success: false,
                              message: result.error || "Erro ao processar webhook",
                            });
                            toast({
                              title: "❌ Erro",
                              description: result.error || "Falha ao testar webhook",
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          setWebhookTestResult({
                            success: false,
                            message: error instanceof Error ? error.message : "Erro desconhecido",
                          });
                          toast({
                            title: "❌ Erro",
                            description: "Payload inválido",
                            variant: "destructive",
                          });
                        } finally {
                          setWebhookTestLoading(false);
                        }
                      }}
                      disabled={webhookTestLoading || !webhookTestPayload}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white text-sm rounded font-medium"
                    >
                      {webhookTestLoading ? "Testando..." : "Enviar Teste de Webhook"}
                    </button>

                    {webhookTestResult && (
                      <div
                        className={`p-3 rounded text-sm ${
                          webhookTestResult.success
                            ? "bg-green-900/30 text-green-400 border border-green-800"
                            : "bg-red-900/30 text-red-400 border border-red-800"
                        }`}
                      >
                        {webhookTestResult.success ? "✅" : "❌"}{" "}
                        {webhookTestResult.message}
                      </div>
                    )}
                  </div>
                </div>
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
