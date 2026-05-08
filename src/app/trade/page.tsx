"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import NavbarNew from "@/components/ui/navbar-new";
import { GlobalKYCBanner } from "@/components/GlobalKYCBanner";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  Check,
  TrendingUp,
  Clock,
  QrCode,
  Wallet,
  Coins,
  Home,
  Plus,
  Minus,
  MessageCircle,
  FileText,
  Download,
} from "lucide-react";
import { ButtonLoader, Spinner } from "@/components/ui/loading";
import { useLanguage } from "@/contexts/LanguageContext";
import QRCode from "qrcode";
import { TransactionReceipt } from "@/components/TransactionReceipt";
import { PixPaymentDialog } from "@/components/trade/PixPaymentDialog";
import { useMobileMenuOpen } from "@/hooks/useMobileMenuOpen";
import {
  CRYPTO_CURRENCIES,
  CRYPTO_NETWORK_LABELS,
  CryptoCurrency,
  CryptoNetwork,
  getCryptoNetworks,
  getDefaultCryptoNetwork,
} from "@/lib/crypto-assets";

import { handleLogout as performLogout } from "../../lib/auth-utils";
import { formatUSDTInput, parseUSDTInput, formatBRL, formatUSDT, getWhatsAppUrlForLargeDeposit } from "../../lib/trade-utils";
const WHATSAPP_SUPPORT_URL = `https://wa.me/${
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5511984284867"
}`;

const TradePage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  // Admin-controlled switch and limits from site-status
  const [moneyDisabled, setMoneyDisabled] = useState(false);
  const [moneyDisabledMessage, setMoneyDisabledMessage] = useState<string>("");
  const [maxDepositUsdt, setMaxDepositUsdt] = useState(1000000);
  const [userDailyLimit, setUserDailyLimit] = useState(5000);
  const [inMaintenance, setInMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>("");

  const [isMobile, setIsMobile] = useState(false);
  const mobileMenuOpen = useMobileMenuOpen();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth <= 768
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const loadMoneyStatus = async () => {
      try {
        const response = await fetch("/api/site-status");
        if (!response.ok) return;
        const data = await response.json();
        if (data?.success) {
          setMoneyDisabled(Boolean(data.depositsDisabled));
          setMoneyDisabledMessage(String(data.depositsDisabledMessage || ""));
          setMaxDepositUsdt(Number(data.maxDepositUsdt) || 1000000);
          const inMaint = Boolean(data.inMaintenance);
          const blockTrade = Boolean(data.blockTrade);
          const tradeDisabled = Boolean(data.tradeDisabled);
          setInMaintenance(inMaint || blockTrade || tradeDisabled);
          setMaintenanceMessage(
            data.maintenanceMessage
              ? String(data.maintenanceMessage)
              : tradeDisabled && !inMaint
              ? "Trading is temporarily disabled."
              : ""
          );
        }
      } catch (error) {
        console.error("Failed to load site status:", error);
      }
    };
    loadMoneyStatus();
  }, []);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    await performLogout();
    // The page will redirect, so no need to setIsLoggingOut(false)
  }, []);
  
  // Track previous history to detect completed payments
  const prevHistoryRef = useRef<Array<{ id: string; status: string }>>([]);

  // Deposit method toggle (PIX or Crypto)
  const [depositMethod, setDepositMethod] = useState<"PIX" | "CRYPTO">("PIX");

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
    /** Deposit row id — required for /api/deposit/crypto/hash */
    depositId?: string;
    amount: number;
    usdtAmount: number;
    currency?: CryptoCurrency;
    date: Date;
    type?: string;
  } | null>(null);

  // Crypto deposit states
  const [cryptoAmount, setCryptoAmount] = useState<string>("");

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

  const [cryptoCurrency, setCryptoCurrency] = useState<CryptoCurrency>("USDT");
  const [cryptoNetwork, setCryptoNetwork] =
    useState<CryptoNetwork>(getDefaultCryptoNetwork("USDT"));
  const [cryptoAddress, setCryptoAddress] = useState<string>("");
  const [cryptoAddressLoading, setCryptoAddressLoading] = useState(false);
  const [cryptoQrCode, setCryptoQrCode] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [cryptoHash, setCryptoHash] = useState<string>("");
  const [isSubmittingHash, setIsSubmittingHash] = useState(false);

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
  

  

  // Handle USDT input change
  const handleUSDTInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatUSDTInput(inputValue);
    const parsed = parseUSDTInput(formatted);

    // Prevent typing more than user limit - show warning and WhatsApp button
    if (parsed > userDailyLimit) {
      // Show toast warning
      toast({
        title: language === "pt" ? "Limite de depósito" : "Deposit limit",
        description:
          language === "pt"
            ? `O seu limite máximo para depósitos online é ${userDailyLimit.toLocaleString(
                "pt-BR"
              )} USDT. Para valores maiores, use o botão WhatsApp abaixo.`
            : `Your maximum online deposit limit is ${userDailyLimit.toLocaleString()} USDT. For larger amounts, use the WhatsApp button below.`,
        variant: "default",
      });
      // Allow user to see the value they typed, but they'll see the WhatsApp button instead of purchase button
      setBuyUSDT(formatted);
      return;
    }

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
          const { success, user } = await response.json();
          if (success && user) {
            setUserDailyLimit(Number((user as { dailyDepositLimit?: number }).dailyDepositLimit) || 5000);
            if (user.approvalStatus === "REJECTED") {
              const message = language === "pt" ? "Sua conta foi rejeitada. Entre em contato com o suporte." : "Your account has been rejected. Please contact support.";
              sessionStorage.setItem("rejectionMessage", message);
              await performLogout();
              return;
            }

            if (user.approvalStatus === "PENDING") {
              toast({
                title: language === "pt" ? "Conta Pendente" : "Account Pending",
                description:
                  language === "pt"
                    ? "Sua conta está pendente de aprovação. Complete seu cadastro no perfil antes de depositar."
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
  }, [language, toast, router]);


  const fetchUSDTRate = useCallback(async () => {
    try {
      setPriceLoading(true);
      const response = await fetch("/api/crypto/usdt-rate", { cache: "no-store" });

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
  }, []);

  const fetchTransactionHistory = useCallback(async () => {
    try {
      // Fetch orders from API
      const response = await fetch("/api/crypto/orders", { cache: "no-store" });
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
              if (order.status !== "COMPLETED" && order.status !== "FAILED" && order.status !== "CANCELLED") {
                // If it's real recent or already in loading set
                if (order.isRecent || prev.has(order.id)) {
                  newSet.add(order.id);
                }
              } else {
                // Remove from loading if terminal status reached
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
    } catch {
    }
  }, []);

  const wasAwaitingPayment = (status: string | undefined) => {
    if (!status) return false;
    const u = String(status).toUpperCase();
    return !["COMPLETED", "FAILED", "CANCELLED"].includes(u);
  };

  // After PIX is confirmed (webhook / poll), show receipt — not while still awaiting payment
  useEffect(() => {
    if (prevHistoryRef.current.length === 0) {
      prevHistoryRef.current = transactionHistory.map((t) => ({
        id: t.id,
        status: t.status,
      }));
      return;
    }

    const completedTx = transactionHistory.find((t) => {
      if (t.status !== "COMPLETED") return false;
      const prev = prevHistoryRef.current.find((p) => p.id === t.id);
      return wasAwaitingPayment(prev?.status);
    });

    if (completedTx) {
      toast({
        title: language === "pt" ? "Pagamento Confirmado!" : "Payment Confirmed!",
        description:
          language === "pt"
            ? "Seu saldo já foi atualizado."
            : "Your balance has been updated.",
      });

      setShowPixModal(false);
      setBuyUSDT("");

      setReceiptData({
        transactionId: completedTx.id,
        amount: completedTx.amount,
        usdtAmount: completedTx.received,
        date: completedTx.date,
        type: "PIX",
      });
      setShowReceipt(true);

      window.dispatchEvent(new CustomEvent("refresh-balance"));
    }

    prevHistoryRef.current = transactionHistory.map((t) => ({
      id: t.id,
      status: t.status,
    }));
  }, [transactionHistory, language, toast]);
  
  const exportHistory = (days: number) => {
    const now = new Date();
    const filtered = transactionHistory.filter(t => {
      if (days === 365) return true; // Treat 365 as "All"
      const diffTime = Math.abs(now.getTime() - t.date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= days;
    });

    if (filtered.length === 0) {
      toast({
        title: language === "pt" ? "Nenhuma transação" : "No transactions",
        description: language === "pt" 
          ? "Não há transações para exportar neste período." 
          : "There are no transactions to export in this period.",
        variant: "destructive"
      });
      return;
    }

    // Simple CSV export
    const headers = ["ID", "Data", "Valor Pago", "USDT Recebido", "Taxa", "Status"];
    const csvContent = [
      headers.join(","),
      ...filtered.map(t => [
        t.id,
        t.date.toLocaleString(),
        t.amount.toFixed(2),
        t.received.toFixed(4),
        t.fee.toFixed(2),
        t.status
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `bsmarket_history_${days}_days.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // Fetch USDT rate and transaction history on mount - STABLE MOUNT
  useEffect(() => {
    fetchUSDTRate();
    fetchTransactionHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPending = transactionHistory.some(
    (t) => t.status === "PENDING" || t.status === "EXECUTING"
  );

  // Polling effect - separate from mount to avoid frequent recreation
  useEffect(() => {
    const intervalTime = hasPending ? 10000 : 30000;
    
    const interval = setInterval(() => {
      fetchTransactionHistory();
    }, intervalTime);

    // Listen for balance updates (which often mean a transaction completed)
    const handleBalanceUpdate = () => fetchTransactionHistory();

    window.addEventListener("balance-updated", handleBalanceUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("balance-updated", handleBalanceUpdate);
    };
  }, [fetchTransactionHistory, hasPending]);

  const handleBuyConfirm = async () => {
    if (moneyDisabled) {
      toast({
        title: language === "pt" ? "Indisponível" : "Unavailable",
        description:
          moneyDisabledMessage ||
          (language === "pt"
            ? "Depósitos temporariamente desativados."
            : "Deposits are temporarily disabled."),
        variant: "destructive",
      });
      return;
    }
    if (buyUSDTAmount <= 0) {
      toast({
        title: "Erro",
        description: "O valor deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }
    // Check against user's daily limit
    if (buyUSDTAmount > userDailyLimit) {
      const msg =
        language === "pt"
          ? `O seu limite diário é ${userDailyLimit.toLocaleString(
              "pt-BR"
            )} USDT. Para valores maiores, entre em contato conosco via WhatsApp.`
          : `Your daily limit is ${userDailyLimit.toLocaleString()} USDT. For larger amounts, please contact us via WhatsApp.`;
      toast({
        title: language === "pt" ? "Limite atingido" : "Limit reached",
        description: msg,
        variant: "destructive",
      });
      return;
    }

    // Also check against admin-configured maxDepositUsdt (for lower limits)
    if (buyUSDTAmount > maxDepositUsdt) {
      const msg =
        language === "pt"
          ? `O depósito máximo é ${maxDepositUsdt} USDT. Para valores maiores, entre em contato conosco via WhatsApp.`
          : `Maximum deposit is ${maxDepositUsdt} USDT. For larger amounts, please contact us via WhatsApp.`;
      toast({
        title: language === "pt" ? "Limite de depósito" : "Deposit limit",
        description: msg,
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
        if (data.code === "DEPOSIT_LIMIT_EXCEEDED") {
          const msg =
            language === "pt"
              ? `O depósito máximo é ${maxDepositUsdt} USDT. Para valores maiores, entre em contato conosco via WhatsApp.`
              : `Maximum deposit is ${maxDepositUsdt} USDT. For larger amounts, please contact us via WhatsApp.`;
          toast({
            title: language === "pt" ? "Limite de depósito" : "Deposit limit",
            description: msg,
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.error || "Erro ao processar compra");
      }

      if (data.success && data.data) {
        // Extract PIX code from various possible structures
        // Mercado Pago API returns: qrCode, pixKey, or pix_data.qr_code
        // (Note: Mercado Pago implementation in lib/payment/mercadopago.ts returns this structure)
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
            const jsQRModule = await import("jsqr");
            const jsQR = jsQRModule.default || jsQRModule;

            // Create an image element to decode the QR code
            const domImg = new globalThis.Image();
            domImg.crossOrigin = "anonymous";

            const decodedCode = await new Promise<string | null>((resolve) => {
                domImg.onload = () => {
                try {
                  const canvas = document.createElement("canvas");
                  canvas.width = domImg.width;
                  canvas.height = domImg.height;
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    ctx.drawImage(domImg, 0, 0);
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
              domImg.onerror = () => {
                console.error("Error loading QR code image");
                resolve(null);
              };

              // Set image source
              const base64Data = qrCodeBase64.includes(",")
                ? qrCodeBase64
                : `data:image/png;base64,${qrCodeBase64}`;
              domImg.src = base64Data;
            });
            if (decodedCode) {
              pixCode = decodedCode;
            }
          } catch {
            // Error decoding QR code from image is non-fatal as the user can still see the image
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

        // Payment confirmation will be handled by Mercado Pago webhook
        // The webhook will update the order status in the database
        // User will see confirmation when they refresh or return to the page

        // Add to transaction history
        // Total amount includes fee, so calculate base and fee
        const totalBRL = data.data.amount_brl; // Total paid (base + fee)
        const baseAmount = totalBRL / 1.03; // Base amount
        const fee = totalBRL - baseAmount; // Fee amount
        const purchaseStatus = String(
          data.data.status ?? "PENDING"
        ).toUpperCase();
        const newTransaction = {
          id: data.data.transaction_id,
          date: new Date(),
          type: "buy" as const,
          amount: totalBRL, // Total paid
          received: data.data.amount_usdt,
          fee: fee,
          rate: data.data.exchange_rate,
          status: purchaseStatus,
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
          title: language === "pt" ? "Compra iniciada!" : "Purchase started!",
          description:
            language === "pt"
              ? "Escaneie o QR Code PIX para finalizar o pagamento"
              : "Scan the PIX QR Code to complete payment",
        });

        // Receipt only after payment is confirmed (webhook), unless provider already returned completed
        if (purchaseStatus === "COMPLETED" || purchaseStatus === "CONFIRMED") {
          setReceiptData({
            transactionId: data.data.transaction_id,
            amount: totalBRL,
            usdtAmount: data.data.amount_usdt,
            date: new Date(),
            type: "PIX",
          });
          setShowReceipt(true);
          setShowPixModal(false);
        }
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

  const resetCryptoAddress = () => {
    setCryptoAddress("");
    setCryptoQrCode("");
    setReceiptData(null);
  };

  const handleCryptoCurrencyChange = (currency: CryptoCurrency) => {
    setCryptoCurrency(currency);
    setCryptoNetwork(getDefaultCryptoNetwork(currency));
    resetCryptoAddress();
  };

  const handleCryptoNetworkChange = (network: CryptoNetwork) => {
    setCryptoNetwork(network);
    resetCryptoAddress();
  };

  const fetchCryptoAddress = useCallback(async (currency: CryptoCurrency, network: CryptoNetwork) => {
    try {
      setCryptoAddressLoading(true);
      const response = await fetch("/api/deposit/crypto/address", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, network, addressOnly: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch address");
      }

      const data = await response.json();
      if (data.success && data.address) {
        setCryptoAddress(data.address);
        // Generate QR code locally
        try {
          const qrUrl = await QRCode.toDataURL(data.address, {
            width: 300,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          });
          setCryptoQrCode(qrUrl);
        } catch (err) {
          console.error("Error generating QR code:", err);
        }

        setReceiptData(null);
      }
    } catch (error) {
      console.error("Error fetching crypto address:", error);
      toast({
        title: "Erro",
        description: language === "pt" ? "Não foi possível obter o endereço de depósito" : "Could not obtain deposit address",
        variant: "destructive",
      });
    } finally {
      setCryptoAddressLoading(false);
    }
  }, [language, toast]);

  const handleCryptoDepositConfirm = () => {
    if (moneyDisabled) {
      toast({
        title: language === "pt" ? "Indisponível" : "Unavailable",
        description:
          moneyDisabledMessage ||
          (language === "pt"
            ? "Depósitos temporariamente desativados."
            : "Deposits are temporarily disabled."),
        variant: "destructive",
      });
      return;
    }
    fetchCryptoAddress(cryptoCurrency, cryptoNetwork);
  };

  const handleSimulatePayment = async () => {
    const txRef = receiptData?.transactionId;
    if (!txRef) return;

    setIsSimulating(true);
    try {
      const response = await fetch("/api/test/simulate-payment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositId: receiptData.depositId,
          transactionId: txRef,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Pagamento simulado com sucesso! Saldo atualizado.",
        });
        setShowReceipt(false);
        setCryptoAddress("");
        setCryptoAmount("");
        fetchTransactionHistory();
      } else {
        throw new Error(data.error || "Erro ao simular pagamento");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao simular pagamento",
        variant: "destructive",
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCryptoHashSubmit = async () => {
    if (!cryptoHash.trim()) return;

    if (!cryptoAddress) {
      toast({
        title: language === "pt" ? "Gere o QR Code" : "Generate the QR Code",
        description:
          language === "pt"
            ? "Selecione a moeda e a rede para gerar o QR Code antes de enviar."
            : "Select the currency and network to generate the QR Code before submitting.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseUSDTInput(cryptoAmount);
    if (amount <= 0) {
      toast({
        title: "Erro",
        description: language === "pt" ? "Insira um valor válido" : "Enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const depositRef = receiptData?.depositId ?? receiptData?.transactionId;

    setIsSubmittingHash(true);
    try {
      const response = await fetch("/api/deposit/crypto/hash", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositId: receiptData?.depositId,
          transactionId: depositRef,
          amount,
          currency: cryptoCurrency,
          network: cryptoNetwork,
          address: cryptoAddress,
          hash: cryptoHash.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        const transactionId = data.transactionId ?? receiptData?.transactionId;
        const depositId = data.depositId ?? receiptData?.depositId;
        if (transactionId) {
          setReceiptData({
            transactionId,
            depositId,
            amount,
            usdtAmount: amount,
            currency: cryptoCurrency,
            date: new Date(),
            type: "CRYPTO",
          });
        }
        toast({
          title: language === "pt" ? "Sucesso" : "Success",
          description: language === "pt" ? "Hash da transação enviado com sucesso!" : "Transaction hash submitted successfully!",
        });
        setCryptoHash("");
        setShowReceipt(Boolean(transactionId));
        fetchTransactionHistory();
      } else {
        throw new Error(data.error || "Erro ao enviar hash");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao enviar hash",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingHash(false);
    }
  };

  const handleSimulatePixPayment = async () => {
    if (!pixData?.transactionId) return;
    
    setIsSimulating(true);
    try {
      const response = await fetch("/api/test/simulate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: pixData.transactionId }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Pagamento PIX simulado com sucesso! Saldo atualizado.",
        });
        setShowPixModal(false);
        fetchTransactionHistory();
      } else {
        throw new Error(data.error || "Erro ao simular pagamento");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao simular pagamento",
        variant: "destructive",
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: "Copiado!",
        description: language === "pt" ? "Endereço copiado com sucesso" : "Address copied successfully",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível copiar",
        variant: "destructive"
      });
    }
  };

  return (

    <div className="min-h-screen bg-background text-foreground">
      <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
      <GlobalKYCBanner />
      <div
        className={`container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl ${
          isMobile ? "pb-16" : ""
        }`}
        style={
          isMobile
            ? { paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }
            : undefined
        }
      >
        {moneyDisabled ? (
          <div className="max-w-4xl mx-auto mb-6 rounded-xl border border-warning/30 bg-warning/10 p-4">
            <p className="text-sm font-medium text-warning">
              {language === "pt"
                ? "Atualização da plataforma"
                : "Platform update"}
            </p>
            <p className="text-xs text-warning/90 mt-1">
              {moneyDisabledMessage ||
                (language === "pt"
                  ? "Depósitos e saques estão temporariamente desativados."
                  : "Deposits and withdrawals are temporarily disabled.")}
            </p>
          </div>
        ) : null}

        {inMaintenance && maintenanceMessage ? (
          <div className="max-w-4xl mx-auto mb-6 rounded-xl border border-warning/30 bg-warning/10 p-4">
            <p className="text-sm font-medium text-warning">
              {language === "pt"
                ? "Manutenção programada"
                : "Scheduled maintenance"}
            </p>
            <p className="text-xs text-warning/90 mt-1">
              {maintenanceMessage}
            </p>
          </div>
        ) : null}

        {/* Purchase Card */}
        <Card className="rounded-xl sm:rounded-2xl border-border bg-card shadow-sm mb-6 sm:mb-8">
          <CardHeader className="pb-4">
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {language === "pt" ? "Depositar USDT" : "Deposit USDT"}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {depositMethod === "PIX"
                  ? `${t("buyUSDTViaPIX")} • ${t("fee")}`
                  : language === "pt"
                  ? "Depositar USDT via Cripto"
                  : "Deposit USDT via Crypto"}
              </p>
            </div>

            <div className="mb-4 flex justify-center">
              <div className="relative inline-flex items-center bg-muted/60 border border-border rounded-xl p-1">
                <button
                  onClick={() => setDepositMethod("PIX")}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    depositMethod === "PIX"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Wallet className="h-4 w-4" />
                    <span>PIX</span>
                  </div>
                </button>
                <div className="h-6 w-px bg-border mx-1" />
                <button
                  onClick={() => setDepositMethod("CRYPTO")}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    depositMethod === "CRYPTO"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Coins className="h-4 w-4" />
                    <span>{language === "pt" ? "Cripto" : "Crypto"}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Price badge for PIX method */}
            {depositMethod === "PIX" && (
              <div className="flex flex-col items-center gap-3 mb-4">
                <Badge
                  className="bg-primary/20 text-primary border-primary/30 inline-flex items-center gap-2"
                >
                  {priceLoading ? (
                    <>
                      <Spinner size="sm" />
                      {language === "pt" ? "Carregando..." : "Loading..."}
                    </>
                  ) : (
                    `1 USDT = ${formatBRL(usdtPrice)}`
                  )}
                </Badge>
                
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {language === "pt" ? "Limite Diário:" : "Daily Limit:"}
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    ${userDailyLimit.toLocaleString()} USDT
                  </span>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {depositMethod === "PIX" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {language === "pt" ? "Quantidade de USDT:" : "USDT Amount:"}
                  </label>
                  <input
                    type="text"
                    value={buyUSDT}
                    onChange={handleUSDTInputChange}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {language === "pt"
                      ? `Seu limite diário é ${userDailyLimit.toLocaleString(
                          "pt-BR"
                        )} USDT. Valores maiores: entre em contato via WhatsApp.`
                      : `Your daily limit is ${userDailyLimit.toLocaleString()} USDT. For larger amounts: contact us via WhatsApp.`}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Total BRL to pay with PIX icon */}
                  <div className="bg-primary/10 rounded-xl p-4 border border-primary/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <QrCode className="w-4 h-4 text-primary" />
                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                          {language === "pt"
                            ? "Total a pagar via PIX:"
                            : "Total to pay via PIX:"}
                        </div>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-primary flex items-baseline gap-1.5">
                        {formatBRL(buyTotalBRL)}
                        <span className="text-[10px] font-bold text-muted-foreground">
                          BRL
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-border/50 space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{language === "pt" ? "Base:" : "Base:"}</span>
                        <span className="text-foreground font-medium">{formatBRL(buyBaseBRL)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{language === "pt" ? "Taxa (3%):" : "Fee (3%):"}</span>
                        <span className="text-destructive font-medium">{formatBRL(buyFeeBRL)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/10 rounded-xl p-4 border border-primary/30 flex flex-col justify-center">
                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">
                      {language === "pt" ? "Você receberá:" : "You will receive:"}
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-primary">
                      {formatUSDT(buyUSDTAmount)} <span className="text-sm">USDT</span>
                    </div>
                  </div>
                </div>


                {buyUSDTAmount > userDailyLimit ? (
                  <div className="space-y-3">
                    <p className="text-sm text-warning text-center">
                      {language === "pt"
                        ? `O seu limite diário é ${userDailyLimit.toLocaleString(
                            "pt-BR"
                          )} USDT. Para valores maiores, entre em contato conosco via WhatsApp.`
                        : `Your daily limit is ${userDailyLimit.toLocaleString()} USDT. For larger amounts, please contact us via WhatsApp.`}
                    </p>
                    <Button
                      asChild
                      className="w-full h-12 sm:h-14 font-semibold rounded-xl text-base sm:text-lg flex items-center justify-center gap-2"
                    >
                      <a
                        href={getWhatsAppUrlForLargeDeposit(
                          buyUSDTAmount,
                          language
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="w-5 h-5" />
                        {language === "pt"
                          ? "Falar no WhatsApp"
                          : "Contact via WhatsApp"}
                      </a>
                    </Button>
                  </div>
                ) : buyUSDTAmount > maxDepositUsdt ? (
                  <div className="space-y-3">
                    <p className="text-sm text-warning text-center">
                      {language === "pt"
                        ? `Para depósitos acima de ${maxDepositUsdt} USDT, entre em contato conosco via WhatsApp.`
                        : `For deposits above ${maxDepositUsdt} USDT, please contact us via WhatsApp.`}
                    </p>
                    <Button
                      asChild
                      className="w-full h-12 sm:h-14 font-semibold rounded-xl text-base sm:text-lg flex items-center justify-center gap-2"
                    >
                      <a
                        href={WHATSAPP_SUPPORT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="w-5 h-5" />
                        {language === "pt"
                          ? "Falar no WhatsApp"
                          : "Contact via WhatsApp"}
                      </a>
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleBuyConfirm}
                    disabled={buyUSDTAmount <= 0 || loading || moneyDisabled}
                    className="w-full h-12 sm:h-14 font-semibold rounded-xl text-base sm:text-lg"
                  >
                    {loading ? (
                      <ButtonLoader
                        label={language === "pt" ? "Processando..." : "Processing..."}
                        size="default"
                        className="text-primary-foreground"
                      />
                    ) : (
                      t("confirmPurchase")
                    )}
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      {language === "pt" ? "Selecione a moeda:" : "Select currency:"}
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {CRYPTO_CURRENCIES.map((currency) => (
                        <button
                          key={currency}
                          type="button"
                          onClick={() => handleCryptoCurrencyChange(currency)}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            cryptoCurrency === currency
                              ? "bg-primary/20 border-primary text-primary"
                              : "bg-muted/50 border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {currency}
                        </button>
                      ))}
                    </div>

                    <label className="block text-sm font-medium text-foreground mb-2">
                      {language === "pt" ? "Selecione a Rede (Network):" : "Select Network:"}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {getCryptoNetworks(cryptoCurrency).map((network) => (
                        <button
                          key={network}
                          onClick={() => handleCryptoNetworkChange(network)}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            cryptoNetwork === network
                              ? "bg-primary/20 border-primary text-primary"
                              : "bg-muted/50 border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {CRYPTO_NETWORK_LABELS[network]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!cryptoAddress && !cryptoAddressLoading && (
                    <Button 
                      onClick={handleCryptoDepositConfirm}
                      disabled={moneyDisabled}
                      className="w-full h-12 sm:h-14 font-semibold rounded-xl text-base sm:text-lg"
                    >
                      {language === "pt" ? "Gerar QR Code de Depósito" : "Generate Deposit QR Code"}
                    </Button>
                  )}

                  {cryptoAddressLoading ? (
                    <div className="py-12 flex flex-col items-center gap-3">
                      <Spinner size="lg" className="text-primary" />
                      <p className="text-sm text-muted-foreground animate-pulse">
                        {language === "pt" ? "Gerando endereço..." : "Generating address..."}
                      </p>
                    </div>
                  ) : cryptoAddress ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="p-5 bg-primary/5 border border-primary/20 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Wallet className="w-12 h-12 text-primary" />
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                          <div className="bg-white p-2 rounded-xl shadow-inner shrink-0 min-w-[120px] min-h-[120px] flex items-center justify-center">
                            {cryptoQrCode ? (
                              <Image
                                src={cryptoQrCode}
                                alt="QR Code"
                                width={150}
                                height={150}
                                className="w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] animate-in fade-in zoom-in-50 duration-500"
                                unoptimized
                              />
                            ) : (
                              <div className="w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] bg-muted animate-pulse rounded-lg" />
                            )}
                          </div>
                          
                          <div className="flex-1 space-y-3 w-full">
                            <label className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5">
                              {language === "pt"
                                ? `Endereço ${cryptoCurrency} (${cryptoNetwork}):`
                                : `${cryptoCurrency} Address (${cryptoNetwork}):`}
                            </label>
                            
                            <div className="flex items-center gap-2">
                              <code className="flex-1 font-mono text-xs sm:text-sm break-all font-semibold text-foreground bg-black/20 p-3 rounded-lg border border-white/5">
                                {cryptoAddress}
                              </code>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="shrink-0 hover:bg-primary/20 text-primary h-10 w-10 rounded-xl"
                                onClick={() => copyAddress(cryptoAddress)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-border/50">
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          {language === "pt"
                            ? `Valor enviado em ${cryptoCurrency}:`
                            : `${cryptoCurrency} amount sent:`}
                        </label>
                        <input
                          type="text"
                          value={cryptoAmount}
                          onChange={(e) => setCryptoAmount(formatUSDTInput(e.target.value))}
                          placeholder="0,00"
                          inputMode="decimal"
                          className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                      </div>

                      {/* Transaction Hash Input */}
                      <div className="space-y-3 pt-2 border-t border-border/50">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            {language === "pt" ? "Já enviou? Informe o Hash da Transação:" : "Sent it? Enter Transaction Hash:"}
                          </label>
                          <div className="flex gap-2">
                            <Input
                              value={cryptoHash}
                              onChange={(e) => setCryptoHash(e.target.value)}
                              placeholder="0x..."
                              className="flex-1 bg-black/20 border-border h-11 rounded-xl"
                            />
                            <Button 
                              onClick={handleCryptoHashSubmit}
                              disabled={
                                !cryptoHash.trim() ||
                                !cryptoAmount ||
                                parseUSDTInput(cryptoAmount) <= 0 ||
                                isSubmittingHash ||
                                !cryptoAddress
                              }
                              className="h-11 px-6 rounded-xl font-bold whitespace-nowrap"
                            >
                              {isSubmittingHash ? (
                                <Spinner size="sm" />
                              ) : (
                                language === "pt" ? "Enviar Hash" : "Submit Hash"
                              )}
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground italic">
                            {language === "pt" 
                              ? "O hash nos ajuda a identificar e aprovar seu depósito mais rapidamente." 
                              : "The hash helps us identify and approve your deposit faster."}
                          </p>
                        </div>
                      </div>

                      {/* Simulation Button (Development Only) */}
                      {process.env.NODE_ENV === "development" && (
                        <Button
                          onClick={handleSimulatePayment}
                          disabled={isSimulating}
                          variant="secondary"
                          className="w-full h-12 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20 rounded-xl gap-2 font-bold shadow-sm mt-2"
                        >
                          {isSimulating ? (
                            <>
                              <Spinner size="sm" />
                              Simulando...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Simular Pagamento (Dev Mode)
                            </>
                          )}
                        </Button>
                      )}

                      <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-primary">!</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {language === "pt" 
                              ? `Certifique-se de enviar exatamente ${cryptoAmount} ${cryptoCurrency} via rede ${cryptoNetwork}. O envio de qualquer outra moeda ou rede resultará em perda permanente.` 
                              : `Make sure to only send exactly ${cryptoAmount} ${cryptoCurrency} via the ${cryptoNetwork} network. Sending any other currency or network will result in permanent loss.`}
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-primary">?</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {language === "pt"
                              ? "O crédito será automático após aprovação manual (geralmente 5-30 minutos)."
                              : "Credit will be automatic after manual approval (usually 5-30 minutes)."}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="rounded-xl sm:rounded-2xl border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-foreground flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                {t("purchaseHistory")}
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2">
                      <Download className="w-4 h-4" />
                      {language === "pt" ? "Exportar" : "Export"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem 
                      onClick={() => exportHistory(7)}
                      className="text-foreground hover:bg-primary/10 transition-colors"
                    >
                      {language === "pt" ? "Últimos 7 dias" : "Last 7 days"}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => exportHistory(15)}
                      className="text-foreground hover:bg-primary/10 transition-colors"
                    >
                      {language === "pt" ? "Últimos 15 dias" : "Last 15 days"}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => exportHistory(30)}
                      className="text-foreground hover:bg-primary/10 transition-colors"
                    >
                      {language === "pt" ? "Últimos 30 dias" : "Last 30 days"}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => exportHistory(365)}
                      className="text-foreground hover:bg-primary/10 transition-colors"
                    >
                      {language === "pt" ? "Tudo" : "All"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardTitle>

          </CardHeader>
          <CardContent>
            {transactionHistory.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-1">{t("noPurchases")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("purchasesWillAppear")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactionHistory.map((transaction) => {
                  const hasPixData = storedPixData.has(transaction.id);
                  const isPending = transaction.status === "PENDING";
                  const isCompleted = transaction.status === "COMPLETED";
                  const isLoading = loadingTransactions.has(transaction.id);

                  return (
                    <div
                      key={transaction.id}
                      onClick={() => router.push(`/transaction/${transaction.id}`)}
                      className={`p-4 rounded-xl bg-muted/30 border border-border transition-colors hover:bg-muted/50 cursor-pointer hover:border-primary/30`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {isLoading ? (
                              <Badge className="bg-primary/20 text-primary border-primary/30 flex items-center gap-1.5">
                                <Spinner size="sm" />
                                {language === "pt"
                                  ? "Verificando..."
                                  : "Checking..."}
                              </Badge>
                            ) : (
                              <Badge
                                className={
                                  transaction.status === "COMPLETED"
                                    ? "bg-primary/20 text-primary border-primary/30"
                                    : transaction.status === "PENDING"
                                    ? "bg-warning/20 text-warning border-warning/30"
                                    : "bg-destructive/20 text-destructive border-destructive/30"
                                }
                              >
                                {transaction.status === "COMPLETED"
                                  ? t("completed")
                                  : transaction.status === "PENDING"
                                  ? (language === "pt" ? "Em andamento" : "In progress")
                                  : t("failed")}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
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
                              <span className="text-xs text-warning/80 flex items-center gap-1">
                                <QrCode className="w-3 h-3" />
                                {t("clickToSeeQRCode")}
                              </span>
                            )}
                            {isCompleted && (
                              <span className="text-xs text-primary/80 flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {language === "pt" ? "Ver Comprovante" : "View Receipt"}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                            <div>
                              <p className="text-gray-400 text-xs">
                                {t("amountPaid")}
                              </p>
                              <p className="text-foreground font-medium">
                                {formatBRL(transaction.amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">
                                {t("received")}
                              </p>
                              <p className="text-primary font-semibold">
                                {formatUSDT(transaction.received)} USDT
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">
                                {t("feeAmount")}
                              </p>
                              <p className="text-foreground">
                                {formatBRL(transaction.fee)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">
                                {t("feeAmount")}
                              </p>
                              <p className="text-foreground">
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
          <p className="text-xs sm:text-sm text-muted-foreground">
            • {t("quotesUpdated")}
            <br />• {t("feeApplied")}
            <br />• {t("pixPayment")}
          </p>
        </div>
      </div>

      {/* PIX QR Code Modal */}
      <PixPaymentDialog
        open={showPixModal}
        onOpenChange={(open) => {
          setShowPixModal(open);
          if (!open && pixData) {
            // Check if there are still pending transactions that need loading states
            setLoadingTransactions((prev) => {
              const newSet = new Set(prev);
              newSet.add(pixData.transactionId);
              // Small delay to allow polling to catch up
              setTimeout(() => {
                setLoadingTransactions((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(pixData.transactionId);
                  return newSet;
                });
                fetchTransactionHistory();
              }, 8000);
              return newSet;
            });
          }
        }}
        pixData={pixData}
        copied={copied}
        copyPixCode={copyPixCode}
        language={language}
        handleSimulatePixPayment={handleSimulatePixPayment}
        isSimulating={isSimulating}
      />

      {/* Receipt Modal */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="bg-transparent border-none p-0 max-w-md shadow-none outline-none ring-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Recibo da Transação</DialogTitle>
          </DialogHeader>
          {receiptData && (
            <TransactionReceipt 
              transaction={{
                id: receiptData.transactionId,
                amount: receiptData.amount,
                usdtAmount: receiptData.usdtAmount,
                date: receiptData.date,
                status: transactionHistory.find(t => t.id === receiptData.transactionId)?.status || "PENDING",
                type: receiptData.type,
                currency: receiptData.currency,
                network: cryptoNetwork,
                address: cryptoAddress
              }}
              onClose={() => setShowReceipt(false)}
              language={language}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Page Indicator - Bottom Navigation */}
      {isMobile && !mobileMenuOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
        >
          <div className="flex justify-center pb-2 px-4">
            <div className="relative inline-flex items-center bg-card/95 backdrop-blur-sm border border-border rounded-full px-1 py-1.5 shadow-lg">
              <button
                onClick={() => router.push("/trade")}
                className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation ${
                  pathname === "/trade" || pathname === "/deposit"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground active:bg-muted"
                }`}
                style={{ minWidth: "44px", minHeight: "44px" }}
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>

              <button
                onClick={() => router.push("/dashboard")}
                className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation ${
                  pathname === "/dashboard"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground active:bg-muted"
                }`}
                style={{ minWidth: "44px", minHeight: "44px" }}
              >
                <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>

              <button
                onClick={() => router.push("/withdraw")}
                className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation ${
                  pathname === "/withdraw"
                    ? "bg-destructive text-destructive-foreground"
                    : "text-muted-foreground hover:text-foreground active:bg-muted"
                }`}
                style={{ minWidth: "44px", minHeight: "44px" }}
              >
                <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradePage;
