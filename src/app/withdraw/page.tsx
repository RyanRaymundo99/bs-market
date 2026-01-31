"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
} from "lucide-react";
import NavbarNew from "@/components/ui/navbar-new";
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

  // USDT Form States
  const [usdtAmount, setUsdtAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("TRC20");

  // PIX Form States
  const [withdrawalType, setWithdrawalType] = useState<"USDT" | "PIX">("USDT");
  const [pixAmount, setPixAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixPassword, setPixPassword] = useState("");
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
  }, [language]);

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

  // Fetch withdrawal history
  const fetchWithdrawalHistory = async () => {
    try {
      const response = await fetch("/api/withdrawals");
      if (response.ok) {
        const data = await response.json();
        setWithdrawalHistory(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching withdrawal history:", error);
    }
  };

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
        setSuccessMessage(t("transactionSent"));
        setShowSuccessModal(true);
        setUsdtAmount("");
        setWalletAddress("");
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

  // No fee on PIX withdrawals
  const calculatePixFee = () => 0;

  const calculatePixNetAmount = () => {
    if (!pixAmount || parseFloat(pixAmount) <= 0) return 0;
    const amount = parseFloat(pixAmount);
    return isNaN(amount) ? 0 : amount;
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
    if (!pixAmount || parseFloat(pixAmount) <= 0) {
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

    if (!pixPassword) {
      toast({
        title: language === "pt" ? "Senha obrigatória" : "Password required",
        description:
          language === "pt"
            ? "Digite sua senha para confirmar"
            : "Enter your password to confirm",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingPix(true);
      const response = await fetch("/api/withdraw/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(pixAmount),
          pixKey: pixKey.trim(),
          password: pixPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(
          language === "pt"
            ? `Saque PIX de ${formatBRL(
                parseFloat(pixAmount)
              )} solicitado com sucesso! Protocolo: ${data.withdrawal.protocol}`
            : `PIX withdrawal of ${formatBRL(
                parseFloat(pixAmount)
              )} requested successfully! Protocol: ${data.withdrawal.protocol}`
        );
        setShowSuccessModal(true);
        setPixAmount("");
        setPixKey("");
        setPixPassword("");
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

  // Get BRL balance - calculated from USDT with 2% discount
  const getBrlBalance = () => {
    if (!walletData || !usdtToBrlRate) return 0;

    // Find USDT balance
    const usdtBalance = walletData.balances.find((b) => b.currency === "USDT");
    if (!usdtBalance) return 0;

    // Calculate BRL = USDT * rate * 0.98 (2% discount)
    const usdtAmount = Number(usdtBalance.amount);
    return usdtAmount * usdtToBrlRate * 0.98;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            {t("pending")}
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {t("processingStatus")}
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {t("completedStatus")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            {t("rejectedStatus")}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{t("unknown")}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "PROCESSING":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchWalletData(), fetchWithdrawalHistory()]);
      setLoading(false);
    };
    loadData();
  }, [fetchWalletData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>
                {language === "pt"
                  ? "Carregando página de saque..."
                  : "Loading withdrawal page..."}
              </p>
            </div>
          </div>
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
            <Card className="rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
              <CardHeader>
                {/* Header inside card */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    {t("withdrawUSDT")}
                  </h1>
                  <p className="text-gray-400 text-sm sm:text-base">
                    {t("chooseWithdrawalMethod")}
                  </p>
                </div>

                {withdrawalsDisabled ? (
                  <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                    <p className="text-sm font-medium text-yellow-200">
                      {language === "pt"
                        ? "Atualização da plataforma"
                        : "Platform update"}
                    </p>
                    <p className="text-xs text-yellow-100/80 mt-1">
                      {withdrawalsDisabledMessage ||
                        (language === "pt"
                          ? "Saques estão temporariamente desativados."
                          : "Withdrawals are temporarily disabled.")}
                    </p>
                  </div>
                ) : null}

                {/* Withdrawal Type Tabs */}
                <div className="mb-4 flex justify-center">
                  <div className="relative inline-flex items-center bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-1 shadow-lg">
                    <button
                      onClick={() => setWithdrawalType("USDT")}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        withdrawalType === "USDT"
                          ? "bg-brand-500 text-white shadow-md"
                          : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Coins className="h-4 w-4" />
                        <span>USDT</span>
                      </div>
                    </button>
                    <div className="h-6 w-px bg-gray-700 mx-1"></div>
                    <button
                      onClick={() => setWithdrawalType("PIX")}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        withdrawalType === "PIX"
                          ? "bg-green-600 text-white shadow-md"
                          : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Wallet className="h-4 w-4" />
                        <span>PIX (BRL)</span>
                      </div>
                    </button>
                  </div>
                </div>
                <CardTitle className="flex items-center gap-2 text-white">
                  {withdrawalType === "USDT" ? (
                    <>
                      <Coins className="h-5 w-5" />
                      {t("withdrawViaUSDT")}
                    </>
                  ) : (
                    <>
                      <Wallet className="h-5 w-5 text-green-500" />
                      {language === "pt" ? "Saque via PIX" : "Withdraw via PIX"}
                    </>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-400">
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
                    {/* USDT Balance */}
                    <div className="p-4 sm:p-6 bg-gradient-to-br from-brand-500/20 to-blue-500/20 rounded-xl border border-brand-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="h-5 w-5 text-brand-400" />
                        <span className="text-sm font-medium text-gray-300">
                          {t("availableBalance")}
                        </span>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-brand-400">
                        {usdtBalance && typeof usdtBalance.amount === "number"
                          ? formatUSDT(usdtBalance.amount)
                          : "0 USDT"}
                      </p>
                    </div>

                    {/* USDT Form */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="usdt-amount" className="text-gray-300">
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
                          className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="wallet-address"
                          className="text-gray-300"
                        >
                          {t("walletAddress")}
                        </Label>
                        <Input
                          id="wallet-address"
                          type="text"
                          placeholder={t("enterWalletAddress")}
                          value={walletAddress}
                          onChange={(e) => setWalletAddress(e.target.value)}
                          className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl"
                        />
                      </div>

                      <div>
                        <Label htmlFor="network" className="text-gray-300">
                          {t("network")}
                        </Label>
                        <Select
                          value={selectedNetwork}
                          onValueChange={setSelectedNetwork}
                        >
                          <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl">
                            <SelectValue placeholder={t("selectNetwork")} />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem
                              value="TRC20"
                              className="text-white hover:bg-gray-700"
                            >
                              {t("trc20Option")}
                            </SelectItem>
                            <SelectItem
                              value="ERC20"
                              className="text-white hover:bg-gray-700"
                            >
                              {t("erc20Option")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Fee Calculation */}
                      <div className="p-4 sm:p-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">
                            {t("networkFee")}
                          </span>
                          <span className="text-sm font-medium text-red-400">
                            -{formatUSDT(getNetworkFee())}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                          <span className="text-sm font-medium text-gray-300">
                            {t("netTotal")}
                          </span>
                          <span className="text-lg sm:text-xl font-bold text-brand-400">
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
                        className="w-full h-12 sm:h-14 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-base sm:text-lg"
                      >
                        {processing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            {t("processing")}
                          </>
                        ) : (
                          t("sendUSDT")
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* PIX / BRL Balance */}
                    <div className="p-4 sm:p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="h-5 w-5 text-green-400" />
                        <span className="text-sm font-medium text-gray-300">
                          {language === "pt"
                            ? "Saldo Disponível em BRL"
                            : "Available BRL Balance"}
                        </span>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-green-400">
                        {formatBRL(getBrlBalance())}
                      </p>
                    </div>

                    {/* PIX Form */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="pix-amount" className="text-gray-300">
                          {language === "pt"
                            ? "Valor a Sacar (R$)"
                            : "Amount to Withdraw (R$)"}
                        </Label>
                        <Input
                          id="pix-amount"
                          type="number"
                          placeholder="0.00"
                          value={pixAmount}
                          onChange={(e) => setPixAmount(e.target.value)}
                          min="0"
                          step="0.01"
                          max={getBrlBalance()}
                          className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl"
                        />
                      </div>

                      <div>
                        <Label htmlFor="pix-key" className="text-gray-300">
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
                          className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl"
                        />
                      </div>

                      <div>
                        <Label htmlFor="pix-password" className="text-gray-300">
                          {language === "pt"
                            ? "Confirmar Senha"
                            : "Confirm Password"}
                        </Label>
                        <Input
                          id="pix-password"
                          type="password"
                          placeholder={
                            language === "pt"
                              ? "Digite sua senha para confirmar"
                              : "Enter your password to confirm"
                          }
                          value={pixPassword}
                          onChange={(e) => setPixPassword(e.target.value)}
                          className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl"
                        />
                      </div>

                      {/* PIX withdrawal summary (no fee) */}
                      <div className="p-4 sm:p-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">
                            {language === "pt"
                              ? "Valor a receber"
                              : "Amount to receive"}
                          </span>
                          <span className="text-lg sm:text-xl font-bold text-green-400">
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
                          !pixPassword ||
                          parseFloat(pixAmount) <= 0 ||
                          parseFloat(pixAmount) > getBrlBalance()
                        }
                        className="w-full h-12 sm:h-14 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-base sm:text-lg"
                      >
                        {processingPix ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            {t("processing")}
                          </>
                        ) : language === "pt" ? (
                          "Sacar via PIX"
                        ) : (
                          "Withdraw via PIX"
                        )}
                      </Button>

                      <p className="text-xs text-gray-500 text-center">
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

        {/* Withdrawal History */}
        <Card className="mt-6 sm:mt-8 rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <History className="h-5 w-5" />
              {t("withdrawalHistory")}
            </CardTitle>
            <CardDescription className="text-gray-400">
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
                        className="border-b hover:bg-muted/50"
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
                            className={
                              withdrawal.type === "PIX"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-brand-500/20 text-brand-400 border-brand-500/30"
                            }
                          >
                            {withdrawal.type === "PIX" ? "PIX" : "USDT"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
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
                            <code className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
                              {withdrawal.protocol}
                            </code>
                          ) : withdrawal.hash ? (
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
                                {withdrawal.hash.slice(0, 8)}...
                              </code>
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {t("withdrawalProcessed")}
            </DialogTitle>
            <DialogDescription>{successMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
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
            <div className="relative inline-flex items-center bg-black/90 backdrop-blur-sm border border-gray-800 rounded-full px-1 py-1.5 shadow-lg">
              {/* Deposit */}
              <button
                onClick={() => router.push("/trade")}
                className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation ${
                  pathname === "/trade"
                    ? "bg-green-500 text-white"
                    : "text-gray-400 hover:text-white active:bg-gray-700/50"
                }`}
                style={{ minWidth: "44px", minHeight: "44px" }}
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>

              {/* Dashboard */}
              <button
                onClick={() => router.push("/dashboard")}
                className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation ${
                  pathname === "/dashboard"
                    ? "bg-brand-500 text-white"
                    : "text-gray-400 hover:text-white active:bg-gray-700/50"
                }`}
                style={{ minWidth: "44px", minHeight: "44px" }}
              >
                <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>

              {/* Withdraw */}
              <button
                onClick={() => router.push("/withdraw")}
                className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation ${
                  pathname === "/withdraw"
                    ? "bg-red-500 text-white"
                    : "text-gray-400 hover:text-white active:bg-gray-700/50"
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
