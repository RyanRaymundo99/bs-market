"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Coins,
  QrCode,
  Download,
  ExternalLink,
  Info,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import NavbarNew from "@/components/ui/navbar-new";
import { PageLoader, Spinner } from "@/components/ui/loading";
import { GlobalKYCBanner } from "@/components/GlobalKYCBanner";
import { useLanguage } from "@/contexts/LanguageContext";
import Image from "next/image";
import { formatUSDT, formatBRL } from "@/lib/format-currency";
import { useToast } from "@/hooks/use-toast";

interface TransactionData {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "BUY_CRYPTO" | "SELL_CRYPTO";
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  paymentMethod?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  walletAddress?: string;
  network?: string;
  pixKey?: string;
  hash?: string;
  fee?: number;
  netAmount?: number;
  protocol?: string;
  externalId?: string;
  description?: string;
  adminMessage?: string | null;
  adminActionAt?: string | null;
  adminActionBy?: string | null;
}

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      localStorage.removeItem("auth-session");
      localStorage.removeItem("user");
      sessionStorage.clear();
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  }, []);

  const fetchTransaction = useCallback(async () => {
    try {
      const res = await fetch(`/api/transaction/${id}`);
      if (res.ok) {
        const result = await res.json();
        setTransaction(result.data);
      } else {
        const err = await res.json();
        setError(err.error || "Transaction not found");
      }
    } catch {
      setError("Failed to load transaction details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTransaction();
    
    // Poll for status updates if pending
    const interval = setInterval(() => {
      if (transaction?.status === "PENDING" || transaction?.status === "PROCESSING") {
        fetchTransaction();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchTransaction, transaction?.status]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({
      title: language === "pt" ? "Copiado!" : "Copied!",
      description: `${label} ${language === "pt" ? "copiado para a área de transferência." : "copied to clipboard."}`,
    });
    setTimeout(() => setCopied(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "CONFIRMED":
        return "text-primary border-primary/20 bg-primary/10";
      case "PENDING":
      case "PROCESSING":
      case "EXECUTING":
        return "text-warning border-warning/20 bg-warning/10";
      case "FAILED":
      case "REJECTED":
      case "CANCELLED":
        return "text-destructive border-destructive/20 bg-destructive/10";
      default:
        return "text-muted-foreground border-border bg-muted/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "CONFIRMED":
        return <CheckCircle2 className="h-5 w-5" />;
      case "PENDING":
      case "PROCESSING":
      case "EXECUTING":
        return <Clock className="h-5 w-5 animate-pulse" />;
      case "FAILED":
      case "REJECTED":
      case "CANCELLED":
        return <XCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getStepStatus = (currentStep: number, targetStep: number, status: string) => {
    const isTerminal = ["COMPLETED", "CONFIRMED", "FAILED", "REJECTED", "CANCELLED"].includes(status);
    const isSuccess = ["COMPLETED", "CONFIRMED"].includes(status);
    
    if (currentStep < targetStep) return "pending"; // In the future
    if (currentStep === targetStep) {
        if (isTerminal) return isSuccess ? "completed" : "failed";
        return "active";
    }
    return "completed"; // In the past
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
        <GlobalKYCBanner />
        <div className="container mx-auto px-4 py-8">
          <PageLoader message={language === "pt" ? "Carregando detalhes da transação..." : "Loading transaction details..."} />
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-background">
        <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
        <div className="container mx-auto px-4 py-16 flex flex-col items-center">
          <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-4">
            <XCircle className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{language === "pt" ? "Erro" : "Error"}</h1>
          <p className="text-muted-foreground mb-8 text-center">{error || (language === "pt" ? "Transação não encontrada." : "Transaction not found.")}</p>
          <Button onClick={() => router.push("/dashboard")}>
            {language === "pt" ? "Voltar ao Início" : "Back to Dashboard"}
          </Button>
        </div>
      </div>
    );
  }

  const isDeposit = transaction.type === "DEPOSIT" || transaction.type === "BUY_CRYPTO";
  const isWithdrawal = transaction.type === "WITHDRAWAL";
  const isFailed = ["FAILED", "REJECTED", "CANCELLED"].includes(transaction.status);
  const isSuccess = ["COMPLETED", "CONFIRMED"].includes(transaction.status);
  const isPixWithdrawal = isWithdrawal && (transaction.paymentMethod === "PIX" || transaction.currency === "BRL" || Boolean(transaction.pixKey));
  const transactionTitle = isWithdrawal
    ? isPixWithdrawal
      ? language === "pt"
        ? "Saque via PIX"
        : "PIX Withdrawal"
      : language === "pt"
      ? "Saque de USDT"
      : "USDT Withdrawal"
    : language === "pt"
    ? "Depósito de USDT"
    : "USDT Deposit";
  const adminMessage =
    transaction.adminMessage?.trim() ||
    (isFailed
      ? language === "pt"
        ? "O saque não foi aprovado. Entre em contato com o suporte caso precise de mais detalhes."
        : "The withdrawal was not approved. Contact support if you need more details."
      : null);
  
  const statusLabel = {
      PENDING: language === "pt" ? "Pendente" : "Pending",
      PROCESSING: language === "pt" ? "Processando" : "Processing",
      EXECUTING: language === "pt" ? "Executando" : "Executing",
      COMPLETED: language === "pt" ? "Concluído" : "Completed",
      CONFIRMED: language === "pt" ? "Confirmado" : "Confirmed",
      FAILED: language === "pt" ? "Falhou" : "Failed",
      REJECTED: language === "pt" ? "Rejeitado" : "Rejected",
      CANCELLED: language === "pt" ? "Cancelado" : "Cancelled",
  }[transaction.status] || transaction.status;

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
      <GlobalKYCBanner />
      
      {/* Dynamic Background Element */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className={`absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-10 blur-[120px] transition-colors duration-1000 ${
              transaction.status === "COMPLETED" ? "bg-primary" : 
              transaction.status === "FAILED" ? "bg-destructive" : "bg-warning"
          }`} />
          <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-primary opacity-5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" />
                {language === "pt" ? "Voltar" : "Back"}
            </Button>
            <div className="flex items-center gap-2">
                <Badge variant="outline" className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full flex items-center gap-1.5 ${getStatusColor(transaction.status)}`}>
                    {getStatusIcon(transaction.status)}
                    {statusLabel}
                </Badge>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Status & Details */}
            <div className="lg:col-span-2 space-y-6">
                {/* Main Transaction Card */}
                <Card className="border border-border/50 bg-card/50 backdrop-blur-md shadow-2xl relative overflow-hidden rounded-3xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-20" />
                    
                    <CardHeader className="text-center pb-2">
                        <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-inner ${
                            isFailed
                                ? "bg-destructive/10 text-destructive"
                                : isSuccess
                                ? "bg-primary/10 text-primary"
                                : "bg-warning/10 text-warning"
                        }`}>
                            {isFailed ? (
                                <XCircle className="h-8 w-8" />
                            ) : isWithdrawal ? (
                                <ArrowDownRight className="h-8 w-8" />
                            ) : (
                                <ArrowUpRight className="h-8 w-8" />
                            )}
                        </div>
                        <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                            {transactionTitle}
                        </CardTitle>
                        <CardDescription className="text-lg">
                            {transaction.currency === "BRL" ? formatBRL(transaction.amount) : formatUSDT(transaction.amount)}
                        </CardDescription>
                        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                            {isFailed
                                ? language === "pt"
                                    ? "A solicitação foi analisada pela equipe e não pôde ser concluída."
                                    : "The request was reviewed by our team and could not be completed."
                                : isSuccess
                                ? language === "pt"
                                    ? "Transação concluída com sucesso."
                                    : "Transaction completed successfully."
                                : language === "pt"
                                ? "Sua solicitação está em análise pela equipe financeira."
                                : "Your request is being reviewed by the finance team."}
                        </p>
                    </CardHeader>

                    <CardContent className="space-y-8 pt-6">
                        {isFailed && adminMessage && (
                            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 rounded-xl bg-destructive/15 p-2 text-destructive">
                                        <MessageSquare className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-destructive">
                                            {language === "pt" ? "Mensagem do administrador" : "Admin message"}
                                        </p>
                                        <p className="text-sm leading-relaxed text-foreground">
                                            {adminMessage}
                                        </p>
                                        {transaction.adminActionAt && (
                                            <p className="text-xs text-muted-foreground">
                                                {language === "pt" ? "Atualizado em" : "Updated on"}{" "}
                                                {new Date(transaction.adminActionAt).toLocaleString(
                                                    language === "pt" ? "pt-BR" : "en-US"
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status Stepper */}
                        <div className="relative py-4">
                            <div className="absolute left-[20px] top-[4px] bottom-[4px] w-0.5 bg-border lg:left-0 lg:top-[20px] lg:bottom-auto lg:right-0 lg:w-auto lg:h-0.5" />
                            
                            <div className="flex flex-col gap-8 lg:flex-row lg:justify-between lg:gap-0 relative z-10 transition-all">
                                {/* Step 1: Requested */}
                                <div className="flex items-center gap-4 lg:flex-col lg:gap-2">
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg ring-4 ring-background">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                    <div className="lg:text-center">
                                        <p className="text-sm font-bold">{language === "pt" ? "Solicitado" : "Requested"}</p>
                                        <p className="text-[10px] text-muted-foreground">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                {/* Step 2: Processing */}
                                <div className="flex items-center gap-4 lg:flex-col lg:gap-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-4 ring-background transition-colors ${
                                        getStepStatus(2, 2, transaction.status) === "active" ? "bg-warning text-warning-foreground animate-pulse" :
                                        getStepStatus(2, 2, transaction.status) === "completed" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    }`}>
                                        {getStepStatus(2, 2, transaction.status) === "completed" ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                    </div>
                                    <div className="lg:text-center">
                                        <p className={`text-sm font-bold ${getStepStatus(2, 2, transaction.status) === "pending" ? "text-muted-foreground" : ""}`}>
                                            {language === "pt" ? "Em Processamento" : "Processing"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">{isDeposit ? (language === "pt" ? "Validando pagamento" : "Validating payment") : (language === "pt" ? "Aguardando envio" : "Awaiting dispatch")}</p>
                                    </div>
                                </div>

                                {/* Step 3: Completed */}
                                <div className="flex items-center gap-4 lg:flex-col lg:gap-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-4 ring-background transition-colors ${
                                        transaction.status === "COMPLETED" || transaction.status === "CONFIRMED" ? "bg-primary text-primary-foreground" :
                                        ["FAILED", "REJECTED", "CANCELLED"].includes(transaction.status) ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
                                    }`}>
                                        {transaction.status === "COMPLETED" || transaction.status === "CONFIRMED" ? <CheckCircle2 className="h-5 w-5" /> : 
                                         ["FAILED", "REJECTED", "CANCELLED"].includes(transaction.status) ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                                    </div>
                                    <div className="lg:text-center">
                                        <p className={`text-sm font-bold ${["COMPLETED", "CONFIRMED", "FAILED", "REJECTED", "CANCELLED"].includes(transaction.status) ? "" : "text-muted-foreground"}`}>
                                            {transaction.status === "FAILED" || transaction.status === "REJECTED" ? (language === "pt" ? "Não aprovado" : "Not approved") : (language === "pt" ? "Finalizado" : "Finalized")}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {isFailed
                                                ? language === "pt"
                                                    ? "Mensagem disponível"
                                                    : "Message available"
                                                : language === "pt"
                                                ? "Saldo atualizado"
                                                : "Balance updated"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Transaction Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/30 p-6 rounded-2xl border border-border/30">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{language === "pt" ? "ID da Transação" : "Transaction ID"}</p>
                                <div className="flex items-center gap-2 group">
                                    <code className="text-sm font-mono break-all line-clamp-1">{transaction.id}</code>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(transaction.id, "ID")}>
                                        {copied === "ID" ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{language === "pt" ? "Data e Hora" : "Date & Time"}</p>
                                <p className="text-sm font-medium">{new Date(transaction.createdAt).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{language === "pt" ? "Método" : "Method"}</p>
                                <div className="flex items-center gap-2">
                                    {transaction.paymentMethod === "PIX" ? <Wallet className="h-4 w-4 text-primary" /> : <Coins className="h-4 w-4 text-primary" />}
                                    <p className="text-sm font-medium">{transaction.paymentMethod || transaction.type}</p>
                                </div>
                            </div>
                            {transaction.fee !== undefined && (
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{language === "pt" ? "Taxa" : "Fee"}</p>
                                    <p className="text-sm font-medium">{transaction.currency === "BRL" ? formatBRL(transaction.fee) : formatUSDT(transaction.fee)}</p>
                                </div>
                            )}
                            {isWithdrawal && transaction.netAmount !== undefined && transaction.netAmount > 0 && (
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{language === "pt" ? "Valor líquido" : "Net amount"}</p>
                                    <p className="text-sm font-medium text-primary">{transaction.currency === "BRL" ? formatBRL(transaction.netAmount) : formatUSDT(transaction.netAmount)}</p>
                                </div>
                            )}
                            {isPixWithdrawal && transaction.pixKey && (
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Chave PIX</p>
                                    <div className="flex items-center gap-2 p-3 bg-card border border-border/50 rounded-xl">
                                        <code className="text-xs font-mono break-all flex-1 text-primary">{transaction.pixKey}</code>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(transaction.pixKey!, "PIX")}>
                                            {copied === "PIX" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {isPixWithdrawal && transaction.protocol && (
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{language === "pt" ? "Protocolo PIX" : "PIX Protocol"}</p>
                                    <div className="flex items-center gap-2 p-3 bg-card border border-border/50 rounded-xl">
                                        <code className="text-xs font-mono break-all flex-1 text-primary">{transaction.protocol}</code>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(transaction.protocol!, "Protocolo")}>
                                            {copied === "Protocolo" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {isWithdrawal && transaction.walletAddress && (
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{language === "pt" ? "Endereço de Destino" : "Destination Address"}</p>
                                    <div className="flex items-center gap-2 p-3 bg-card border border-border/50 rounded-xl group transition-all hover:border-primary/30">
                                        <code className="text-xs font-mono break-all flex-1 text-primary">{transaction.walletAddress}</code>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(transaction.walletAddress!, "Address")}>
                                            {copied === "Address" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    {transaction.network && (
                                        <Badge variant="outline" className="mt-2 bg-primary/5 border-primary/20 text-primary uppercase text-[10px]">
                                            Network: {transaction.network}
                                        </Badge>
                                    )}
                                </div>
                            )}
                            {!isPixWithdrawal && transaction.hash && (
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{language === "pt" ? "Hash da Transação" : "Transaction Hash"}</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs font-mono break-all line-clamp-1">{transaction.hash}</code>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(transaction.hash!, "Hash")}>
                                            {copied === "Hash" ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                                        </Button>
                                        <a href={`https://tronscan.org/#/transaction/${transaction.hash}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                                            Explorer <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                    
                    <div className="flex justify-between p-6 bg-muted/10 border-t border-border/50">
                        <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => window.print()}>
                            <Download className="h-4 w-4" />
                            {language === "pt" ? "Salvar Comprovante" : "Save Receipt"}
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => window.open(`https://wa.me/5511984284867?text=Quero suporte para a transação ${transaction.id}`, "_blank")}>
                            <HelpCircle className="h-4 w-4" />
                            {language === "pt" ? "Preciso de ajuda" : "Need help?"}
                        </Button>
                    </div>
                </Card>

                {/* Important Information Notice */}
                <Card className="border border-primary/20 bg-primary/5 rounded-3xl">
                    <CardContent className="p-6 flex gap-4">
                        <div className="hidden sm:flex h-10 w-10 shrink-0 rounded-full bg-primary/10 items-center justify-center text-primary">
                            {isFailed ? <ShieldCheck className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                        </div>
                        <div>
                            <h4 className="font-bold mb-1">
                                {isFailed
                                    ? language === "pt"
                                        ? "O que acontece agora?"
                                        : "What happens now?"
                                    : language === "pt"
                                    ? "Informações Importantes"
                                    : "Important Information"}
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {isFailed && isWithdrawal
                                    ? language === "pt"
                                        ? "Quando um saque não é aprovado, a equipe informa o motivo acima. Se houver valor debitado, ele é devolvido conforme o processo de reembolso exibido nas suas notificações e histórico."
                                        : "When a withdrawal is not approved, the team explains the reason above. If any amount was debited, it is returned according to the refund process shown in your notifications and history."
                                    : isWithdrawal ? 
                                    (language === "pt" ? 
                                        "Os saques de criptomoedas são processados manualmente para garantir a máxima segurança dos seus ativos. Este processo geralmente leva entre 15 a 30 minutos em horário comercial." : 
                                        "Cryptocurrency withdrawals are manually processed to ensure maximum security for your assets. This process typically takes 15 to 30 minutes during business hours.") :
                                    (language === "pt" ? 
                                        "Após o pagamento via PIX, nosso sistema valida automaticamente a transação na rede bancária. Assim que confirmado, o saldo em USDT será adicionado instantaneamente à sua carteira." : 
                                        "After PIX payment, our system automatically validates the transaction through the banking network. Once confirmed, the USDT balance will be instantly added to your wallet.")
                                }
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Actions / Instructions */}
            <div className="space-y-6">
                {isDeposit && transaction.status === "PENDING" && (
                    <Card className="border-border bg-card shadow-lg rounded-3xl overflow-hidden text-center sticky top-24">
                        <div className="p-6 bg-primary/10 border-b border-primary/10">
                            <h3 className="font-bold flex items-center justify-center gap-2">
                                <QrCode className="h-5 w-5 text-primary" />
                                {language === "pt" ? "Pagamento PIX" : "PIX Payment"}
                            </h3>
                        </div>
                        <CardContent className="p-8 space-y-6">
                            <div className="mx-auto w-48 h-48 bg-white p-3 rounded-2xl shadow-xl transition-transform hover:scale-105 duration-300">
                                {transaction.pixQrCodeBase64 ? (
                                    <Image
                                      src={`data:image/png;base64,${transaction.pixQrCodeBase64}`}
                                      alt="PIX QR Code"
                                      width={192}
                                      height={192}
                                      className="w-full h-full object-contain"
                                      unoptimized
                                    />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center rounded-xl">
                                        <Spinner size="lg" />
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">{language === "pt" ? "Escaneie o código acima ou copie o link abaixo:" : "Scan the code above or copy the link below:"}</p>
                                <Button className="w-full gap-2 rounded-xl h-11" variant="outline" onClick={() => copyToClipboard(transaction.pixQrCode || "", "PIX")}>
                                    {copied === "PIX" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                                    {language === "pt" ? "Copiar Código PIX" : "Copy PIX Code"}
                                </Button>
                            </div>

                            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                                <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase">{language === "pt" ? "Total a pagar" : "Total to pay"}</p>
                                <p className="text-2xl font-black text-foreground">{formatBRL(transaction.amount)}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Common Help Card */}
                <Card className="border-border bg-card rounded-3xl shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold">{language === "pt" ? "Dúvidas Frequentes" : "FAQ"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="pb-3 border-b border-border/50 last:border-0 last:pb-0">
                            <p className="font-bold mb-1">{language === "pt" ? "Quanto tempo demora?" : "How long does it take?"}</p>
                            <p className="text-muted-foreground text-xs">{isWithdrawal ? (language === "pt" ? "Normalmente de 15 a 30 minutos." : "Typically 15 to 30 minutes.") : (language === "pt" ? "Instantâneo após a confirmação do banco." : "Instant after bank confirmation.")}</p>
                        </div>
                        <div className="pb-3 border-b border-border/50 last:border-0 last:pb-0">
                            <p className="font-bold mb-1">{language === "pt" ? "E se houver um erro?" : "What if there's an error?"}</p>
                            <p className="text-muted-foreground text-xs">{language === "pt" ? "Entre em contato com o suporte imediatamente informando o ID da transação." : "Contact support immediately with the transaction ID."}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
      
      <style jsx global>{`
        @media print {
            .navbar-new, button, .GlobalKYCBanner, .header-navigation {
                display: none !important;
            }
            .container {
                max-width: 100% !important;
                padding: 0 !important;
            }
            .lg\\:col-span-2 {
                width: 100% !important;
            }
            .lg\\:grid-cols-3 {
                display: block !important;
            }
            .card {
                border: 1px solid #ccc !important;
                box-shadow: none !important;
            }
        }
      `}</style>
    </div>
  );
}
