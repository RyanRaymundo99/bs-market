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
import {
  Copy,
  Check,
  TrendingUp,
  Clock,
  QrCode,
  Loader2,
  Wallet,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const TradePage = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();

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
  const [buyUSDT, setBuyUSDT] = useState<string>("");
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
      isRecent?: boolean;
    }>
  >([]);

  // Track which transactions are in loading state (recently created, status being determined)
  const [loadingTransactions, setLoadingTransactions] = useState<Set<string>>(
    new Set()
  );

  // Store PIX data by transaction ID so we can reopen the modal for pending payments
  // Load from localStorage on mount
  const [storedPixData, setStoredPixData] = useState<
    Map<
      string,
      {
        qrCode: string;
        qrCodeBase64: string | null;
        qrCodeUrl: string | null;
        amount: number;
        usdtAmount: number;
        transactionId: string;
      }
    >
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pixData");
        if (stored) {
          const parsed = JSON.parse(stored);
          return new Map(Object.entries(parsed));
        }
      } catch (error) {
        console.error("Error loading PIX data from localStorage:", error);
      }
    }
    return new Map();
  });

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

  // Format USDT input value (for display in input field)
  const formatUSDTInput = (value: string): string => {
    // Remove all non-digit characters except comma and dot
    const cleaned = value.replace(/[^\d,.]/g, "");

    // Handle empty
    if (!cleaned) return "";

    // Replace comma with dot for parsing, then format
    const normalized = cleaned.replace(",", ".");
    const parts = normalized.split(".");
    const integerPart = parts[0].replace(/\D/g, "");
    const decimalPart = parts[1]?.replace(/\D/g, "").slice(0, 4) || ""; // USDT can have up to 4 decimals

    // Format integer part with thousand separators
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // Combine parts
    if (decimalPart) {
      return `${formattedInteger},${decimalPart}`;
    } else if (normalized.includes(".") || cleaned.includes(",")) {
      return `${formattedInteger},`;
    } else {
      return formattedInteger;
    }
  };

  // Parse USDT input value (convert formatted string to number)
  const parseUSDTInput = (value: string): number => {
    if (!value) return 0;
    // Replace Brazilian format (dots as thousand separators, comma as decimal)
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Handle USDT input change
  const handleUSDTInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatUSDTInput(inputValue);
    setBuyUSDT(formatted);
  };

  // Cálculos para compra (USDT → BRL)
  // User enters USDT amount, we calculate BRL total with 3% fee
  const buyUSDTAmount = parseUSDTInput(buyUSDT); // USDT amount user wants
  const buyBaseBRL = buyUSDTAmount * usdtPrice; // Base BRL amount (USDT * exchange rate)
  const buyFeeBRL = buyBaseBRL * FEE_RATE; // 3% fee on base amount
  const buyTotalBRL = buyBaseBRL + buyFeeBRL; // Total to charge (base + 3% fee)

  // Check user approval status on mount and logout if rejected
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const response = await fetch("/api/user/status");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            // If user is rejected, logout and redirect to home
            if (data.user.approvalStatus === "REJECTED") {
              try {
                // Call logout API
                await fetch("/api/auth/logout", {
                  method: "POST",
                  credentials: "include",
                });

                // Clear local storage
                localStorage.removeItem("auth-session");
                localStorage.removeItem("user");
                sessionStorage.clear();

                // Store rejection message
                const message =
                  language === "pt"
                    ? "Sua conta foi rejeitada. Entre em contato com o suporte."
                    : "Your account has been rejected. Please contact support.";
                sessionStorage.setItem("rejectionMessage", message);

                // Redirect to home page
                window.location.href = "/";
              } catch (error) {
                console.error("Error during logout:", error);
                // Even if logout fails, clear storage and redirect
                localStorage.removeItem("auth-session");
                localStorage.removeItem("user");
                sessionStorage.clear();
                sessionStorage.setItem(
                  "rejectionMessage",
                  language === "pt"
                    ? "Sua conta foi rejeitada. Entre em contato com o suporte."
                    : "Your account has been rejected. Please contact support."
                );
                window.location.href = "/";
              }
              return;
            }

            // If user is pending, redirect to profile page
            if (data.user.approvalStatus === "PENDING") {
              toast({
                title: language === "pt" ? "Conta Pendente" : "Account Pending",
                description:
                  language === "pt"
                    ? "Sua conta está pendente de aprovação. Complete seu cadastro no perfil antes de comprar."
                    : "Your account is pending approval. Complete your profile before purchasing.",
                variant: "destructive",
              });
              window.location.href = "/profile";
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error checking user status:", error);
      }
    };
    checkUserStatus();
  }, [language]);

  // Fetch USDT rate and transaction history on mount - PARALLEL
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchUSDTRate(), fetchTransactionHistory()]);
    };
    loadData();
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

              // Check if this is a recent transaction (within last 10 seconds)
              const orderDate = new Date(order.createdAt);
              const isRecent = Date.now() - orderDate.getTime() < 10000;

              return {
                id: transactionId,
                date: orderDate,
                type: "buy" as const,
                amount: total, // Total paid
                received: parseFloat(order.amount.toString()),
                fee: fee,
                rate: parseFloat(order.price.toString()),
                status: order.status,
                isRecent: isRecent, // Mark as recent
              };
            });

          // Update transaction history
          setTransactionHistory(buyOrders);

          // Mark recent transactions as loading if they're not COMPLETED
          setLoadingTransactions((prev) => {
            const newSet = new Set(prev);
            buyOrders.forEach((order) => {
              if (order.isRecent && order.status !== "COMPLETED") {
                newSet.add(order.id);
                // Auto-remove from loading after 10 seconds
                setTimeout(() => {
                  setLoadingTransactions((current) => {
                    const updated = new Set(current);
                    updated.delete(order.id);
                    return updated;
                  });
                }, 10000);
              } else if (order.status === "COMPLETED") {
                // Remove from loading if completed
                newSet.delete(order.id);
              }
            });
            return newSet;
          });

          // Clean up PIX data for completed transactions
          setStoredPixData((prev) => {
            const newMap = new Map(prev);
            let hasChanges = false;

            buyOrders.forEach((order) => {
              if (order.status === "COMPLETED" && newMap.has(order.id)) {
                newMap.delete(order.id);
                hasChanges = true;
              }
            });

            // Update localStorage if there were changes
            if (hasChanges && typeof window !== "undefined") {
              try {
                const obj = Object.fromEntries(newMap);
                localStorage.setItem("pixData", JSON.stringify(obj));
              } catch (error) {
                console.error(
                  "Error updating PIX data in localStorage:",
                  error
                );
              }
            }

            return newMap;
          });
        }
      }
    } catch (error) {
      console.error("Error fetching transaction history:", error);
    }
  };

  const handleBuyConfirm = async () => {
    if (buyUSDTAmount <= 0) {
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
          usdt_amount: buyUSDTAmount, // USDT amount user wants
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

        // Debug logging removed for production

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
                    const imageData = ctx.getImageData(
                      0,
                      0,
                      canvas.width,
                      canvas.height
                    );
                    const code = jsQR(
                      imageData.data,
                      imageData.width,
                      imageData.height
                    );
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
              const base64Data = qrCodeBase64.includes(",")
                ? qrCodeBase64
                : `data:image/png;base64,${qrCodeBase64}`;
              img.src = base64Data;
            });

            if (decodedCode) {
              console.log("✅ Successfully decoded PIX code from QR image!");
              console.log(
                "Decoded PIX code:",
                decodedCode.substring(0, 50) + "..."
              );
              pixCode = decodedCode;
            } else {
              console.log("⚠️ Could not decode PIX code from QR image");
            }
          } catch (error) {
            console.error("Error importing or using jsQR:", error);
          }
        }

        // Store PIX data for this transaction so we can reopen the modal later
        const pixDataForTransaction = {
          qrCode: pixCode,
          qrCodeBase64: qrCodeBase64,
          qrCodeUrl: qrCodeUrl,
          amount: data.data.amount_brl,
          usdtAmount: data.data.amount_usdt,
          transactionId: data.data.transaction_id,
        };

        // Store PIX data by transaction ID (in memory and localStorage)
        setStoredPixData((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.data.transaction_id, pixDataForTransaction);

          // Also save to localStorage for persistence
          if (typeof window !== "undefined") {
            try {
              const obj = Object.fromEntries(newMap);
              localStorage.setItem("pixData", JSON.stringify(obj));
            } catch (error) {
              console.error("Error saving PIX data to localStorage:", error);
            }
          }

          return newMap;
        });

        // Show PIX QR code modal
        setPixData(pixDataForTransaction);
        setShowPixModal(true);
        setBuyUSDT(""); // Clear the field

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

        // Mark this transaction as loading for 10 seconds to prevent premature status display
        const transactionId = data.data.transaction_id;
        setLoadingTransactions((prev) => new Set(prev).add(transactionId));

        // Remove from loading state after 10 seconds
        setTimeout(() => {
          setLoadingTransactions((prev) => {
            const newSet = new Set(prev);
            newSet.delete(transactionId);
            return newSet;
          });
          // Refetch to get actual status
          fetchTransactionHistory();
        }, 10000);

        toast({
          title: "Compra iniciada!",
          description:
            language === "pt"
              ? "Escaneie o QR Code PIX para finalizar o pagamento"
              : "Scan the PIX QR Code to complete payment",
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
          description:
            language === "pt"
              ? "Código PIX copiado para a área de transferência"
              : "PIX code copied to clipboard",
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-500 via-purple-600 to-brand-600 bg-clip-text text-transparent mb-2">
            {t("buyUSDT")}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t("buyUSDTViaPIX")} • {t("fee")}
          </p>
        </div>

        {/* Purchase Card */}
        <Card className="rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm mb-6 sm:mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg sm:text-xl text-white">
                {t("buyUSDTViaPIX")}
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-brand-500/20 text-brand-400 border-brand-500/30"
              >
                {priceLoading
                  ? language === "pt"
                    ? "Carregando..."
                    : "Loading..."
                  : `1 USDT = ${formatBRL(usdtPrice)}`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {language === "pt" ? "Quantidade de USDT:" : "USDT Amount:"}
              </label>
              <input
                type="text"
                value={buyUSDT}
                onChange={handleUSDTInputChange}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>

            {/* Total BRL to pay with PIX icon */}
            {buyUSDTAmount > 0 && (
              <div className="bg-gradient-to-br from-green-500/20 to-brand-500/20 rounded-xl p-4 sm:p-6 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="w-5 h-5 text-green-400" />
                  <div className="text-sm text-gray-300">
                    {language === "pt"
                      ? "Total a pagar via PIX:"
                      : "Total to pay via PIX:"}
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-green-400 flex items-center gap-2">
                  {formatBRL(buyTotalBRL)}
                  <span className="text-sm font-normal text-gray-400">BRL</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>
                      {language === "pt" ? "Valor base:" : "Base amount:"}
                    </span>
                    <span className="text-gray-300">
                      {formatBRL(buyBaseBRL)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>
                      {language === "pt" ? "Taxa (3%):" : "Fee (3%):"}
                    </span>
                    <span className="text-red-400">{formatBRL(buyFeeBRL)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-brand-500/20 to-green-500/20 rounded-xl p-4 sm:p-6 border border-brand-500/30">
              <div className="text-sm text-gray-300 mb-2">
                {language === "pt" ? "Você receberá:" : "You will receive:"}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-brand-400">
                {formatUSDT(buyUSDTAmount)} USDT
              </div>
            </div>

            <Button
              onClick={handleBuyConfirm}
              disabled={buyUSDTAmount <= 0 || loading}
              className="w-full h-12 sm:h-14 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-base sm:text-lg"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {language === "pt" ? "Processando..." : "Processing..."}
                </>
              ) : (
                t("confirmPurchase")
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t("purchaseHistory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionHistory.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400 mb-1">{t("noPurchases")}</p>
                <p className="text-sm text-gray-500">
                  {t("purchasesWillAppear")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactionHistory.map((transaction) => {
                  const hasPixData = storedPixData.has(transaction.id);
                  const isPending = transaction.status === "PENDING";
                  const isClickable = isPending && hasPixData;
                  const isLoading = loadingTransactions.has(transaction.id);

                  return (
                    <div
                      key={transaction.id}
                      onClick={() => {
                        if (isClickable) {
                          const pixData = storedPixData.get(transaction.id);
                          if (pixData) {
                            setPixData(pixData);
                            setShowPixModal(true);
                          }
                        }
                      }}
                      className={`p-4 rounded-xl bg-gray-800/30 border border-gray-700/50 transition-colors ${
                        isClickable
                          ? "hover:bg-gray-800/60 cursor-pointer hover:border-yellow-500/50"
                          : "hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {isLoading ? (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1.5">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {language === "pt"
                                  ? "Verificando..."
                                  : "Checking..."}
                              </Badge>
                            ) : (
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
                                  ? t("completed")
                                  : transaction.status === "PENDING"
                                  ? t("pending")
                                  : t("failed")}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-400">
                              {transaction.date.toLocaleDateString(
                                language === "pt" ? "pt-BR" : "en-US"
                              )}{" "}
                              {language === "pt" ? "às" : "at"}{" "}
                              {transaction.date.toLocaleTimeString(
                                language === "pt" ? "pt-BR" : "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                            {isPending && hasPixData && (
                              <span className="text-xs text-yellow-400/70 flex items-center gap-1">
                                <QrCode className="w-3 h-3" />
                                {t("clickToSeeQRCode")}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                            <div>
                              <p className="text-gray-400 text-xs">
                                {t("amountPaid")}
                              </p>
                              <p className="text-white font-medium">
                                {formatBRL(transaction.amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">
                                {t("received")}
                              </p>
                              <p className="text-brand-400 font-semibold">
                                {formatUSDT(transaction.received)} USDT
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">
                                {t("feeAmount")}
                              </p>
                              <p className="text-gray-300">
                                {formatBRL(transaction.fee)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">
                                {t("feeAmount")}
                              </p>
                              <p className="text-gray-300">
                                @ {formatBRL(transaction.rate)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs sm:text-sm text-gray-400">
            • {t("quotesUpdated")}
            <br />• {t("feeApplied")}
            <br />• {t("pixPayment")}
          </p>
        </div>
      </div>

      {/* PIX QR Code Modal */}
      <Dialog
        open={showPixModal}
        onOpenChange={(open) => {
          setShowPixModal(open);
          // When modal closes, wait a bit before refetching to avoid race conditions
          // This prevents showing "FAILED" status immediately after closing if payment is still processing
          if (!open && pixData) {
            // Mark transaction as loading when modal closes
            setLoadingTransactions((prev) =>
              new Set(prev).add(pixData.transactionId)
            );

            // Remove from loading after 8 seconds and refetch
            setTimeout(() => {
              setLoadingTransactions((prev) => {
                const newSet = new Set(prev);
                newSet.delete(pixData.transactionId);
                return newSet;
              });
              fetchTransactionHistory();
            }, 8000); // 8 second delay to allow webhook processing
          }
        }}
      >
        <DialogContent className="bg-[#1E1E1E] border-gray-800 text-white max-w-2xl w-full p-4 sm:p-6">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-white text-lg sm:text-xl">
              {t("scanQRCode")}
            </DialogTitle>
            <DialogDescription className="text-[#A1A1AA] text-sm">
              {language === "pt"
                ? "Escaneie o código abaixo com o app do seu banco para finalizar o pagamento"
                : "Scan the code below with your bank app to complete payment"}
            </DialogDescription>
          </DialogHeader>
          {pixData && (
            <div className="space-y-4 sm:space-y-5">
              {/* QR Code and Amount - Centered */}
              <div className="flex flex-col items-center space-y-3">
                {pixData.qrCodeBase64 ? (
                  <img
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-gray-700 rounded-xl"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 bg-gray-900 border-2 border-gray-700 rounded-xl flex items-center justify-center">
                    <p className="text-[#A1A1AA] text-sm">
                      {language === "pt"
                        ? "QR Code não disponível"
                        : "QR Code not available"}
                    </p>
                  </div>
                )}
                <div className="text-center space-y-1">
                  <p className="text-xs text-[#A1A1AA]">Valor:</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#10B981]">
                    {formatBRL(pixData.amount)}
                  </p>
                  <p className="text-xs sm:text-sm text-[#A1A1AA]">
                    Você receberá: {formatUSDT(pixData.usdtAmount)} USDT
                  </p>
                </div>
              </div>

              {/* Copy Button with PIX Code */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-300">
                  Código PIX (Copia e Cola):
                </label>
                <button
                  onClick={copyPixCode}
                  disabled={!pixData.qrCode}
                  className="w-full py-2.5 px-3 sm:py-3 sm:px-4 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed border-2 border-yellow-500/50 hover:border-yellow-500/70 text-white rounded-lg transition-colors flex items-center justify-between gap-2 font-medium min-h-[52px]"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                      <span className="text-sm sm:text-base text-green-400 font-semibold">
                        {t("codeCopied")}
                      </span>
                    </>
                  ) : pixData.qrCode ? (
                    <>
                      <code className="flex-1 text-[10px] sm:text-xs text-left font-mono break-all pr-2 text-gray-200">
                        {pixData.qrCode}
                      </code>
                      <Copy className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-yellow-400" />
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-xs sm:text-sm text-gray-400 text-left">
                        {t("pixCodeNotAvailable")}
                      </span>
                      <Copy className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-gray-500" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-[10px] sm:text-xs text-[#A1A1AA] text-center pt-2">
                {t("paymentInstructions")}
              </p>
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
