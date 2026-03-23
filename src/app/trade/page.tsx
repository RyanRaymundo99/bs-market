"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import NavbarNew from "@/components/ui/navbar-new";
import { GlobalKYCBanner } from "@/components/GlobalKYCBanner";
import Image from "next/image";
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
  Wallet,
  Coins,
  Home,
  Plus,
  Minus,
  MessageCircle,
} from "lucide-react";
import { ButtonLoader, Spinner } from "@/components/ui/loading";
import { useLanguage } from "@/contexts/LanguageContext";

const WHATSAPP_SUPPORT_URL = `https://wa.me/${
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5511984284867"
}`;

// Hard limit for online purchases - above this, redirect to WhatsApp
const ONLINE_MAX_USDT = 2000;

// Generate WhatsApp URL with pre-filled message for deposits > 2k
const getWhatsAppUrlForLargeDeposit = (
  usdtAmount: number,
  language: string
) => {
  const whatsappNumber =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5511984284867";
  const message =
    language === "pt"
      ? `Olá! Tenho interesse em fazer um depósito de ${usdtAmount.toLocaleString(
          "pt-BR",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )} USDT. Gostaria de mais informações.`
      : `Hello! I'm interested in making a deposit of ${usdtAmount.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )} USDT. I'd like more information.`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
};

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
  const [inMaintenance, setInMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>("");

  // Swipe gesture state for mobile navigation
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const minSwipeDistance = 50;

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

  // Swipe gesture handlers
  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!isMobile || !touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swipe left -> go to withdraw
      router.push("/withdraw");
    } else if (isRightSwipe) {
      // Swipe right -> go to dashboard
      router.push("/dashboard");
    }
  };

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

  // Deposit method toggle (PIX or Crypto)
  const [depositMethod, setDepositMethod] = useState<"PIX" | "CRYPTO">("PIX");

  // Estados para compra
  const [buyUSDT, setBuyUSDT] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);

  // Crypto deposit states
  const [selectedNetwork, setSelectedNetwork] = useState("TRC20");
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
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
  // Brazilian format: dot = thousands separator, comma = decimal separator (e.g. 10.000,50)
  const formatUSDTInput = (value: string): string => {
    // Keep only digits, comma, and dot
    const cleaned = value.replace(/[^\d,.]/g, "");

    if (!cleaned) return "";

    // Split by comma so we don't confuse thousand dots with decimal point
    const [intPartStr, ...decParts] = cleaned.split(",");
    const decimalPart = (decParts.join("") || "")
      .replace(/\D/g, "")
      .slice(0, 4); // max 4 decimals

    // Integer part: strip all non-digits (removes thousand dots), then add thousand separators
    const integerDigits = (intPartStr || "").replace(/\D/g, "");
    const formattedInteger = integerDigits.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      "."
    );

    if (decimalPart) {
      return `${formattedInteger},${decimalPart}`;
    }
    if (cleaned.includes(",")) {
      return `${formattedInteger},`;
    }
    return formattedInteger;
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
    const parsed = parseUSDTInput(formatted);

    // Prevent typing more than 2000 USDT - show warning and WhatsApp button
    if (parsed > ONLINE_MAX_USDT) {
      // Show toast warning
      toast({
        title: language === "pt" ? "Limite online" : "Online limit",
        description:
          language === "pt"
            ? `O limite máximo para compras online é ${ONLINE_MAX_USDT.toLocaleString(
                "pt-BR"
              )} USDT. Para valores maiores, use o botão WhatsApp abaixo.`
            : `Maximum online purchase limit is ${ONLINE_MAX_USDT.toLocaleString()} USDT. For larger amounts, use the WhatsApp button below.`,
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
  }, [language, toast, router, pathname]);


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

  const fetchTransactionHistory = useCallback(async (isSilent = false) => {
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
          
          // Show toast if a transaction just completed
          const previouslyPending = transactionHistory.some(t => t.status === "PENDING");
          const nowCompleted = buyOrders.some(t => t.status === "COMPLETED" && 
            transactionHistory.find(prev => prev.id === t.id)?.status === "PENDING"
          );
          
          if (nowCompleted && previouslyPending && !isSilent) {
            toast({
              title: language === "pt" ? "Pagamento Confirmado!" : "Payment Confirmed!",
              description: language === "pt" 
                ? "Seu saldo já foi atualizado." 
                : "Your balance has been updated.",
            });
            // Trigger balance refresh in sidebar/navbar
            window.dispatchEvent(new CustomEvent("refresh-balance"));
          }

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
  }, [transactionHistory, language, toast]);

  // Fetch USDT rate and transaction history on mount - PARALLEL
  useEffect(() => {
    fetchUSDTRate();
    fetchTransactionHistory();

    // Set up polling for history
    // Poll more frequently if there are pending transactions
    const hasPending = transactionHistory.some(
      (t) => t.status === "PENDING" || t.status === "EXECUTING"
    );
    const intervalTime = hasPending ? 10000 : 30000;
    
    const interval = setInterval(() => {
      fetchTransactionHistory(true);
    }, intervalTime);

    // Listen for balance updates (which often mean a transaction completed)
    const handleBalanceUpdate = () => fetchTransactionHistory(true);
    window.addEventListener("balance-updated", handleBalanceUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("balance-updated", handleBalanceUpdate);
    };
  }, [fetchUSDTRate, fetchTransactionHistory, transactionHistory]);

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
    // Hard limit: 2000 USDT for online purchases
    if (buyUSDTAmount > ONLINE_MAX_USDT) {
      const msg =
        language === "pt"
          ? `O limite máximo para compras online é ${ONLINE_MAX_USDT.toLocaleString(
              "pt-BR"
            )} USDT. Para valores maiores, entre em contato conosco via WhatsApp.`
          : `Maximum online purchase limit is ${ONLINE_MAX_USDT.toLocaleString()} USDT. For larger amounts, please contact us via WhatsApp.`;
      toast({
        title: language === "pt" ? "Limite online" : "Online limit",
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
        if (data.code === "ONLINE_LIMIT_EXCEEDED") {
          const msg =
            language === "pt"
              ? `O limite máximo para compras online é 2.000 USDT. Para valores maiores, entre em contato conosco via WhatsApp.`
              : `Maximum online purchase limit is 2,000 USDT. For larger amounts, please contact us via WhatsApp.`;
          toast({
            title: language === "pt" ? "Limite online" : "Online limit",
            description: msg,
            variant: "destructive",
          });
          return;
        }
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

        // Payment confirmation will be handled by Mercado Pago webhook
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

  // Fetch crypto deposit address
  const fetchCryptoDepositAddress = async () => {
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
    setLoadingAddress(true);
    try {
      const response = await fetch("/api/deposit/crypto/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network: selectedNetwork,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.address) {
          setDepositAddress(data.address);
        } else {
          throw new Error(data.error || "Failed to get deposit address");
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to get deposit address");
      }
    } catch (error) {
      console.error("Error fetching deposit address:", error);
      toast({
        title: language === "pt" ? "Erro" : "Error",
        description:
          error instanceof Error
            ? error.message
            : language === "pt"
            ? "Falha ao obter endereço de depósito"
            : "Failed to get deposit address",
        variant: "destructive",
      });
    } finally {
      setLoadingAddress(false);
    }
  };

  // Copy crypto deposit address
  const copyCryptoAddress = async () => {
    if (depositAddress) {
      try {
        await navigator.clipboard.writeText(depositAddress);
        setAddressCopied(true);
        toast({
          title: language === "pt" ? "Copiado!" : "Copied!",
          description:
            language === "pt"
              ? "Endereço copiado para a área de transferência"
              : "Address copied to clipboard",
        });
        setTimeout(() => setAddressCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  // Prevent switching to CRYPTO mode (disabled for now)
  useEffect(() => {
    if (depositMethod === "CRYPTO") {
      setDepositMethod("PIX");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositMethod]);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
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
                  disabled
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed text-muted-foreground"
                  title={language === "pt" ? "Em breve" : "Coming soon"}
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
              <div className="flex justify-center mb-4">
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
                      ? `Máximo ${ONLINE_MAX_USDT.toLocaleString(
                          "pt-BR"
                        )} USDT para compras online. Valores maiores: entre em contato via WhatsApp.`
                      : `Maximum ${ONLINE_MAX_USDT.toLocaleString()} USDT for online purchases. For larger amounts: contact us via WhatsApp.`}
                  </p>
                </div>

                {/* Total BRL to pay with PIX icon */}
                {buyUSDTAmount > 0 && (
                  <div className="bg-primary/10 rounded-xl p-4 sm:p-6 border border-primary/30">
                    <div className="flex items-center gap-2 mb-2">
                      <QrCode className="w-5 h-5 text-primary" />
                      <div className="text-sm text-muted-foreground">
                        {language === "pt"
                          ? "Total a pagar via PIX:"
                          : "Total to pay via PIX:"}
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
                      {formatBRL(buyTotalBRL)}
                      <span className="text-sm font-normal text-muted-foreground">
                        BRL
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {language === "pt" ? "Valor base:" : "Base amount:"}
                        </span>
                        <span className="text-foreground">
                          {formatBRL(buyBaseBRL)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {language === "pt" ? "Taxa (3%):" : "Fee (3%):"}
                        </span>
                        <span className="text-destructive">
                          {formatBRL(buyFeeBRL)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-primary/10 rounded-xl p-4 sm:p-6 border border-primary/30">
                  <div className="text-sm text-muted-foreground mb-2">
                    {language === "pt" ? "Você receberá:" : "You will receive:"}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary">
                    {formatUSDT(buyUSDTAmount)} USDT
                  </div>
                </div>

                {buyUSDTAmount > ONLINE_MAX_USDT ? (
                  <div className="space-y-3">
                    <p className="text-sm text-warning text-center">
                      {language === "pt"
                        ? `O limite máximo para compras online é ${ONLINE_MAX_USDT.toLocaleString(
                            "pt-BR"
                          )} USDT. Para valores maiores, entre em contato conosco via WhatsApp.`
                        : `Maximum online purchase limit is ${ONLINE_MAX_USDT.toLocaleString()} USDT. For larger amounts, please contact us via WhatsApp.`}
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
                {/* Crypto Deposit Form - Temporarily Unavailable */}
                <div className="p-8 sm:p-12 bg-muted/30 rounded-xl border border-border text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-muted rounded-full">
                      <Coins className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {language === "pt" ? "Em Breve" : "Coming Soon"}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        {language === "pt"
                          ? "A funcionalidade de depósito via cripto está em desenvolvimento e estará disponível em breve."
                          : "Crypto deposit functionality is under development and will be available soon."}
                      </p>
                    </div>
                    <div className="mt-4">
                      <Button onClick={() => setDepositMethod("PIX")}>
                        {language === "pt" ? "Usar PIX" : "Use PIX"}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="rounded-xl sm:rounded-2xl border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {t("purchaseHistory")}
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
                      className={`p-4 rounded-xl bg-muted/30 border border-border transition-colors ${
                        isClickable
                          ? "hover:bg-muted/50 cursor-pointer hover:border-warning/50"
                          : "hover:bg-muted/40"
                      }`}
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
                                  ? t("pending")
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
        <DialogContent className="bg-card border-border text-foreground max-w-2xl w-full p-4 sm:p-6">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-foreground text-lg sm:text-xl">
              {t("scanQRCode")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
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
                  <Image
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code PIX"
                    width={224}
                    height={224}
                    className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-border rounded-xl"
                    unoptimized
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 bg-muted border-2 border-border rounded-xl flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">
                      {language === "pt"
                        ? "QR Code não disponível"
                        : "QR Code not available"}
                    </p>
                  </div>
                )}
                <div className="text-center space-y-1">
                  <p className="text-xs text-muted-foreground">Valor:</p>
                  <p className="text-xl sm:text-2xl font-bold text-primary">
                    {formatBRL(pixData.amount)}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Você receberá: {formatUSDT(pixData.usdtAmount)} USDT
                  </p>
                </div>
              </div>

              {/* Copy Button with PIX Code */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-foreground">
                  Código PIX (Copia e Cola):
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
                        {t("codeCopied")}
                      </span>
                    </>
                  ) : pixData.qrCode ? (
                    <>
                      <code className="flex-1 text-[10px] sm:text-xs text-left font-mono break-all pr-2 text-foreground">
                        {pixData.qrCode}
                      </code>
                      <Copy className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-warning" />
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-xs sm:text-sm text-muted-foreground text-left">
                        {t("pixCodeNotAvailable")}
                      </span>
                      <Copy className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-gray-500" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-[10px] sm:text-xs text-muted-foreground text-center pt-2">
                {t("paymentInstructions")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Check className="w-6 h-6 text-primary" />
              Pagamento Confirmado!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Seu pagamento foi processado com sucesso
            </DialogDescription>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Valor pago:</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatBRL(receiptData.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">USDT recebido:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatUSDT(receiptData.usdtAmount)} USDT
                  </span>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">
                      ID da transação:
                    </span>
                    <span className="text-xs font-mono text-foreground">
                      {receiptData.transactionId.substring(0, 20)}...
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Data:</span>
                    <span className="text-sm text-foreground">
                      {receiptData.date.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  setShowReceipt(false);
                  setReceiptData(null);
                }}
                className="w-full py-3"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Page Indicator - Bottom Navigation */}
      {isMobile && (
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
