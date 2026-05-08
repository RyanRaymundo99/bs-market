"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  Receipt,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DigitalReceiptHeaderTone = "success" | "pending" | "danger";

export type DigitalReceiptStatusBadgeTone =
  | "success"
  | "info"
  | "warning"
  | "destructive"
  | "secondary";

export interface DigitalReceiptProps {
  language: string;
  onClose: () => void;
  headerTone: DigitalReceiptHeaderTone;
  title: string;
  headerSubtitle?: string | null;
  amountSectionLabel: string;
  /** Main numeric display (already localized, e.g. "33,00") */
  amountNumeric: string;
  /** Shown in primary color next to the amount (e.g. USDT, BRL) */
  amountCurrency: string;
  /** Small line under amount (optional) */
  footnote?: string | null;
  statusFieldLabel: string;
  statusDisplay: string;
  statusBadgeTone: DigitalReceiptStatusBadgeTone;
  dateLabel: string;
  dateFormatted: string;
  transactionId: string;
  /** Extra rows, fee tables, warnings — inserted before the security callout */
  detailsSlot?: React.ReactNode;
  /** Optional “Ver detalhes” style action beside Download */
  secondaryAction?: { label: string; onClick: () => void };
  onPrint?: () => void;
  showPrint?: boolean;
}

function badgeClass(tone: DigitalReceiptStatusBadgeTone): string {
  switch (tone) {
    case "success":
      return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
    case "info":
      return "bg-blue-500/20 text-blue-500 border-blue-500/30";
    case "warning":
      return "bg-amber-500/20 text-amber-600 border-amber-500/30";
    case "destructive":
      return "bg-destructive/20 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function headerGradient(tone: DigitalReceiptHeaderTone): string {
  switch (tone) {
    case "success":
      return "bg-gradient-to-br from-emerald-500 to-emerald-700";
    case "danger":
      return "bg-gradient-to-br from-red-500 to-red-700";
    default:
      return "bg-gradient-to-br from-blue-500 to-blue-700";
  }
}

function receiptNumberFromId(id: string): string {
  const compact = id.replace(/[^a-zA-Z0-9]/g, "");
  const tail = (compact || id).slice(-8).toUpperCase();
  return `BSM-${tail}`;
}

export function DigitalReceipt({
  language,
  onClose,
  headerTone,
  title,
  headerSubtitle,
  amountSectionLabel,
  amountNumeric,
  amountCurrency,
  footnote,
  statusFieldLabel,
  statusDisplay,
  statusBadgeTone,
  dateLabel,
  dateFormatted,
  transactionId,
  detailsSlot,
  secondaryAction,
  onPrint,
  showPrint = true,
}: DigitalReceiptProps) {
  const isSuccessHeader = headerTone === "success";
  const issuedAt = dateFormatted;
  const receiptNumber = receiptNumberFromId(transactionId);

  const handlePrint = () => {
    if (onPrint) onPrint();
    else window.print();
  };

  return (
    <div className="mx-auto flex w-full max-w-full flex-col items-center duration-300 animate-in fade-in zoom-in-95 sm:max-w-xl md:max-w-2xl">
      <div
        className={cn(
          "relative flex min-h-[5.75rem] w-full flex-col items-center justify-center overflow-hidden rounded-t-2xl py-4 sm:min-h-[6.25rem] sm:rounded-t-3xl sm:py-5",
          headerGradient(headerTone)
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-30 flex h-10 w-10 min-h-[40px] min-w-[40px] touch-manipulation items-center justify-center rounded-full border border-white/25 bg-black/40 text-white shadow-lg backdrop-blur-sm active:scale-95 sm:right-3 sm:top-3 sm:h-11 sm:w-11 sm:min-h-[44px] sm:min-w-[44px]"
          aria-label={
            language === "pt" ? "Fechar comprovante" : "Close receipt"
          }
        >
          <X className="h-5 w-5 sm:h-5 sm:w-5" strokeWidth={2.5} aria-hidden />
        </button>

        <div className="absolute right-0 top-0 p-2 opacity-[0.08] sm:p-4" aria-hidden>
          <Receipt className="h-16 w-16 text-white sm:h-20 sm:w-20" />
        </div>

        <div className="mb-2 rounded-full bg-white/20 p-2 shadow-inner backdrop-blur-md sm:p-2.5">
          {isSuccessHeader ? (
            <CheckCircle2 className="h-7 w-7 text-white sm:h-8 sm:w-8" />
          ) : headerTone === "danger" ? (
            <XCircle className="h-7 w-7 text-white sm:h-8 sm:w-8" />
          ) : (
            <Clock className="h-7 w-7 animate-pulse text-white sm:h-8 sm:w-8" />
          )}
        </div>

        <h2 className="max-w-[18rem] px-4 text-center text-lg font-bold tracking-tight text-white sm:max-w-[26rem] sm:text-xl md:text-2xl md:leading-snug">
          {title}
        </h2>
        {headerSubtitle ? (
          <p className="mt-1 max-w-[18rem] px-4 text-center text-xs leading-snug text-white/90 sm:max-w-[28rem] sm:text-sm sm:leading-relaxed">
            {headerSubtitle}
          </p>
        ) : null}
      </div>

      <div className="relative w-full rounded-b-2xl border border-t-0 border-border bg-card p-4 shadow-2xl sm:rounded-b-3xl sm:p-6 md:p-7">
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-1 py-2 text-center sm:py-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground sm:text-sm sm:tracking-widest">
              {amountSectionLabel}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-4xl font-black tabular-nums leading-none text-foreground sm:text-5xl md:text-[3.25rem]">
                {amountNumeric}
              </span>
              <span className="text-xl font-bold leading-none text-primary sm:text-2xl md:text-3xl">
                {amountCurrency}
              </span>
            </div>
            {footnote ? (
              <p className="text-xs leading-snug text-muted-foreground sm:text-sm">
                {footnote}
              </p>
            ) : null}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          <div className="grid gap-3 text-sm sm:gap-3 sm:text-base">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <div className="min-w-0 space-y-1.5">
                <span className="block text-xs font-medium text-muted-foreground sm:text-sm">
                  {statusFieldLabel}
                </span>
                <Badge
                  className={cn(
                    "border px-2.5 py-1 text-xs font-bold uppercase sm:px-3 sm:py-1 sm:text-sm",
                    badgeClass(statusBadgeTone)
                  )}
                >
                  {statusDisplay}
                </Badge>
              </div>
              <div className="min-w-0 space-y-1.5 text-right">
                <span className="block text-xs font-medium text-muted-foreground sm:text-sm">
                  {dateLabel}
                </span>
                <span className="block text-sm font-medium leading-snug text-foreground sm:text-base">
                  {dateFormatted}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-muted-foreground sm:text-sm">
                {language === "pt" ? "ID da transação" : "Transaction ID"}
              </span>
              <span
                className="block break-all rounded-md bg-muted px-3 py-2 text-left font-mono text-xs leading-snug text-foreground sm:text-sm"
                title={transactionId}
              >
                {transactionId}
              </span>
            </div>
          </div>

          {detailsSlot ? (
            <div className="space-y-3 sm:space-y-3">{detailsSlot}</div>
          ) : null}

          <div className="flex gap-3 rounded-xl border border-border/50 bg-muted/30 p-3 sm:gap-3 sm:rounded-2xl sm:p-4">
            <div className="shrink-0 rounded-lg bg-primary/10 p-2 sm:rounded-xl sm:p-2.5">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-bold text-foreground sm:text-base">
                {language === "pt"
                  ? "Comprovante emitido com segurança"
                  : "Secure receipt issued"}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {language === "pt"
                  ? "Guarde até a compensação. Para suporte: nº do recibo e ID da transação."
                  : "Keep until settlement. For support: receipt no. and transaction ID."}
              </p>
            </div>
          </div>

          <div className="relative py-1 sm:py-0.5">
            <div
              className="mx-3 border-t border-dashed border-border sm:mx-4"
              aria-hidden
            />
            <div
              className="absolute left-0 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background sm:h-6 sm:w-6"
              aria-hidden
            />
            <div
              className="absolute right-0 top-1/2 h-5 w-5 translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background sm:h-6 sm:w-6"
              aria-hidden
            />
          </div>

          <div className="space-y-3 rounded-xl border border-border/50 bg-background/40 p-3 sm:rounded-2xl sm:p-4">
            <div className="flex items-start justify-between gap-4 text-sm sm:text-base">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {language === "pt" ? "Nº do recibo" : "Receipt no."}
                </p>
                <p className="font-mono text-base font-bold text-foreground sm:text-lg">
                  {receiptNumber}
                </p>
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {language === "pt" ? "Emitido em" : "Issued at"}
                </p>
                <p className="text-sm font-medium leading-snug text-foreground sm:text-base">
                  {issuedAt}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/40 px-3 py-2 sm:rounded-xl sm:py-2.5">
              <Receipt className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
              <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs sm:tracking-[0.15em]">
                {language === "pt"
                  ? "BS Market — Comprovante digital"
                  : "BS Market — Digital receipt"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
              {showPrint ? (
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="h-12 min-h-[44px] gap-2 rounded-xl border-border text-base font-bold transition-all hover:bg-muted sm:h-14 sm:rounded-2xl sm:text-lg"
                >
                  <Download className="h-5 w-5" />
                  {language === "pt" ? "Baixar recibo" : "Download"}
                </Button>
              ) : null}
              {secondaryAction ? (
                <Button
                  variant="outline"
                  onClick={secondaryAction.onClick}
                  className="h-12 min-h-[44px] rounded-xl text-base font-bold sm:h-14 sm:rounded-2xl sm:text-lg"
                >
                  {secondaryAction.label}
                </Button>
              ) : null}
            </div>
            <Button
              onClick={onClose}
              className="h-12 min-h-[44px] w-full rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 sm:h-14 sm:rounded-2xl sm:text-lg"
            >
              {language === "pt" ? "Fechar" : "Close"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-3 hidden text-center opacity-60 sm:block sm:transition-opacity sm:hover:opacity-100">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground sm:text-xs">
          {language === "pt"
            ? "Documento gerado automaticamente"
            : "Automatically generated document"}
        </p>
      </div>
    </div>
  );
}

interface LegacyDepositReceiptProps {
  transaction: {
    id: string;
    amount: number;
    usdtAmount: number;
    date: Date;
    status: string;
    type?: string;
    currency?: string;
    network?: string;
    address?: string;
  };
  onClose: () => void;
  language: string;
}

function depositStatusBadgeTone(
  status: string
): DigitalReceiptStatusBadgeTone {
  const s = status.toUpperCase();
  if (
    s === "COMPLETED" ||
    s === "APPROVED" ||
    s === "CONFIRMED"
  ) {
    return "success";
  }
  if (s === "FAILED" || s === "REJECTED") return "destructive";
  return "info";
}

export const TransactionReceipt: React.FC<LegacyDepositReceiptProps> = ({
  transaction,
  onClose,
  language,
}) => {
  const s = transaction.status.toUpperCase();
  const isCompleted =
    s === "COMPLETED" || s === "APPROVED" || s === "CONFIRMED";
  const isCryptoDeposit = transaction.type === "CRYPTO";
  const creditedCurrency = transaction.currency || "USDT";

  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatCrypto = (value: number) =>
    new Intl.NumberFormat(language === "pt" ? "pt-BR" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);

  const headerTone: DigitalReceiptHeaderTone = isCompleted
    ? "success"
    : s === "FAILED" || s === "REJECTED"
    ? "danger"
    : "pending";

  const title = isCompleted
    ? language === "pt"
      ? "Pagamento confirmado!"
      : "Payment confirmed!"
    : language === "pt"
    ? "Depósito em processamento"
    : "Deposit processing";

  const statusLabelUi =
    isCompleted
      ? language === "pt"
        ? "Concluído"
        : "Completed"
      : s === "FAILED" || s === "REJECTED"
      ? language === "pt"
        ? "Não aprovado"
        : "Not approved"
      : language === "pt"
      ? "Em processamento"
      : "Processing";

  const cryptoExtras =
    transaction.type === "CRYPTO" ? (
      <>
        {transaction.network ? (
          <div className="flex items-center justify-between gap-3 text-sm sm:text-base">
            <span className="font-medium text-muted-foreground">
              {language === "pt" ? "Rede" : "Network"}
            </span>
            <Badge
              variant="outline"
              className="shrink-0 text-sm font-bold sm:text-base"
            >
              {transaction.network}
            </Badge>
          </div>
        ) : null}
        {transaction.address ? (
          <div className="space-y-2 pt-1">
            <span className="block text-sm font-medium text-muted-foreground sm:text-base">
              {language === "pt" ? "Endereço de depósito" : "Deposit address"}
            </span>
            <span
              className="block break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs leading-relaxed text-foreground sm:text-sm"
              title={transaction.address}
            >
              {transaction.address}
            </span>
          </div>
        ) : null}
      </>
    ) : null;

  return (
    <DigitalReceipt
      language={language}
      onClose={onClose}
      headerTone={headerTone}
      title={title}
      amountSectionLabel={
        language === "pt" ? "Valor creditado" : "Credited amount"
      }
      amountNumeric={formatCrypto(transaction.usdtAmount)}
      amountCurrency={creditedCurrency}
      footnote={
        !isCryptoDeposit && transaction.amount > 0
          ? `${language === "pt" ? "Custo total:" : "Total cost:"} ${formatBRL(
              transaction.amount
            )}`
          : null
      }
      statusFieldLabel={language === "pt" ? "Status" : "Status"}
      statusDisplay={statusLabelUi}
      statusBadgeTone={depositStatusBadgeTone(transaction.status)}
      dateLabel={language === "pt" ? "Data" : "Date"}
      dateFormatted={transaction.date.toLocaleString(
        language === "pt" ? "pt-BR" : "en-US"
      )}
      transactionId={transaction.id}
      detailsSlot={cryptoExtras ? <>{cryptoExtras}</> : null}
    />
  );
};
