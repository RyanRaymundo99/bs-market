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
  Copy,
  QrCode,
  ArrowDown,
} from "lucide-react";
import NavbarNew from "@/components/ui/navbar-new";
import { useLanguage } from "@/contexts/LanguageContext";
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

interface DepositHistory {
  id: string;
  type: "USDT" | "PIX";
  amount: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  createdAt: string;
  hash?: string;
  walletAddress?: string;
  network?: string;
  confirmations?: number;
  requiredConfirmations?: number;
}

export default function DepositPage() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [depositHistory, setDepositHistory] = useState<DepositHistory[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Deposit Type
  const [depositType, setDepositType] = useState<"USDT" | "PIX">("USDT");
  
  // USDT Deposit States
  const [selectedNetwork, setSelectedNetwork] = useState("TRC20");
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [copied, setCopied] = useState(false);
  const [minDepositAmount, setMinDepositAmount] = useState(10); // Minimum deposit in USDT

  const { toast } = useToast();
  const { t, language } = useLanguage();

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      localStorage.removeItem("auth-session");
      localStorage.removeItem("user");
      sessionStorage.clear();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.removeItem("auth-session");
      localStorage.removeItem("user");
      sessionStorage.clear();
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  // Check user approval status on mount
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const response = await fetch("/api/user/status");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            if (data.user.approvalStatus === "REJECTED") {
              try {
                await fetch("/api/auth/logout", {
                  method: "POST",
                  credentials: "include",
                });
                localStorage.removeItem("auth-session");
                localStorage.removeItem("user");
                sessionStorage.clear();
                const message =
                  language === "pt"
                    ? "Sua conta foi rejeitada. Entre em contato com o suporte."
                    : "Your account has been rejected. Please contact support.";
                sessionStorage.setItem("rejectionMessage", message);
                window.location.href = "/";
              } catch (error) {
                console.error("Error during logout:", error);
                localStorage.removeItem("auth-session");
                localStorage.removeItem("user");
                sessionStorage.clear();
                window.location.href = "/";
              }
              return;
            }

            if (data.user.approvalStatus === "PENDING") {
              toast({
                title: language === "pt" ? "Conta Pendente" : "Account Pending",
                description:
                  language === "pt"
                    ? "Sua conta está pendente de aprovação. Complete seu cadastro no perfil antes de depositar."
                    : "Your account is pending approval. Complete your profile before depositing.",
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

  // Fetch deposit address
  const fetchDepositAddress = async () => {
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

  // Fetch deposit history
  const fetchDepositHistory = async () => {
    try {
      const response = await fetch("/api/deposits");
      if (response.ok) {
        const data = await response.json();
        setDepositHistory(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching deposit history:", error);
    }
  };

  // Copy address to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: language === "pt" ? "Copiado!" : "Copied!",
        description:
          language === "pt"
            ? "Endereço copiado para a área de transferência"
            : "Address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            {language === "pt" ? "Pendente" : "Pending"}
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {language === "pt" ? "Confirmado" : "Confirmed"}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            {language === "pt" ? "Rejeitado" : "Rejected"}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "CONFIRMED":
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
      await Promise.all([fetchWalletData(), fetchDepositHistory()]);
      setLoading(false);
    };
    loadData();
  }, [fetchWalletData]);

  // Fetch address when network changes
  useEffect(() => {
    if (depositType === "USDT") {
      fetchDepositAddress();
    }
  }, [selectedNetwork, depositType]);

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
                  ? "Carregando página de depósito..."
                  : "Loading deposit page..."}
              </p>
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
            {language === "pt" ? "Depositar" : "Deposit"}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {language === "pt"
              ? "Escolha o método de depósito"
              : "Choose deposit method"}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Main Deposit Form */}
          <Card className="rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
            <CardHeader>
              {/* Deposit Type Tabs */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={depositType === "USDT" ? "default" : "outline"}
                  onClick={() => setDepositType("USDT")}
                  className={`flex-1 ${
                    depositType === "USDT"
                      ? "bg-brand-500 hover:bg-brand-600 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <Coins className="h-4 w-4 mr-2" />
                  USDT
                </Button>
                <Button
                  variant={depositType === "PIX" ? "default" : "outline"}
                  onClick={() => setDepositType("PIX")}
                  className={`flex-1 ${
                    depositType === "PIX"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  PIX (BRL)
                </Button>
              </div>
              <CardTitle className="flex items-center gap-2 text-white">
                {depositType === "USDT" ? (
                  <>
                    <Coins className="h-5 w-5" />
                    {language === "pt" ? "Depositar USDT" : "Deposit USDT"}
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5 text-green-500" />
                    {language === "pt" ? "Depositar via PIX" : "Deposit via PIX"}
                  </>
                )}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {depositType === "USDT"
                  ? language === "pt"
                    ? "Envie USDT para o endereço abaixo"
                    : "Send USDT to the address below"
                  : language === "pt"
                  ? "Compre USDT com reais via PIX"
                  : "Buy USDT with BRL via PIX"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {depositType === "USDT" ? (
                <>
                  {/* USDT Balance */}
                  <div className="p-4 sm:p-6 bg-gradient-to-br from-brand-500/20 to-blue-500/20 rounded-xl border border-brand-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="h-5 w-5 text-brand-400" />
                      <span className="text-sm font-medium text-gray-300">
                        {language === "pt" ? "Saldo Disponível" : "Available Balance"}
                      </span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-brand-400">
                      {usdtBalance && typeof usdtBalance.amount === "number"
                        ? formatUSDT(usdtBalance.amount)
                        : "0 USDT"}
                    </p>
                  </div>

                  {/* Network Selection */}
                  <div>
                    <Label htmlFor="network" className="text-gray-300">
                      {language === "pt" ? "Rede" : "Network"}
                    </Label>
                    <Select
                      value={selectedNetwork}
                      onValueChange={setSelectedNetwork}
                    >
                      <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl">
                        <SelectValue placeholder={language === "pt" ? "Selecione a rede" : "Select network"} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem
                          value="TRC20"
                          className="text-white hover:bg-gray-700"
                        >
                          {language === "pt"
                            ? "TRC20 (Tron) - Taxa menor"
                            : "TRC20 (Tron) - Lower fee"}
                        </SelectItem>
                        <SelectItem
                          value="ERC20"
                          className="text-white hover:bg-gray-700"
                        >
                          {language === "pt"
                            ? "ERC20 (Ethereum) - Taxa maior"
                            : "ERC20 (Ethereum) - Higher fee"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Deposit Address */}
                  {loadingAddress ? (
                    <div className="p-6 bg-gray-800/30 rounded-xl border border-gray-700/50 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-4"></div>
                      <p className="text-gray-400">
                        {language === "pt"
                          ? "Gerando endereço de depósito..."
                          : "Generating deposit address..."}
                      </p>
                    </div>
                  ) : depositAddress ? (
                    <div className="p-4 sm:p-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
                      <Label className="text-gray-300 mb-3 block">
                        {language === "pt"
                          ? "Endereço de Depósito"
                          : "Deposit Address"}
                      </Label>
                      <div className="flex items-center gap-2 mb-4">
                        <Input
                          value={depositAddress}
                          readOnly
                          className="bg-gray-900 border-gray-700 text-white font-mono text-sm"
                        />
                        <Button
                          onClick={() => copyToClipboard(depositAddress)}
                          variant="outline"
                          size="icon"
                          className="border-gray-700 text-white hover:bg-gray-700"
                        >
                          {copied ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="bg-gray-900 p-4 rounded-lg flex items-center justify-center">
                        <QrCode className="h-32 w-32 text-brand-400" />
                      </div>
                      <p className="text-xs text-gray-500 mt-4 text-center">
                        {language === "pt"
                          ? `Envie apenas ${selectedNetwork} USDT para este endereço. Depósitos de outras moedas serão perdidos.`
                          : `Send only ${selectedNetwork} USDT to this address. Deposits of other currencies will be lost.`}
                      </p>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        {language === "pt"
                          ? `Depósito mínimo: ${minDepositAmount} USDT`
                          : `Minimum deposit: ${minDepositAmount} USDT`}
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 bg-gray-800/30 rounded-xl border border-gray-700/50 text-center">
                      <Button
                        onClick={fetchDepositAddress}
                        variant="outline"
                        className="border-brand-500 text-brand-400 hover:bg-brand-900"
                      >
                        {language === "pt"
                          ? "Gerar Endereço de Depósito"
                          : "Generate Deposit Address"}
                      </Button>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                    <h3 className="text-sm font-semibold text-blue-300 mb-2">
                      {language === "pt" ? "Instruções:" : "Instructions:"}
                    </h3>
                    <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
                      <li>
                        {language === "pt"
                          ? "Copie o endereço acima ou escaneie o QR code"
                          : "Copy the address above or scan the QR code"}
                      </li>
                      <li>
                        {language === "pt"
                          ? "Envie USDT para este endereço usando sua carteira"
                          : "Send USDT to this address using your wallet"}
                      </li>
                      <li>
                        {language === "pt"
                          ? "Aguarde a confirmação na blockchain (geralmente 1-5 minutos)"
                          : "Wait for blockchain confirmation (usually 1-5 minutes)"}
                      </li>
                      <li>
                        {language === "pt"
                          ? "Seu saldo será creditado automaticamente após confirmação"
                          : "Your balance will be credited automatically after confirmation"}
                      </li>
                    </ol>
                  </div>
                </>
              ) : (
                <>
                  {/* PIX Deposit - Redirect to trade page */}
                  <div className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30 text-center">
                    <Wallet className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {language === "pt"
                        ? "Depositar via PIX"
                        : "Deposit via PIX"}
                    </h3>
                    <p className="text-gray-300 mb-4">
                      {language === "pt"
                        ? "Compre USDT com reais usando PIX"
                        : "Buy USDT with BRL using PIX"}
                    </p>
                    <Button
                      onClick={() => (window.location.href = "/trade")}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {language === "pt" ? "Ir para Comprar USDT" : "Go to Buy USDT"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Deposit History */}
        <Card className="mt-6 sm:mt-8 rounded-xl sm:rounded-2xl border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <History className="h-5 w-5" />
              {language === "pt" ? "Histórico de Depósitos" : "Deposit History"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {language === "pt"
                ? "Histórico completo de depósitos realizados"
                : "Complete history of deposits made"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {depositHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">
                        {language === "pt" ? "Data" : "Date"}
                      </th>
                      <th className="text-left py-3 px-4">
                        {language === "pt" ? "Tipo" : "Type"}
                      </th>
                      <th className="text-left py-3 px-4">
                        {language === "pt" ? "Valor" : "Value"}
                      </th>
                      <th className="text-left py-3 px-4">
                        {language === "pt" ? "Status" : "Status"}
                      </th>
                      <th className="text-left py-3 px-4">
                        {language === "pt" ? "Hash/Protocolo" : "Hash/Protocol"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {depositHistory.map((deposit) => (
                      <tr
                        key={deposit.id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-3 px-4">
                          {new Date(deposit.createdAt).toLocaleDateString(
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
                              deposit.type === "PIX"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-brand-500/20 text-brand-400 border-brand-500/30"
                            }
                          >
                            {deposit.type === "PIX" ? "PIX" : "USDT"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
                          {deposit.type === "PIX"
                            ? formatBRL(deposit.amount)
                            : formatUSDT(deposit.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(deposit.status)}
                            {getStatusBadge(deposit.status)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {deposit.hash ? (
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
                                {deposit.hash.slice(0, 8)}...
                              </code>
                              {deposit.confirmations !== undefined && (
                                <span className="text-xs text-gray-500">
                                  {deposit.confirmations}/
                                  {deposit.requiredConfirmations || 6}
                                </span>
                              )}
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
                {language === "pt"
                  ? "Nenhum depósito encontrado"
                  : "No deposits found"}
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
              {language === "pt" ? "Depósito Processado" : "Deposit Processed"}
            </DialogTitle>
            <DialogDescription>{successMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowSuccessModal(false)}>
              {language === "pt" ? "Fechar" : "Close"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
