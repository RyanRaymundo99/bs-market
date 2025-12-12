"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import NavbarNew from "@/components/ui/navbar-new";
import { useLanguage } from "@/contexts/LanguageContext";

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
  type: "USDT";
  amount: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";
  createdAt: string;
  hash?: string;
  walletAddress?: string;
  network?: string;
}


export default function WithdrawPage() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    try {
      const response = await fetch("/api/crypto/wallet");
      if (response.ok) {
        const data = await response.json();
        setWalletData(data.data);
      } else {
        throw new Error("Failed to fetch wallet data");
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
          error instanceof Error
            ? error.message
            : t("failedToProcess"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Calculate USDT net amount (1 USDT fee)
  const calculateUSDTNetAmount = () => {
    if (!usdtAmount || parseFloat(usdtAmount) <= 0) return 0;
    const amount = parseFloat(usdtAmount);
    if (isNaN(amount)) return 0;
    const netAmount = amount - 1; // 1 USDT fee
    return isNaN(netAmount) || netAmount < 0 ? 0 : netAmount;
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
              <p>{language === "pt" ? "Carregando página de saque..." : "Loading withdrawal page..."}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const usdtBalance = walletData?.balances.find((b) => b.currency === "USDT");

  return (
    <div className="min-h-screen bg-background">
      <NavbarNew isLoggingOut={false} handleLogout={() => {}} />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-500 via-purple-600 to-brand-600 bg-clip-text text-transparent mb-2">
            {t("withdrawUSDT")}
            </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
              {t("chooseWithdrawalMethod")}
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Withdrawal Form */}
          <div className="lg:col-span-2">
            <Card className="rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Coins className="h-5 w-5" />
                    {t("withdrawViaUSDT")}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {t("sendUSDTToWallet")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
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
                        ? usdtBalance.amount.toFixed(2)
                        : "0.00"}{" "}
                      USDT
                    </p>
                  </div>

                  {/* USDT Form */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="usdt-amount" className="text-gray-300">{t("amountToWithdraw")}</Label>
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
                      <Label htmlFor="wallet-address" className="text-gray-300">
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
                      <Label htmlFor="network" className="text-gray-300">{t("network")}</Label>
                      <Select
                        value={selectedNetwork}
                        onValueChange={setSelectedNetwork}
                      >
                        <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl">
                          <SelectValue placeholder={t("selectNetwork")} />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="TRC20" className="text-white hover:bg-gray-700">
                            {t("trc20Option")}
                          </SelectItem>
                          <SelectItem value="ERC20" className="text-white hover:bg-gray-700">
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
                          -1 USDT
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                        <span className="text-sm font-medium text-gray-300">
                          {t("netTotal")}
                        </span>
                        <span className="text-lg sm:text-xl font-bold text-brand-400">
                          {(calculateUSDTNetAmount() || 0).toFixed(2)} USDT
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={handleUSDTWithdrawal}
                      disabled={
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
                </CardContent>
              </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Portfolio Summary */}
            <Card className="rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Wallet className="h-5 w-5" />
                  {t("portfolioSummary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                  <p className="text-sm text-gray-400 mb-1">
                    {t("totalPortfolioValue")}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {walletData &&
                    typeof walletData.totalPortfolioValue === "number"
                      ? walletData.totalPortfolioValue.toFixed(2)
                      : "0.00"}{" "}
                    USDT
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                  <p className="text-sm text-gray-400 mb-1">{t("lastUpdated")}</p>
                  <p className="text-lg font-semibold text-gray-300">
                    {walletData
                      ? new Date(walletData.lastUpdated).toLocaleTimeString()
                      : "N/A"}
                  </p>
                </div>
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
                      <th className="text-left py-3 px-4">{t("hashProtocol")}</th>
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
                          <Badge variant="secondary" className="bg-brand-500/20 text-brand-400 border-brand-500/30">
                            USDT
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
                          {typeof withdrawal.amount === "number"
                                  ? withdrawal.amount.toFixed(2)
                            : "0.00"}{" "}
                          USDT
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(withdrawal.status)}
                            {getStatusBadge(withdrawal.status)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {withdrawal.hash ? (
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
            <Button onClick={() => setShowSuccessModal(false)}>{t("close")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
