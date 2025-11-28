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
  ArrowLeft,
  TrendingDown,
  Wallet,
  Coins,
  History,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import NavbarNew from "@/components/ui/navbar-new";
import Breadcrumb from "@/components/ui/breadcrumb";

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
  type: "PIX" | "USDT";
  amount: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";
  createdAt: string;
  hash?: string; // Para USDT
  protocol?: string; // Para PIX
  pixKey?: string; // Para PIX
  walletAddress?: string; // Para USDT
  network?: string; // Para USDT
}

type WithdrawalType = "PIX" | "USDT";

export default function WithdrawPage() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [withdrawalType, setWithdrawalType] = useState<WithdrawalType>("PIX");
  const [processing, setProcessing] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<
    WithdrawalHistory[]
  >([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // PIX Form States
  const [pixAmount, setPixAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixPassword, setPixPassword] = useState("");

  // USDT Form States
  const [usdtAmount, setUsdtAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("TRC20");

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

  // Handle PIX withdrawal
  const handlePIXWithdrawal = async () => {
    if (!pixAmount || parseFloat(pixAmount) <= 0) {
      toast({
        title: "Valor Inválido",
        description: "Por favor, insira um valor válido",
        variant: "destructive",
      });
      return;
    }

    if (!pixKey.trim()) {
      toast({
        title: "Chave PIX Obrigatória",
        description: "Por favor, insira sua chave PIX",
        variant: "destructive",
      });
      return;
    }

    if (!pixPassword.trim()) {
      toast({
        title: "Senha Obrigatória",
        description: "Por favor, insira sua senha de confirmação",
        variant: "destructive",
      });
      return;
    }

    const brlBalance = walletData?.balances.find((b) => b.currency === "BRL");
    if (!brlBalance || parseFloat(pixAmount) > brlBalance.amount) {
      toast({
        title: "Saldo Insuficiente",
        description: "Você não possui saldo suficiente em BRL",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
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
        setSuccessMessage(
          "Saque solicitado com sucesso. O valor será transferido em até 1 hora útil."
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
        title: "Erro no Saque",
        description:
          error instanceof Error
            ? error.message
            : "Falha ao processar saque PIX",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Handle USDT withdrawal
  const handleUSDTWithdrawal = async () => {
    if (!usdtAmount || parseFloat(usdtAmount) <= 0) {
      toast({
        title: "Valor Inválido",
        description: "Por favor, insira um valor válido em USDT",
        variant: "destructive",
      });
      return;
    }

    if (!walletAddress.trim()) {
      toast({
        title: "Endereço Obrigatório",
        description: "Por favor, insira o endereço da carteira",
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
        setSuccessMessage(
          "Transação enviada para processamento. Aguarde a confirmação na blockchain."
        );
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
        title: "Erro no Saque",
        description:
          error instanceof Error
            ? error.message
            : "Falha ao processar saque USDT",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Calculate PIX net amount (3% fee)
  const calculatePIXNetAmount = () => {
    if (!pixAmount || parseFloat(pixAmount) <= 0) return 0;
    const amount = parseFloat(pixAmount);
    if (isNaN(amount)) return 0;
    const fee = amount * 0.03; // 3% fee
    const netAmount = amount - fee;
    return isNaN(netAmount) ? 0 : netAmount;
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
            Pendente
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Processando
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Concluído
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
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
              <p>Carregando página de saque...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const usdtBalance = walletData?.balances.find((b) => b.currency === "USDT");
  const brlBalance = walletData?.balances.find((b) => b.currency === "BRL");

  return (
    <div className="min-h-screen bg-background">
      <NavbarNew isLoggingOut={false} handleLogout={() => {}} />
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Withdraw" },
          ]}
        />

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/wallet">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Wallet
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              Withdraw Funds — Saque de Fundos
            </h1>
            <p className="text-muted-foreground">
              Escolha o método de saque e retire seus fundos
            </p>
          </div>
        </div>

        {/* Withdrawal Type Selection */}
        <div className="flex gap-4 mb-8">
          <Button
            variant={withdrawalType === "PIX" ? "default" : "outline"}
            onClick={() => setWithdrawalType("PIX")}
            className="flex items-center gap-2 px-6 py-3"
          >
            <CreditCard className="h-5 w-5" />
            💵 Saque via PIX (BRL)
          </Button>
          <Button
            variant={withdrawalType === "USDT" ? "default" : "outline"}
            onClick={() => setWithdrawalType("USDT")}
            className="flex items-center gap-2 px-6 py-3"
          >
            <Coins className="h-5 w-5" />
            🪙 Saque via USDT
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Withdrawal Form */}
          <div className="lg:col-span-2">
            {withdrawalType === "PIX" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CreditCard className="h-5 w-5" />
                    Saque via PIX (BRL)
                  </CardTitle>
                  <CardDescription>
                    Transfira seus fundos em BRL para sua conta via PIX
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* BRL Balance */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Saldo disponível:
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      R${" "}
                      {brlBalance && typeof brlBalance.amount === "number"
                        ? brlBalance.amount.toFixed(2)
                        : "0.00"}
                    </p>
                  </div>

                  {/* PIX Form */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="pix-amount">Valor a sacar (BRL)</Label>
                      <Input
                        id="pix-amount"
                        type="number"
                        placeholder="0.00"
                        value={pixAmount}
                        onChange={(e) => setPixAmount(e.target.value)}
                        min="0"
                        step="0.01"
                        max={brlBalance ? brlBalance.amount : undefined}
                      />
                    </div>

                    <div>
                      <Label htmlFor="pix-key">Chave PIX</Label>
                      <Input
                        id="pix-key"
                        type="text"
                        placeholder="E-mail, CPF ou telefone"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="pix-password">Senha de confirmação</Label>
                      <Input
                        id="pix-password"
                        type="password"
                        placeholder="Digite sua senha"
                        value={pixPassword}
                        onChange={(e) => setPixPassword(e.target.value)}
                      />
                    </div>

                    {/* Fee Calculation */}
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          Taxa (3%):
                        </span>
                        <span className="text-sm font-medium text-red-600">
                          -R${" "}
                          {pixAmount
                            ? (() => {
                                const amount = parseFloat(pixAmount);
                                return isNaN(amount)
                                  ? "0.00"
                                  : (amount * 0.03).toFixed(2);
                              })()
                            : "0.00"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Você receberá:
                        </span>
                        <span className="text-lg font-bold text-green-600">
                          R$ {(calculatePIXNetAmount() || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={handlePIXWithdrawal}
                      disabled={
                        processing ||
                        !pixAmount ||
                        !pixKey ||
                        !pixPassword ||
                        parseFloat(pixAmount) <= 0
                      }
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {processing
                        ? "Processando..."
                        : "Confirmar Saque via PIX"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <Coins className="h-5 w-5" />
                    Saque via USDT
                  </CardTitle>
                  <CardDescription>
                    Envie USDT para sua carteira externa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* USDT Balance */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Saldo disponível:
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">
                      {usdtBalance && typeof usdtBalance.amount === "number"
                        ? usdtBalance.amount.toFixed(2)
                        : "0.00"}{" "}
                      USDT
                    </p>
                  </div>

                  {/* USDT Form */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="usdt-amount">Valor a sacar (USDT)</Label>
                      <Input
                        id="usdt-amount"
                        type="number"
                        placeholder="0.00"
                        value={usdtAmount}
                        onChange={(e) => setUsdtAmount(e.target.value)}
                        min="0"
                        step="0.01"
                        max={usdtBalance ? usdtBalance.amount : undefined}
                      />
                    </div>

                    <div>
                      <Label htmlFor="wallet-address">
                        Endereço da carteira
                      </Label>
                      <Input
                        id="wallet-address"
                        type="text"
                        placeholder="Digite o endereço da carteira"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="network">Rede</Label>
                      <Select
                        value={selectedNetwork}
                        onValueChange={setSelectedNetwork}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a rede" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRC20">
                            TRC20 (Tron) - Taxa menor
                          </SelectItem>
                          <SelectItem value="ERC20">
                            ERC20 (Ethereum) - Taxa maior
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Fee Calculation */}
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          Taxa de rede:
                        </span>
                        <span className="text-sm font-medium text-red-600">
                          -1 USDT
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Total líquido:
                        </span>
                        <span className="text-lg font-bold text-blue-600">
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
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {processing ? "Processando..." : "Enviar USDT"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Portfolio Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Portfolio Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Total Portfolio Value
                  </p>
                  <p className="text-2xl font-bold">
                    $
                    {walletData &&
                    typeof walletData.totalPortfolioValue === "number"
                      ? walletData.totalPortfolioValue.toFixed(2)
                      : "0.00"}{" "}
                    USDT
                  </p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-lg font-semibold">
                    {walletData
                      ? new Date(walletData.lastUpdated).toLocaleTimeString()
                      : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/wallet">
                  <Button variant="outline" className="w-full justify-start">
                    <Coins className="h-4 w-4 mr-2" />
                    View Wallet
                  </Button>
                </Link>
                <Link href="/trade">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Trade Crypto
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Withdrawal History */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Saques
            </CardTitle>
            <CardDescription>
              Histórico completo de saques realizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawalHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Data</th>
                      <th className="text-left py-3 px-4">Tipo</th>
                      <th className="text-left py-3 px-4">Valor</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Hash/Protocolo</th>
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
                            "pt-BR",
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
                            variant={
                              withdrawal.type === "PIX"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {withdrawal.type === "PIX" ? "PIX" : "USDT"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {withdrawal.type === "PIX"
                            ? `R$ ${
                                typeof withdrawal.amount === "number"
                                  ? withdrawal.amount.toFixed(2)
                                  : "0.00"
                              }`
                            : `${
                                typeof withdrawal.amount === "number"
                                  ? withdrawal.amount.toFixed(2)
                                  : "0.00"
                              } USDT`}
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
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {withdrawal.hash.slice(0, 8)}...
                              </code>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                          ) : withdrawal.protocol ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {withdrawal.protocol}
                            </code>
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
                Nenhum histórico de saque encontrado. Realize seu primeiro saque
                para ver o histórico aqui.
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
              Saque Processado
            </DialogTitle>
            <DialogDescription>{successMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowSuccessModal(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
