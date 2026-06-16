"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { DESKTOP_SHELL_PL, MOBILE_BOTTOM_NAV_PADDING } from "@/constants/layout-shell";
import { ButtonLoader } from "@/components/ui/loading";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency, formatBRL } from "@/lib/format-currency";
import {
  DigitalReceipt,
  type DigitalReceiptHeaderTone,
  type DigitalReceiptStatusBadgeTone,
} from "@/components/TransactionReceipt";
import {
  CRYPTO_CURRENCIES,
  CRYPTO_NETWORK_LABELS,
  CryptoCurrency,
  CryptoNetwork,
  getCryptoNetworks,
  getDefaultCryptoNetwork,
} from "@/lib/crypto-assets";
import {
  getUsdtDebitedPerUnitWithdrawnClient,
  usdcWithdrawalCapacityUsdt,
} from "@/lib/stablecoin-withdraw";
import { readSessionCache, writeSessionCache } from "@/lib/utils";

const WALLET_CACHE_KEY = "crypto-wallet";
const WALLET_CACHE_MS = 120_000;

interface CryptoBalance {
  currency: string;
  amount: number;
  locked: number;
}

interface WalletData {
  balances: CryptoBalance[];
  totalPortfolioValue?: number;
  lastUpdated: string;
}

interface WithdrawalHistory {
  id: string;
  type: CryptoCurrency | "PIX";
  currency?: string;
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
  type: CryptoCurrency | "PIX";
  currency?: string;
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

function withdrawReceiptHeaderTone(status: string): DigitalReceiptHeaderTone {
  const u = status.toUpperCase();
  if (u === "COMPLETED") return "success";
  if (u === "REJECTED" || u === "FAILED" || u === "CANCELLED") return "danger";
  return "pending";
}

function withdrawReceiptBadgeTone(
  status: string
): DigitalReceiptStatusBadgeTone {
  const u = status.toUpperCase();
  if (u === "COMPLETED") return "success";
  if (u === "PENDING" || u === "PROCESSING") return "info";
  if (u === "REJECTED" || u === "FAILED") return "destructive";
  return "secondary";
}

export default function WithdrawPage() {
  const router = useRouter();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Admin-controlled switch to disable withdrawals
  const [withdrawalsDisabled, setWithdrawalsDisabled] = useState(false);
  const [withdrawalsDisabledMessage, setWithdrawalsDisabledMessage] =
    useState<string>("");

  const [processing, setProcessing] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<
    WithdrawalHistory[]
  >([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [successDetails, setSuccessDetails] =
    useState<WithdrawalReceiptDetails | null>(null);
  const [newTransactionId, setNewTransactionId] = useState<string | null>(null);

  // Crypto Form States
  const [selectedCurrency, setSelectedCurrency] =
    useState<CryptoCurrency>("USDT");
  const [usdtAmount, setUsdtAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedNetwork, setSelectedNetwork] =
    useState<CryptoNetwork>(getDefaultCryptoNetwork("USDT"));

  // PIX Form States
  const [withdrawalType, setWithdrawalType] = useState<"CRYPTO" | "PIX">(
    "CRYPTO"
  );
  const [pixAmount, setPixAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixCPF, setPixCPF] = useState("");
  const [isCPFValid, setIsCPFValid] = useState<boolean | null>(null);
  const [processingPix, setProcessingPix] = useState(false);
  const [usdtToBrlRate, setUsdtToBrlRate] = useState<number | null>(null);

  const { toast } = useToast();
  const { t, language } = useLanguage();

  useLayoutEffect(() => {
    const cached = readSessionCache<WalletData>(WALLET_CACHE_KEY, WALLET_CACHE_MS);
    if (cached) setWalletData(cached);
  }, []);

  const usdtBalanceAmount = useMemo(() => {
    const row = walletData?.balances.find((b) => b.currency === "USDT");
    return row ? Number(row.amount) : 0;
  }, [walletData]);

  const usdcBalanceAmount = useMemo(() => {
    const row = walletData?.balances.find((b) => b.currency === "USDC");
    return row ? Number(row.amount) : 0;
  }, [walletData]);

  const stableDebitRate = useMemo(
    () => getUsdtDebitedPerUnitWithdrawnClient(selectedCurrency),
    [selectedCurrency]
  );

  /** Max gross amount withdrawable in the selected asset (matches API). */
  const maxCryptoWithdrawGross = useMemo(() => {
    if (!walletData) return 0;
    if (selectedCurrency === "USDT") {
      return Math.max(0, usdtBalanceAmount);
    }
    const capacity = usdcWithdrawalCapacityUsdt(
      usdtBalanceAmount,
      usdcBalanceAmount,
      stableDebitRate
    );
    return Math.max(0, capacity / stableDebitRate);
  }, [
    walletData,
    selectedCurrency,
    usdtBalanceAmount,
    usdcBalanceAmount,
    stableDebitRate,
  ]);

  const handleCurrencyChange = (currency: CryptoCurrency) => {
    setSelectedCurrency(currency);
    setSelectedNetwork(getDefaultCryptoNetwork(currency));
  };

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
              router.replace("/profile");
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
        if (data.data) writeSessionCache(WALLET_CACHE_KEY, data.data);
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
      setWalletData((prev) => prev ?? { balances: [], lastUpdated: new Date().toISOString() });
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
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Handle crypto withdrawal
  const handleCryptoWithdrawal = async () => {
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
        description:
          language === "pt"
            ? `Digite um valor válido em ${selectedCurrency}`
            : `Enter a valid ${selectedCurrency} amount`,
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

    const parsedCrypto = parseFloat(usdtAmount);
    if (parsedCrypto > maxCryptoWithdrawGross + 1e-8) {
      toast({
        title: t("withdrawalError"),
        description:
          language === "pt"
            ? `Valor acima do disponível (${formatCurrency(
                maxCryptoWithdrawGross,
                selectedCurrency,
                { maxDecimals: 4 }
              )}).`
            : `Amount exceeds available (${formatCurrency(
                maxCryptoWithdrawGross,
                selectedCurrency,
                { maxDecimals: 4 }
              )}).`,
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
          currency: selectedCurrency,
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
          type: selectedCurrency,
          currency: selectedCurrency,
          amount: Number(data.data.amount ?? parseFloat(usdtAmount)),
          netAmount: Number(
            data.data.net_amount ?? calculateCryptoNetAmount()
          ),
          fee: Number(data.data.fee ?? getNetworkFee()),
          status: String(data.data.status || "PENDING").toUpperCase(),
          walletAddress:
            typeof data.data.recipient_address === "string" &&
            data.data.recipient_address.trim()
              ? data.data.recipient_address.trim()
              : walletAddress.trim(),
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
        throw new Error(
          error.error || `Failed to process ${selectedCurrency} withdrawal`
        );
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

  // Calculate crypto net amount based on network fee
  const calculateCryptoNetAmount = () => {
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

  // Reais available for PIX — null until wallet + rate load
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

  const formatWithdrawalDate = (createdAt: string) =>
    new Date(createdAt).toLocaleDateString(
      language === "pt" ? "pt-BR" : "en-US",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  const formatWithdrawalAmount = (withdrawal: WithdrawalHistory) =>
    withdrawal.type === "PIX"
      ? formatBRL(withdrawal.amount)
      : formatCurrency(withdrawal.amount, withdrawal.currency || withdrawal.type, {
          maxDecimals: 4,
        });

  const renderWithdrawalProtocol = (withdrawal: WithdrawalHistory) => {
    if (withdrawal.type === "PIX" && withdrawal.protocol) {
      return (
        <code
          className="block max-w-full truncate rounded bg-muted px-2 py-1 text-left text-xs text-foreground"
          title={withdrawal.protocol}
        >
          {withdrawal.protocol}
        </code>
      );
    }

    if (withdrawal.hash) {
      return (
        <div className="flex min-w-0 items-center gap-1.5">
          <code
            className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs text-foreground"
            title={withdrawal.hash}
          >
            {withdrawal.hash}
          </code>
          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
        </div>
      );
    }

    return <span className="text-muted-foreground">-</span>;
  };

  useEffect(() => {
    void Promise.all([fetchWalletData(), fetchWithdrawalHistory()]);

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

  return (
    <div className={`min-h-screen bg-background ${DESKTOP_SHELL_PL}`}>
      <div
        className={`mx-auto w-full max-w-[1800px] px-3 sm:px-5 xl:px-8 py-4 sm:py-6 ${MOBILE_BOTTOM_NAV_PADDING}`}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] xl:gap-10">
          {/* Withdrawal form */}
          <div className="min-w-0">
            <Card className="rounded-xl sm:rounded-2xl border-border bg-card shadow-sm">
              <CardHeader className="space-y-3">
                {withdrawalsDisabled ? (
                  <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
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

                <div
                  className="space-y-3"
                  role="group"
                  aria-label={
                    language === "pt"
                      ? "Cabeçalho do saque"
                      : "Withdraw header"
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl">
                      {language === "pt" ? "Sacar" : "Withdraw"}
                    </h1>
                    <div className="relative inline-flex shrink-0 items-center rounded-xl border border-border bg-muted/60 p-0.5 sm:p-1">
                      <button
                        type="button"
                        onClick={() => setWithdrawalType("CRYPTO")}
                        className={`rounded-lg px-2.5 py-2 text-xs font-medium transition-all sm:px-4 sm:py-2.5 sm:text-sm ${
                          withdrawalType === "CRYPTO"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 sm:gap-2">
                          <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span>Cripto</span>
                        </span>
                      </button>
                      <div className="mx-0.5 h-5 w-px shrink-0 bg-border sm:mx-1 sm:h-6" />
                      <button
                        type="button"
                        onClick={() => setWithdrawalType("PIX")}
                        className={`rounded-lg px-2.5 py-2 text-xs font-medium transition-all sm:px-4 sm:py-2.5 sm:text-sm ${
                          withdrawalType === "PIX"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 sm:gap-2">
                          <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span>PIX</span>
                        </span>
                      </button>
                    </div>
                  </div>

                  <p className="hidden text-sm text-muted-foreground sm:block">
                    {t("chooseWithdrawalMethod")}
                  </p>

                  <div className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                    {withdrawalType === "CRYPTO" ? (
                      <>
                        <Coins className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground sm:text-base">
                            {language === "pt"
                              ? `Saque via ${selectedCurrency}`
                              : `Withdraw via ${selectedCurrency}`}
                          </p>
                          <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-sm">
                            {language === "pt"
                              ? `Envie ${selectedCurrency} para sua carteira`
                              : `Send ${selectedCurrency} to your wallet`}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground sm:text-base">
                            {language === "pt"
                              ? "Saque via PIX"
                              : "Withdraw via PIX"}
                          </p>
                          <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-sm">
                            {language === "pt"
                              ? "Receba em reais na sua chave PIX"
                              : "Receive in reais on your PIX key"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {withdrawalType === "CRYPTO" ? (
                  <>
                    <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Coins className="h-5 w-5 shrink-0 text-primary" />
                          <span className="text-sm font-medium text-muted-foreground">
                            {t("availableBalance")}
                          </span>
                        </div>
                        <p className="shrink-0 text-xl font-bold tabular-nums text-primary sm:text-3xl">
                          {!walletData ? (
                            <span
                              className="inline-block h-8 w-24 rounded-lg bg-muted animate-pulse sm:h-9 sm:w-40"
                              aria-busy="true"
                              aria-label={
                                language === "pt"
                                  ? "Carregando saldo"
                                  : "Loading balance"
                              }
                            />
                          ) : (
                            formatCurrency(
                              maxCryptoWithdrawGross,
                              selectedCurrency,
                              { maxDecimals: 4 }
                            )
                          )}
                        </p>
                      </div>
                      {selectedCurrency === "USDC" && walletData ? (
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          {language === "pt"
                            ? `Saldo em USDT: ${formatCurrency(
                                usdtBalanceAmount,
                                "USDT",
                                { maxDecimals: 2 }
                              )}${
                                usdcBalanceAmount > 0
                                  ? ` · USDC: ${formatCurrency(
                                      usdcBalanceAmount,
                                      "USDC",
                                      { maxDecimals: 4 }
                                    )}`
                                  : ""
                              }. Retirada em USDC usa ${stableDebitRate} USDT do saldo por 1 USDC.`
                            : `USDT balance: ${formatCurrency(
                                usdtBalanceAmount,
                                "USDT",
                                { maxDecimals: 2 }
                              )}${
                                usdcBalanceAmount > 0
                                  ? ` · USDC: ${formatCurrency(
                                      usdcBalanceAmount,
                                      "USDC",
                                      { maxDecimals: 4 }
                                    )}`
                                  : ""
                              }. Each 1 USDC withdrawn debits ${stableDebitRate} USDT from your balance.`}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-foreground">
                          {language === "pt" ? "Moeda" : "Currency"}
                        </Label>
                        <Select
                          value={selectedCurrency}
                          onValueChange={(value) =>
                            handleCurrencyChange(value as CryptoCurrency)
                          }
                        >
                          <SelectTrigger className="bg-muted/50 border-border text-foreground focus:ring-primary rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CRYPTO_CURRENCIES.map((currency) => (
                              <SelectItem key={currency} value={currency}>
                                {currency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="crypto-withdraw-amount" className="text-foreground">
                          {language === "pt"
                            ? `Valor a sacar (${selectedCurrency})`
                            : `Amount to withdraw (${selectedCurrency})`}
                        </Label>
                        <Input
                          id="crypto-withdraw-amount"
                          type="number"
                          placeholder="0.00"
                          value={usdtAmount}
                          onChange={(e) => setUsdtAmount(e.target.value)}
                          min="0"
                          step="0.01"
                          max={
                            maxCryptoWithdrawGross > 0
                              ? maxCryptoWithdrawGross
                              : undefined
                          }
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
                          onValueChange={(value) =>
                            setSelectedNetwork(value as CryptoNetwork)
                          }
                        >
                          <SelectTrigger className="bg-muted/50 border-border text-foreground focus:ring-primary rounded-xl">
                            <SelectValue placeholder={t("selectNetwork")} />
                          </SelectTrigger>
                          <SelectContent>
                            {getCryptoNetworks(selectedCurrency).map(
                              (network) => (
                                <SelectItem key={network} value={network}>
                                  {CRYPTO_NETWORK_LABELS[network]}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-4 sm:p-6 bg-muted/30 rounded-xl border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            {t("networkFee")}
                          </span>
                          <span className="text-sm font-medium text-destructive">
                            -
                            {formatCurrency(getNetworkFee(), selectedCurrency, {
                              maxDecimals: 4,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="text-sm font-medium text-foreground">
                            {t("netTotal")}
                          </span>
                          <span className="text-lg sm:text-xl font-bold text-primary">
                            {formatCurrency(
                              calculateCryptoNetAmount() || 0,
                              selectedCurrency,
                              { maxDecimals: 4 }
                            )}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={handleCryptoWithdrawal}
                        disabled={
                          withdrawalsDisabled ||
                          processing ||
                          walletData === null ||
                          !usdtAmount ||
                          !walletAddress ||
                          parseFloat(usdtAmount) <= 0 ||
                          parseFloat(usdtAmount) > maxCryptoWithdrawGross + 1e-8
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
                          language === "pt"
                            ? `Enviar ${selectedCurrency}`
                            : `Send ${selectedCurrency}`
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Wallet className="h-5 w-5 shrink-0 text-primary" />
                          <span className="text-sm font-medium text-muted-foreground">
                            {language === "pt"
                              ? "Saldo disponível para PIX"
                              : "Available balance for PIX"}
                          </span>
                        </div>
                        <p className="shrink-0 text-xl font-bold tabular-nums text-primary sm:text-3xl">
                          {!walletData ? (
                            <span
                              className="inline-block h-8 w-24 rounded-lg bg-muted animate-pulse sm:h-9 sm:w-32"
                              aria-busy="true"
                              aria-label={
                                language === "pt"
                                  ? "Carregando saldo"
                                  : "Loading balance"
                              }
                            />
                          ) : brlAvailableForPix != null ? (
                            formatBRL(brlAvailableForPix)
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>
                      {(walletData && brlAvailableForPix == null) ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          {language === "pt"
                            ? "Carregando cotação…"
                            : "Loading exchange rate…"}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="pix-amount" className="text-foreground">
                          {language === "pt"
                            ? "Valor a sacar"
                            : "Amount to withdraw"}
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
                          walletData === null ||
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

          {/* Withdrawal history — right column on desktop */}
          <div className="min-w-0 lg:sticky lg:top-4 lg:z-0 lg:max-h-[calc(100dvh-5rem)] lg:self-start lg:overflow-y-auto">
        <Card className="mt-6 rounded-xl border-border bg-card shadow-sm sm:mt-8 lg:mt-0 sm:rounded-2xl">
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
            {historyLoading ? (
              <div
                className="space-y-3 py-2"
                role="status"
                aria-busy
                aria-label={language === "pt" ? "Carregando histórico" : "Loading history"}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 w-full rounded-lg bg-muted/80 animate-pulse"
                  />
                ))}
              </div>
            ) : withdrawalHistory.length > 0 ? (
              <>
                <div className="space-y-3 lg:hidden">
                  {withdrawalHistory.map((withdrawal) => (
                    <button
                      key={withdrawal.id}
                      type="button"
                      className="w-full rounded-xl border border-border bg-muted/20 p-3 text-left transition-colors hover:bg-muted/40 active:bg-muted/50"
                      onClick={() => router.push(`/transaction/${withdrawal.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          {formatWithdrawalDate(withdrawal.createdAt)}
                        </p>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {formatWithdrawalAmount(withdrawal)}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-primary/20 text-primary border-primary/30"
                        >
                          {withdrawal.type === "PIX"
                            ? "PIX"
                            : withdrawal.currency || withdrawal.type}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(withdrawal.status)}
                          {getStatusBadge(withdrawal.status)}
                        </div>
                      </div>
                      {(withdrawal.protocol || withdrawal.hash) && (
                        <div className="mt-2.5 min-w-0">
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {t("hashProtocol")}
                          </p>
                          {renderWithdrawalProtocol(withdrawal)}
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="hidden overflow-x-auto lg:block lg:overflow-x-visible">
                  <table className="w-full min-w-0 table-fixed text-sm">
                    <colgroup>
                      <col className="w-[22%]" />
                      <col className="w-[12%]" />
                      <col className="w-[18%]" />
                      <col className="w-[20%]" />
                      <col className="min-w-0 w-[28%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2.5 px-2 lg:py-3 lg:px-3">
                          {t("date")}
                        </th>
                        <th className="text-left py-2.5 px-2 lg:py-3 lg:px-3">
                          {t("type")}
                        </th>
                        <th className="text-left py-2.5 px-2 lg:py-3 lg:px-3">
                          {t("value")}
                        </th>
                        <th className="text-left py-2.5 px-2 lg:py-3 lg:px-3">
                          {t("status")}
                        </th>
                        <th className="min-w-0 text-left py-2.5 px-2 lg:py-3 lg:px-3">
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
                          <td className="py-2.5 px-2 align-middle lg:py-3 lg:px-3">
                            {formatWithdrawalDate(withdrawal.createdAt)}
                          </td>
                          <td className="py-2.5 px-2 align-middle lg:py-3 lg:px-3">
                            <Badge
                              variant="secondary"
                              className="bg-primary/20 text-primary border-primary/30"
                            >
                              {withdrawal.type === "PIX"
                                ? "PIX"
                                : withdrawal.currency || withdrawal.type}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-2 align-middle font-medium text-foreground lg:py-3 lg:px-3">
                            {formatWithdrawalAmount(withdrawal)}
                          </td>
                          <td className="py-2.5 px-2 align-middle lg:py-3 lg:px-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              {getStatusIcon(withdrawal.status)}
                              {getStatusBadge(withdrawal.status)}
                            </div>
                          </td>
                          <td className="min-w-0 py-2.5 px-2 align-middle lg:py-3 lg:px-3">
                            {renderWithdrawalProtocol(withdrawal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t("noWithdrawalHistory")}
              </p>
            )}
          </CardContent>
        </Card>
          </div>
        </div>
      </div>

      {/* Success — digital receipt (same style as trade / deposits) */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent
          hideClose
          className="z-[100] left-1/2 top-[max(0.5rem,env(safe-area-inset-top))] max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-0.5rem))] w-[calc(100vw-1.5rem)] max-w-full sm:max-w-2xl -translate-x-1/2 translate-y-0 overflow-y-auto overscroll-y-contain border-none bg-transparent p-0 pb-[env(safe-area-inset-bottom,0px)] shadow-none outline-none ring-0 sm:top-1/2 sm:max-h-[min(98dvh,calc(100dvh-0.75rem))] sm:-translate-y-1/2 sm:w-full"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {language === "pt"
                ? "Comprovante de saque"
                : "Withdrawal receipt"}
            </DialogTitle>
          </DialogHeader>

          {successDetails ? (
            <DigitalReceipt
              language={language}
              onClose={() => setShowSuccessModal(false)}
              headerTone={withdrawReceiptHeaderTone(successDetails.status)}
              title={(() => {
                const st = successDetails.status.toUpperCase();
                if (st === "COMPLETED")
                  return language === "pt"
                    ? "Saque concluído!"
                    : "Withdrawal completed!";
                if (st === "REJECTED" || st === "FAILED")
                  return language === "pt"
                    ? "Saque não aprovado"
                    : "Withdrawal not approved";
                return language === "pt"
                  ? "Solicitação registrada"
                  : "Request submitted";
              })()}
              headerSubtitle={successMessage || null}
              amountSectionLabel={
                language === "pt" ? "Valor solicitado" : "Requested amount"
              }
              amountNumeric={
                successDetails.type === "PIX"
                  ? formatCurrency(successDetails.amount, "BRL", {
                      minDecimals: 2,
                      maxDecimals: 2,
                      showCurrency: false,
                    })
                  : formatCurrency(
                      successDetails.amount,
                      successDetails.currency || successDetails.type,
                      { maxDecimals: 4, showCurrency: false }
                    )
              }
              amountCurrency={
                successDetails.type === "PIX"
                  ? "BRL"
                  : successDetails.currency || successDetails.type
              }
              footnote={
                successDetails.type === "PIX"
                  ? `${language === "pt" ? "Valor líquido (após taxa)" : "Net amount (after fee)"}: ${formatBRL(
                      Number(
                        successDetails.netAmount ?? successDetails.amount
                      )
                    )}`
                  : `${language === "pt" ? "Líquido (após taxa de rede)" : "Net (after network fee)"}: ${formatCurrency(
                      Number(
                        successDetails.netAmount ?? successDetails.amount
                      ),
                      successDetails.currency || successDetails.type,
                      { maxDecimals: 4, showCurrency: true }
                    )}`
              }
              statusFieldLabel={
                language === "pt" ? "Status" : "Status"
              }
              statusDisplay={getReceiptStatusLabel(successDetails.status)}
              statusBadgeTone={withdrawReceiptBadgeTone(
                successDetails.status
              )}
              dateLabel={
                language === "pt" ? "Data da solicitação" : "Requested at"
              }
              dateFormatted={new Date(
                successDetails.createdAt
              ).toLocaleString(
                language === "pt" ? "pt-BR" : "en-US",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}
              transactionId={newTransactionId ?? successDetails.id}
              detailsSlot={
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                    <div className="min-w-0 rounded-xl border border-border bg-muted/30 p-4">
                      <p className="text-sm text-muted-foreground sm:text-base">
                        {language === "pt" ? "Método" : "Method"}
                      </p>
                      <p className="mt-1 text-base font-semibold leading-snug text-foreground sm:text-lg">
                        {successDetails.type === "PIX"
                          ? "PIX"
                          : `${successDetails.network ?? "—"} · ${
                              successDetails.currency || successDetails.type
                            }`}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-border bg-muted/30 p-4">
                      <p className="text-sm text-muted-foreground sm:text-base">
                        {successDetails.type === "PIX"
                          ? language === "pt"
                            ? "Chave PIX"
                            : "PIX key"
                          : language === "pt"
                          ? "Carteira destino"
                          : "Destination wallet"}
                      </p>
                      <p
                        className="mt-1 break-all font-mono text-sm font-semibold leading-snug text-foreground sm:text-base"
                        title={
                          successDetails.type === "PIX"
                            ? maskPixKey(successDetails.pixKey)
                            : successDetails.walletAddress || ""
                        }
                      >
                        {successDetails.type === "PIX"
                          ? maskPixKey(successDetails.pixKey)
                          : successDetails.walletAddress || "—"}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-border bg-muted/30 p-4 sm:col-span-2">
                      <p className="text-sm text-muted-foreground sm:text-base">
                        {successDetails.type === "PIX"
                          ? language === "pt"
                            ? "Protocolo"
                            : "Protocol"
                          : language === "pt"
                          ? "Hash / ID"
                          : "Hash / ID"}
                      </p>
                      <p
                        className="mt-1 break-all font-mono text-sm font-semibold leading-snug text-foreground sm:text-base"
                        title={
                          successDetails.protocol ||
                          successDetails.transactionHash ||
                          successDetails.id
                        }
                      >
                        {successDetails.protocol ||
                          successDetails.transactionHash ||
                          successDetails.id}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between text-base sm:text-lg">
                      <span className="text-muted-foreground">
                        {language === "pt" ? "Taxa" : "Fee"}
                      </span>
                      <span className="font-semibold text-foreground">
                        {successDetails.type === "PIX"
                          ? formatBRL(Number(successDetails.fee || 0))
                          : formatCurrency(
                              Number(successDetails.fee || 0),
                              successDetails.currency || successDetails.type,
                              { maxDecimals: 4 }
                            )}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm leading-relaxed text-warning sm:p-5 sm:text-base">
                    {successDetails.type === "PIX"
                      ? language === "pt"
                        ? "Seu saque PIX foi registrado e será processado manualmente. Prazo estimado: até 24 horas úteis."
                        : "Your PIX withdrawal was registered and will be processed manually. Estimated time: up to 24 business hours."
                      : language === "pt"
                      ? `Seu saque ${
                          successDetails.currency || successDetails.type
                        } foi enviado para processamento. A confirmação pode depender da rede.`
                      : `Your ${
                          successDetails.currency || successDetails.type
                        } withdrawal was sent for processing. Confirmation depends on the network.`}
                  </div>
                </div>
              }
              secondaryAction={
                newTransactionId
                  ? {
                      label:
                        language === "pt" ? "Ver detalhes" : "View details",
                      onClick: () =>
                        router.push(`/transaction/${newTransactionId}`),
                    }
                  : undefined
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
