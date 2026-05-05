"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet,
  Coins,
  History,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Home,
  Plus,
  Minus,
} from "lucide-react";
import NavbarNew from "@/components/ui/navbar-new";
import { PageLoader, ButtonLoader } from "@/components/ui/loading";
import { GlobalKYCBanner } from "@/components/GlobalKYCBanner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMobileMenuOpen } from "@/hooks/useMobileMenuOpen";
import { formatUSDT, formatBRL } from "@/lib/format-currency";

interface CryptoBalance {
  currency: string;
  amount: number;
  locked: number;
  usdtValue: number;
  brlValue?: number;
}

interface WalletData {
  balances: CryptoBalance[];
  totalPortfolioValue: number;
  lastUpdated: string;
}

interface WithdrawalHistory {
  id: string;
  type: "USDT" | "PIX";
  amount: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";
  createdAt: string;
  hash?: string;
  walletAddress?: string;
  network?: string;
  pixKey?: string;
  protocol?: string;
  fee?: number;
  netAmount?: number;
}

interface WithdrawalReceiptDetails {
  id: string;
  type: "USDT" | "PIX";
  amount: number;
  netAmount?: number | null;
  fee?: number | null;
  status: string;
  protocol?: string | null;
  pixKey?: string | null;
  walletAddress?: string | null;
  network?: string | null;
  transactionHash?: string | null;
  createdAt: string;
}

const maskPixKey = (value?: string | null) => {
  if (!value) return "-";
  const cleanValue = value.trim();
  if (cleanValue.length <= 6) return cleanValue;
  return `${cleanValue.slice(0, 3)}***${cleanValue.slice(-3)}`;
};

const parseBRLInput = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return 0;

  const commaIndex = trimmedValue.lastIndexOf(",");
  const dotIndex = trimmedValue.lastIndexOf(".");
  const decimalSeparator =
    commaIndex > dotIndex ? "," : dotIndex > commaIndex ? "." : null;

  const normalizedValue = decimalSeparator
    ? trimmedValue
        .replace(new RegExp(`[^0-9\\${decimalSeparator}]`, "g"), "")
        .replace(decimalSeparator, ".")
    : trimmedValue.replace(/[^\d]/g, "");

  const [integerPart, ...decimalParts] = normalizedValue.split(".");
  const normalizedNumber =
    decimalParts.length > 0
      ? `${integerPart}.${decimalParts.join("")}`
      : integerPart;
  const amount = Number(normalizedNumber);

  return Number.isFinite(amount) ? amount : 0;
};

export default function WithdrawPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Admin-controlled switch to disable withdrawals
  const [withdrawalsDisabled, setWithdrawalsDisabled] = useState(false);
  const [withdrawalsDisabledMessage, setWithdrawalsDisabledMessage] =
    useState<string>("");

  // Swipe gesture state for mobile navigation
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const mobileMenuOpen = useMobileMenuOpen();
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
      // Swipe left -> go to dashboard (wrap around)
      router.push("/dashboard");
    } else if (isRightSwipe) {
      // Swipe right -> go to deposit (trade page)
      router.push("/trade");
    }
  };
  const [processing, setProcessing] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<
    WithdrawalHistory[]
  >([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [successDetails, setSuccessDetails] =
    useState<WithdrawalReceiptDetails | null>(null);
  const [newTransactionId, setNewTransactionId] = useState<string | null>(null);

  // USDT Form States
  const [usdtAmount, setUsdtAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("TRC20");

  // PIX Form States
  const [withdrawalType, setWithdrawalType] = useState<"USDT" | "PIX">("USDT");
  const [pixAmount, setPixAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixCPF, setPixCPF] = useState("");
  const [isCPFValid, setIsCPFValid] = useState<boolean | null>(null);
  const [processingPix, setProcessingPix] = useState(false);
  const [usdtToBrlRate, setUsdtToBrlRate] = useState<number | null>(null);

  const { toast } = useToast();
  const { t, language } = useLanguage();

  useEffect(() => {
    const loadMoneyStatus = async () => {
      try {
        const response = await fetch("/api/site-status");
        if (!response.ok) return;
        const data = await response.json();
        if (data?.success) {
          setWithdrawalsDisabled(Boolean(data.withdrawalsDisabled));
          setWithdrawalsDisabledMessage(
            String(data.withdrawalsDisabledMessage || "")
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
                    ? "Sua conta está pendente de aprovação. Complete seu cadastro no perfil antes de sacar."
                    : "Your account is pending approval. Complete your profile before withdrawing.",
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
  }, [language, toast]);

  // Fetch wallet data and exchange rate
  const fetchWalletData = useCallback(async () => {
    try {
      const [walletResponse, rateResponse] = await Promise.all([
        fetch("/api/crypto/wallet"),
        fetch("/api/crypto/usdt-rate"),
      ]);

      if (walletResponse.ok) {
        const data = await walletResponse.json();
        setWalletData(data.data);
      } else {
        throw new Error("Failed to fetch wallet data");
      }

      if (rateResponse.ok) {
        const rateData = await rateResponse.json();
        setUsdtToBrlRate(rateData.rate || null);
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Fetch withdrawal history - CALLBACK
  const fetchWithdrawalHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/withdrawals", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setWithdrawalHistory(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching withdrawal history:", error);
    }
  }, []);

  // Handle USDT withdrawal
  const handleUSDTWithdrawal = async () => {
    if (withdrawalsDisabled) {
      toast({
        title: language === "pt" ? "Indisponível" : "Unavailable",
        description:
          withdrawalsDisabledMessage ||
          (language === "pt"
            ? "Saques temporariamente desativados."
            : "Withdrawals are temporarily disabled."),
        variant: "destructive",
      });
      return;
    }
    if (!usdtAmount || parseFloat(usdtAmount) <= 0) {
      toast({
        title: t("invalidAmount"),
        description: t("enterValidUSDT"),
        variant: "destructive",
      });
      return;
    }

    if (!walletAddress.trim()) {
      toast({
        title: t("addressRequired"),
        description: t("enterWalletAddress"),
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch("/api/withdraw/crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(usdtAmount),
          walletAddress: walletAddress.trim(),
          network: selectedNetwork,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(t("transactionSent"));
        setNewTransactionId(data.data.id || data.data.transaction_id || null);
        setSuccessDetails({
          id: data.data.external_id || data.data.transaction_id || "",
          type: "USDT",
          amount: Number(data.data.amount ?? parseFloat(usdtAmount)),
          netAmount: Number(
            data.data.net_amount ?? calculateUSDTNetAmount()
          ),
          fee: Number(data.data.fee ?? getNetworkFee()),
          status: String(data.data.status || "PENDING").toUpperCase(),
          walletAddress,
          network: selectedNetwork,
          transactionHash: data.data.transaction_id || null,
          createdAt: data.data.created_at || new Date().toISOString(),
        });
        setShowSuccessModal(true);
        setUsdtAmount("");
        setWalletAddress("");
        window.dispatchEvent(new Event("refresh-balance"));
        fetchWalletData();
        fetchWithdrawalHistory();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to process USDT withdrawal");
      }
    } catch (error) {
      toast({
        title: t("withdrawalError"),
        description:
          error instanceof Error ? error.message : t("failedToProcess"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Get network fee based on selected network
  const getNetworkFee = () => {
    switch (selectedNetwork) {
      case "TRC20":
        return 1; // TRC20 typically has lower fees (~1 USDT)
      case "ERC20":
        return 5; // ERC20 typically has higher fees (~5 USDT)
      case "POLYGON":
        return 1; // Polygon has low fees
      default:
        return 1;
    }
  };

  // Calculate USDT net amount based on network fee
  const calculateUSDTNetAmount = () => {
    if (!usdtAmount || parseFloat(usdtAmount) <= 0) return 0;
    const amount = parseFloat(usdtAmount);
    if (isNaN(amount)) return 0;
    const networkFee = getNetworkFee();
    const netAmount = amount - networkFee;
    return isNaN(netAmount) || netAmount < 0 ? 0 : netAmount;
  };


  const calculatePixNetAmount = () => {
    const amount = parseBRLInput(pixAmount);
    return amount > 0 ? amount : 0;
  };

  const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, "");
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleanCPF)) return false;
    
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) {
      sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
    
    return true;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    // Auto-masking
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{3})/, "$1.$2");
    }
    
    setPixCPF(value);
    
    const cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length === 11) {
      setIsCPFValid(validateCPF(cleanValue));
    } else {
      setIsCPFValid(null);
    }
  };

  // Handle PIX withdrawal
  const handlePIXWithdrawal = async () => {
    if (withdrawalsDisabled) {
      toast({
        title: language === "pt" ? "Indisponível" : "Unavailable",
        description:
          withdrawalsDisabledMessage ||
          (language === "pt"
            ? "Saques temporariamente desativados."
            : "Withdrawals are temporarily disabled."),
        variant: "destructive",
      });
      return;
    }
    const parsedPixAmount = parseBRLInput(pixAmount);
    if (!pixAmount || parsedPixAmount <= 0) {
      toast({
        title: language === "pt" ? "Valor inválido" : "Invalid amount",
        description:
          language === "pt"
            ? "Digite um valor válido para saque"
            : "Enter a valid withdrawal amount",
        variant: "destructive",
      });
      return;
    }

    if (!pixKey.trim()) {
      toast({
        title: language === "pt" ? "Chave PIX obrigatória" : "PIX key required",
        description:
          language === "pt" ? "Digite sua chave PIX" : "Enter your PIX key",
        variant: "destructive",
      });
      return;
    }

    if (!pixCPF) {
      toast({
        title: language === "pt" ? "CPF obrigatório" : "CPF required",
        description:
          language === "pt"
            ? "Digite seu CPF para confirmar"
            : "Enter your CPF to confirm",
        variant: "destructive",
      });
      return;
    }

    if (isCPFValid === false) {
      toast({
        title: language === "pt" ? "CPF Inválido" : "Invalid CPF",
        description:
          language === "pt"
            ? "O CPF informado não é válido."
            : "The provided CPF is not valid.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingPix(true);
      const response = await fetch("/api/withdraw/pix", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedPixAmount,
          pixKey: pixKey.trim(),
          cpf: pixCPF.replace(/\D/g, ""),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const withdrawal = data.withdrawal;
        setSuccessMessage(
          language === "pt"
            ? `Saque PIX de ${formatBRL(
                parsedPixAmount
              )} solicitado com sucesso! Protocolo: ${withdrawal.protocol}`
            : `PIX withdrawal of ${formatBRL(
                parsedPixAmount
              )} requested successfully! Protocol: ${withdrawal.protocol}`
        );
        setSuccessDetails({
          id: withdrawal.id,
          type: "PIX",
          amount: Number(withdrawal.amount ?? parsedPixAmount),
          netAmount: Number(withdrawal.netAmount ?? parsedPixAmount),
          fee: Number(withdrawal.fee ?? 0),
          status: withdrawal.status || "PENDING",
          protocol: withdrawal.protocol,
          pixKey: withdrawal.pixKey,
          createdAt: withdrawal.createdAt || new Date().toISOString(),
        });
        setNewTransactionId(withdrawal.id);
        setShowSuccessModal(true);
        setPixAmount("");
        setPixKey("");
        setPixCPF("");
        setIsCPFValid(null);
        window.dispatchEvent(new Event("refresh-balance"));
        fetchWalletData();
        fetchWithdrawalHistory();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to process PIX withdrawal");
      }
    } catch (error) {
      toast({
        title: language === "pt" ? "Erro no saque" : "Withdrawal error",
        description:
          error instanceof Error
            ? error.message
            : language === "pt"
            ? "Não foi possível processar o saque"
            : "Failed to process withdrawal",
        variant: "destructive",
      });
    } finally {
      setProcessingPix(false);
    }
  };

  // BRL available for PIX — null until wallet + rate load (avoids disabling the button with a false 0 balance).
  const brlAvailableForPix = useMemo(() => {
    if (!walletData || usdtToBrlRate == null) return null;
    const usdtBalance = walletData.balances.find((b) => b.currency === "USDT");
    if (!usdtBalance) return null;
    return Number(usdtBalance.amount) * usdtToBrlRate * 0.98;
  }, [walletData, usdtToBrlRate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-warning/20 text-warning">
            {t("pending")}
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            {t("processingStatus")}
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            {t("completedStatus")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="secondary" className="bg-destructive/20 text-destructive">
            {t("rejectedStatus")}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{t("unknown")}</Badge>;
    }
  };

  const getReceiptStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return language === "pt" ? "Em andamento" : "Pending";
      case "PROCESSING":
        return language === "pt" ? "Processando" : "Processing";
      case "COMPLETED":
        return language === "pt" ? "Concluído" : "Completed";
      case "FAILED":
      case "REJECTED":
        return language === "pt" ? "Não aprovado" : "Not approved";
      case "CANCELLED":
        return language === "pt" ? "Cancelado" : "Cancelled";
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-warning" />;
      case "PROCESSING":
        return <Clock className="h-4 w-4 text-primary" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchWalletData(), fetchWithdrawalHistory()]);
      setLoading(false);
    };
    loadData();

    // Set up polling for balance and history
    const interval = setInterval(() => {
      fetchWalletData();
      fetchWithdrawalHistory();
    }, 20000);

    // Listen for balance updates from payments
    const handleBalanceUpdate = () => {
      fetchWalletData();
      fetchWithdrawalHistory();
    };
    window.addEventListener("balance-updated", handleBalanceUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("balance-updated", handleBalanceUpdate);
    };
  }, [fetchWalletData, fetchWithdrawalHistory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
        <GlobalKYCBanner />
        <div className="container mx-auto px-4 py-8">
          <PageLoader
            message={
              language === "pt"
                ? "Carregando página de saque..."
                : "Loading withdrawal page..."
            }
          />
        </div>
      </div>
    );
  }

  const usdtBalance = walletData?.balances.find((b) => b.currency === "USDT");

  return (
    <div
      className="min-h-screen bg-background"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <NavbarNew isLoggingOut={false} handleLogout={() => {}} />
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
        <div className="max-w-4xl mx-auto">
          {/* Main Withdrawal Form */}
          <div>
            <Card className="rounded-xl sm:rounded-2xl border-border bg-card shadow-sm">
              <CardHeader>
                <div className="text-center mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    {t("withdrawUSDT")}
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    {t("chooseWithdrawalMethod")}
                  </p>
                </div>

                {withdrawalsDisabled ? (
                  <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 p-4">
                    <p className="text-sm font-medium text-warning">
                      {language === "pt"
                        ? "Atualização da plataforma"
                        : "Platform update"}
                    </p>
                    <p className="text-xs text-warning/90 mt-1">
                      {withdrawalsDisabledMessage ||
                        (language === "pt"
                          ? "Saques estão temporariamente desativados."
                          : "Withdrawals are temporarily disabled.")}
                    </p>
                  </div>
                ) : null}

                <div className="mb-4 flex justify-center">
                  <div className="relative inline-flex items-center bg-muted/60 border border-border rounded-xl p-1">
                    <button
                      onClick={() => setWithdrawalType("USDT")}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        withdrawalType === "USDT"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Coins className="h-4 w-4" />
                        <span>USDT</span>
                      </div>
                    </button>
                    <div className="h-6 w-px bg-border mx-1" />
                    <button
                      onClick={() => setWithdrawalType("PIX")}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        withdrawalType === "PIX"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Wallet className="h-4 w-4" />
                        <span>PIX (BRL)</span>
                      </div>
                    </button>
                  </div>
                </div>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  {withdrawalType === "USDT" ? (
                    <>
                      <Coins className="h-5 w-5 text-primary" />
                      {t("withdrawViaUSDT")}
                    </>
                  ) : (
                    <>
                      <Wallet className="h-5 w-5 text-primary" />
                      {language === "pt" ? "Saque via PIX" : "Withdraw via PIX"}
                    </>
                  )}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {withdrawalType === "USDT"
                    ? t("sendUSDTToWallet")
                    : language === "pt"
                    ? "Receba em reais na sua chave PIX"
                    : "Receive in BRL to your PIX key"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {withdrawalType === "USDT" ? (
                  <>
                    <div className="p-4 sm:p-6 bg-primary/10 rounded-xl border border-primary/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("availableBalance")}
                        </span>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-primary">
                        {usdtBalance && typeof usdtBalance.amount === "number"
                          ? formatUSDT(usdtBalance.amount)
                          : "0 USDT"}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="usdt-amount" className="text-foreground">
                          {t("amountToWithdraw")}
                        </Label>
                        <Input
                          id="usdt-amount"
                          type="number"
                          placeholder="0.00"
                          value={usdtAmount}
                          onChange={(e) => setUsdtAmount(e.target.value)}
                          min="0"
                          step="0.01"
                          max={usdtBalance ? usdtBalance.amount : undefined}
                          className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary rounded-xl"
                        />
                      </div>

                      <div>
                        <Label htmlFor="wallet-address" className="text-foreground">
                          {t("walletAddress")}
                        </Label>
                        <Input
                          id="wallet-address"
                          type="text"
                          placeholder={t("enterWalletAddress")}
                          value={walletAddress}
                          onChange={(e) => setWalletAddress(e.target.value)}
                          className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary rounded-xl"
                        />
                      </div>

                      <div>
                        <Label htmlFor="network" className="text-foreground">
                          {t("network")}
                        </Label>
                        <Select
                          value={selectedNetwork}
                          onValueChange={setSelectedNetwork}
                        >
                          <SelectTrigger className="bg-muted/50 border-border text-foreground focus:ring-primary rounded-xl">
                            <SelectValue placeholder={t("selectNetwork")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TRC20">
                              {t("trc20Option")}
                            </SelectItem>
                            <SelectItem value="ERC20">
                              {t("erc20Option")}
                            </SelectItem>
                            <SelectItem value="POLYGON">
                              {t("polygonOption")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-4 sm:p-6 bg-muted/30 rounded-xl border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            {t("networkFee")}
                          </span>
                          <span className="text-sm font-medium text-destructive">
                            -{formatUSDT(getNetworkFee())}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="text-sm font-medium text-foreground">
                            {t("netTotal")}
                          </span>
                          <span className="text-lg sm:text-xl font-bold text-primary">
                            {formatUSDT(calculateUSDTNetAmount() || 0)}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={handleUSDTWithdrawal}
                        disabled={
                          withdrawalsDisabled ||
                          processing ||
                          !usdtAmount ||
                          !walletAddress ||
                          parseFloat(usdtAmount) <= 0
                        }
                        className="w-full h-12 sm:h-14 font-semibold rounded-xl text-base sm:text-lg"
                      >
                        {processing ? (
                          <ButtonLoader
                            label={t("processing")}
                            size="default"
                            className="text-primary-foreground"
                          />
                        ) : (
                          t("sendUSDT")
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 sm:p-6 bg-primary/10 rounded-xl border border-primary/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {language === "pt"
                            ? "Saldo Disponível em BRL"
                            : "Available BRL Balance"}
                        </span>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-primary">
                        {brlAvailableForPix != null
                          ? formatBRL(brlAvailableForPix)
                          : "—"}
                      </p>
                      {brlAvailableForPix == null && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {language === "pt"
                            ? "Carregando cotação USDT/BRL…"
                            : "Loading USDT/BRL rate…"}
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="pix-amount" className="text-foreground">
                          {language === "pt"
                            ? "Valor a Sacar (R$)"
                            : "Amount to Withdraw (R$)"}
                        </Label>
                        <Input
                          id="pix-amount"
                          type="text"
                          placeholder="0,00"
                          value={pixAmount}
                          onChange={(e) => setPixAmount(e.target.value)}
                          inputMode="decimal"
                          className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary rounded-xl"
                        />
                      </div>

                      <div>
                        <Label htmlFor="pix-key" className="text-foreground">
                          {language === "pt" ? "Chave PIX" : "PIX Key"}
                        </Label>
                        <Input
                          id="pix-key"
                          type="text"
                          placeholder={
                            language === "pt"
                              ? "CPF, CNPJ, email, telefone ou chave aleatória"
                              : "CPF, CNPJ, email, phone or random key"
                          }
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                          className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary rounded-xl"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="pix-cpf" className="text-foreground">
                            {language === "pt"
                              ? "Confirmar CPF"
                              : "Confirm CPF"}
                          </Label>
                          {isCPFValid !== null && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isCPFValid ? "text-primary" : "text-destructive"}`}>
                              {isCPFValid 
                                ? (language === "pt" ? "Válido" : "Valid") 
                                : (language === "pt" ? "Inválido" : "Invalid")}
                            </span>
                          )}
                        </div>
                        <Input
                          id="pix-cpf"
                          type="text"
                          placeholder="000.000.000-00"
                          value={pixCPF}
                          onChange={handleCPFChange}
                          className={`bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary rounded-xl ${
                            isCPFValid === false ? "border-destructive focus:ring-destructive" : ""
                          }`}
                        />
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {language === "pt" 
                            ? "Confirme sua identidade informando seu CPF real." 
                            : "Confirm your identity by entering your real CPF."}
                        </p>
                      </div>

                      <div className="p-4 sm:p-6 bg-muted/30 rounded-xl border border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {language === "pt"
                              ? "Valor a receber"
                              : "Amount to receive"}
                          </span>
                          <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatBRL(calculatePixNetAmount())}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={handlePIXWithdrawal}
                        disabled={
                          withdrawalsDisabled ||
                          processingPix ||
                          !pixAmount ||
                          !pixKey ||
                          !pixCPF ||
                          isCPFValid === false ||
                          parseBRLInput(pixAmount) <= 0 ||
                          (brlAvailableForPix != null &&
                            parseBRLInput(pixAmount) > brlAvailableForPix)
                        }
                        className="w-full h-12 sm:h-14 font-semibold rounded-xl text-base sm:text-lg"
                      >
                        {processingPix ? (
                          <ButtonLoader
                            label={t("processing")}
                            size="default"
                            className="text-primary-foreground"
                          />
                        ) : language === "pt" ? (
                          "Sacar via PIX"
                        ) : (
                          "Withdraw via PIX"
                        )}
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        {language === "pt"
                          ? "O saque PIX é processado manualmente. Prazo de até 24 horas úteis."
                          : "PIX withdrawal is processed manually. Up to 24 business hours."}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-6 sm:mt-8 rounded-xl sm:rounded-2xl border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <History className="h-5 w-5 text-primary" />
              {t("withdrawalHistory")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t("withdrawalHistoryDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawalHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">{t("date")}</th>
                      <th className="text-left py-3 px-4">{t("type")}</th>
                      <th className="text-left py-3 px-4">{t("value")}</th>
                      <th className="text-left py-3 px-4">{t("status")}</th>
                      <th className="text-left py-3 px-4">
                        {t("hashProtocol")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalHistory.map((withdrawal) => (
                      <tr
                        key={withdrawal.id}
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => router.push(`/transaction/${withdrawal.id}`)}
                      >
                        <td className="py-3 px-4">
                          {new Date(withdrawal.createdAt).toLocaleDateString(
                            language === "pt" ? "pt-BR" : "en-US",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="secondary"
                            className="bg-primary/20 text-primary border-primary/30"
                          >
                            {withdrawal.type === "PIX" ? "PIX" : "USDT"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {withdrawal.type === "PIX"
                            ? formatBRL(withdrawal.amount)
                            : formatUSDT(withdrawal.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(withdrawal.status)}
                            {getStatusBadge(withdrawal.status)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {withdrawal.type === "PIX" && withdrawal.protocol ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded text-foreground">
                              {withdrawal.protocol}
                            </code>
                          ) : withdrawal.hash ? (
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded text-foreground">
                                {withdrawal.hash.slice(0, 8)}...
                              </code>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t("noWithdrawalHistory")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                <CheckCircle className="h-5 w-5 text-primary" />
              </span>
              <span>
                {language === "pt" ? "Comprovante de Saque" : "Withdrawal Receipt"}
              </span>
            </DialogTitle>
            <DialogDescription>{successMessage}</DialogDescription>
          </DialogHeader>

          {successDetails ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-primary/25 bg-primary/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {language === "pt" ? "Valor solicitado" : "Requested amount"}
                </p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <p className="text-3xl font-bold text-primary">
                    {successDetails.type === "PIX"
                      ? formatBRL(successDetails.amount)
                      : formatUSDT(successDetails.amount)}
                  </p>
                  <Badge className="bg-primary text-primary-foreground">
                    {getReceiptStatusLabel(successDetails.status)}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">
                    {language === "pt" ? "Método" : "Method"}
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {successDetails.type === "PIX"
                      ? "PIX (BRL)"
                      : `${successDetails.network || selectedNetwork} USDT`}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">
                    {language === "pt" ? "Data da solicitação" : "Requested at"}
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {new Date(successDetails.createdAt).toLocaleString(
                      language === "pt" ? "pt-BR" : "en-US",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">
                    {successDetails.type === "PIX"
                      ? language === "pt"
                        ? "Chave PIX"
                        : "PIX key"
                      : language === "pt"
                      ? "Carteira destino"
                      : "Destination wallet"}
                  </p>
                  <p className="mt-1 break-all font-semibold text-foreground">
                    {successDetails.type === "PIX"
                      ? maskPixKey(successDetails.pixKey)
                      : successDetails.walletAddress || "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">
                    {successDetails.type === "PIX"
                      ? language === "pt"
                        ? "Protocolo PIX"
                        : "PIX Protocol"
                      : language === "pt"
                      ? "Hash da transação"
                      : "Transaction Hash"}
                  </p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-foreground">
                    {successDetails.protocol ||
                      successDetails.transactionHash ||
                      successDetails.id}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === "pt" ? "Taxa" : "Fee"}
                  </span>
                  <span className="font-medium text-foreground">
                    {successDetails.type === "PIX"
                      ? formatBRL(Number(successDetails.fee || 0))
                      : formatUSDT(Number(successDetails.fee || 0))}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">
                    {language === "pt" ? "Valor líquido" : "Net amount"}
                  </span>
                  <span className="font-semibold text-primary">
                    {successDetails.type === "PIX"
                      ? formatBRL(
                          Number(successDetails.netAmount ?? successDetails.amount)
                        )
                      : formatUSDT(
                          Number(successDetails.netAmount ?? successDetails.amount)
                        )}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
                {successDetails.type === "PIX"
                  ? language === "pt"
                    ? "Seu saque PIX foi registrado e será processado manualmente. Prazo estimado: até 24 horas úteis."
                    : "Your PIX withdrawal was registered and will be processed manually. Estimated time: up to 24 business hours."
                  : language === "pt"
                  ? "Seu saque USDT foi enviado para processamento. A confirmação pode depender da rede selecionada."
                  : "Your USDT withdrawal was sent for processing. Confirmation can depend on the selected network."}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            {newTransactionId && (
              <Button
                variant="outline"
                onClick={() => router.push(`/transaction/${newTransactionId}`)}
              >
                {language === "pt" ? "Ver Detalhes" : "View Details"}
              </Button>
            )}
            <Button onClick={() => setShowSuccessModal(false)}>
              {t("close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Page Indicator - Bottom Navigation (hidden when mobile menu is open) */}
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
                  pathname === "/trade"
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
}
