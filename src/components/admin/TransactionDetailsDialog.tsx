"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send, 
  RefreshCcw, 
  Wallet, 
  User, 
  FileText, 
  ExternalLink 
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, getStatusLabel, getTransactionTypeLabel } from "@/lib/utils";

/** Shape passed from admin dashboard / transactions when opening the details dialog */
export interface AdminTransactionDetail {
  id: string;
  type: string;
  status: string;
  date: string;
  description?: string | null;
  amount?: number;
  balance?: number;
  currency?: string;
  metadata?: Record<string, unknown> | null;
  user?:
    | string
    | {
        name?: string;
        email?: string;
        cpf?: string | null;
      }
    | null;
  deposit?: {
    status?: string;
    amount?: number | null;
    externalId?: string | null;
  } | null;
  order?: {
    status?: string;
    amount?: number | string | null;
    externalOrderId?: string | null;
  } | null;
  withdrawal?: {
    status?: string;
    amount?: number | null;
    walletAddress?: string | null;
    network?: string | null;
    pixKey?: string | null;
  } | null;
}

interface TransactionDetailsDialogProps {
  transactionDetails: AdminTransactionDetail | null;
  onClose: () => void;
  markingCompleted: boolean;
  rejectingTransaction: boolean;
  handleMarkAsCompleted: (hash?: string) => void;
  setShowRejectionDialog: (show: boolean) => void;
  handleSyncStatus: () => void;
  syncingStatus: boolean;
  resendingReceipt: boolean;
  handleResendReceipt: () => void;
  language: string;
}

export const TransactionDetailsDialog: React.FC<TransactionDetailsDialogProps> = ({
  transactionDetails,
  onClose,
  markingCompleted,
  rejectingTransaction,
  handleMarkAsCompleted,
  setShowRejectionDialog,
  handleSyncStatus,
  syncingStatus,
  resendingReceipt,
  handleResendReceipt,
  language,
}) => {
  if (!transactionDetails) return null;

  const userRecord =
    transactionDetails.user != null &&
    typeof transactionDetails.user === "object"
      ? transactionDetails.user
      : null;

  return (
    <Dialog open={!!transactionDetails} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border text-foreground max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center justify-between">
            <span>Detalhes da Transação</span>
            <span className="text-xs font-mono text-muted-foreground mr-6">
              ID: {transactionDetails.id}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <span className="text-foreground font-medium">
                {getTransactionTypeLabel(transactionDetails.type)}
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">Status</p>
                {(transactionDetails.status === "PENDING" ||
                  transactionDetails.status === "PROCESSING" ||
                  transactionDetails.status === "EXECUTING") &&
                  !transactionDetails.id.startsWith("order_") && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleMarkAsCompleted()}
                        disabled={markingCompleted || rejectingTransaction}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px] border-primary text-primary hover:bg-primary/15"
                      >
                        {markingCompleted ? (
                          <Clock className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        <span className="ml-1">{language === "pt" ? "Aprovar" : "Approve"}</span>
                      </Button>
                      <Button
                        onClick={() => setShowRejectionDialog(true)}
                        disabled={markingCompleted || rejectingTransaction}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px] border-red-500 text-red-500 hover:bg-red-500/15"
                      >
                        <XCircle className="w-3 h-3" />
                        <span className="ml-1">{language === "pt" ? "Negar" : "Reject"}</span>
                      </Button>
                    </div>
                  )}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                ["APPROVED", "COMPLETED", "CONFIRMED"].includes(transactionDetails.status) ? "bg-emerald-500/15 text-emerald-500" :
                ["PENDING", "PROCESSING", "EXECUTING"].includes(transactionDetails.status) ? "bg-yellow-500/15 text-yellow-500" :
                "bg-red-500/15 text-red-500"
              }`}>
                {getStatusLabel(transactionDetails.status)}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="text-foreground">
                {new Date(transactionDetails.date).toLocaleString("pt-BR")}
              </p>
            </div>
            {transactionDetails.description && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Descrição</p>
                <p className="text-foreground text-sm">
                  {transactionDetails.description}
                </p>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="border-t border-border pt-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <User className="w-4 h-4 mr-2" />
              Usuário
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="text-foreground">
                  {typeof transactionDetails.user === "string"
                    ? transactionDetails.user
                    : userRecord?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <div className="flex items-center gap-2">
                  <p className="text-foreground text-sm">
                    {userRecord?.email || "N/A"}
                  </p>
                  {transactionDetails.type === "DEPOSIT" && (
                    <Button
                      onClick={handleResendReceipt}
                      disabled={resendingReceipt}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px] border-border text-foreground hover:bg-muted"
                    >
                      {resendingReceipt ? (
                        <Clock className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3 mr-1" />
                      )}
                      Recibo
                    </Button>
                  )}
                </div>
              </div>
              {userRecord?.cpf && (
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="text-foreground">{userRecord.cpf}</p>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Amount */}
          <div className="border-t border-border pt-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Wallet className="w-4 h-4 mr-2" />
              Valores
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="text-foreground font-semibold">
                  {formatCurrency(transactionDetails.amount || 0)}{" "}
                  {transactionDetails.currency ?? ""}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo após transação</p>
                <p className="text-foreground">
                  {formatCurrency(transactionDetails.balance || 0)}{" "}
                  {transactionDetails.currency ?? ""}
                </p>
              </div>
            </div>
          </div>

          {/* Order Details (if any) */}
          {transactionDetails.order && (
            <div className="border-t border-border pt-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Pedido Crypto
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-foreground">
                    {transactionDetails.order.status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor USDT</p>
                  <p className="text-foreground">
                    {String(transactionDetails.order.amount ?? "")} USDT
                  </p>
                </div>
                {transactionDetails.order.externalOrderId && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">ID Externo</p>
                    <p className="text-foreground font-mono text-xs">
                      {transactionDetails.order.externalOrderId}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deposit Details */}
          {transactionDetails.deposit && (
            <div className="border-t border-border pt-4">
              <h3 className="text-lg font-semibold mb-3">Detalhes do Depósito</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Status do Depósito</p>
                    <p className="text-sm font-semibold">{transactionDetails.deposit.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Valor</p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(
                        Number(transactionDetails.deposit.amount ?? 0)
                      )}
                    </p>
                  </div>
                </div>
                
                {transactionDetails.deposit.externalId && (
                  <div>
                    <p className="text-sm text-muted-foreground">ID Externo</p>
                    <p className="text-foreground font-mono text-xs">{transactionDetails.deposit.externalId}</p>
                  </div>
                )}

                {typeof transactionDetails.metadata?.transactionHash ===
                  "string" && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm font-semibold text-primary mb-1 flex items-center">
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Hash da Transação (Informado pelo Cliente)
                    </p>
                    <p className="text-xs font-mono break-all text-foreground bg-background p-2 rounded border border-border">
                      {transactionDetails.metadata.transactionHash}
                    </p>
                    {typeof transactionDetails.metadata.hashSubmittedAt ===
                      "string" && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Enviado em:{" "}
                        {new Date(
                          transactionDetails.metadata.hashSubmittedAt
                        ).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Withdrawal Details */}
          {transactionDetails.withdrawal && (
            <div className="border-t border-border pt-4">
              <h3 className="text-lg font-semibold mb-3">Detalhes do Saque</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    transactionDetails.withdrawal.status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-500" :
                    transactionDetails.withdrawal.status === "PENDING" ? "bg-yellow-500/15 text-yellow-500" :
                    "bg-red-500/15 text-red-500"
                  }`}>
                    {transactionDetails.withdrawal.status ?? ""}
                  </span>
                  
                  {(transactionDetails.withdrawal.status === "PENDING" || transactionDetails.withdrawal.status === "PROCESSING") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSyncStatus}
                      disabled={syncingStatus}
                      className="h-7 text-xs border-primary text-primary hover:bg-primary/10"
                    >
                      {syncingStatus ? (
                        <RefreshCcw className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCcw className="w-3 h-3 mr-1" />
                      )}
                      Sincronizar Status
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="text-foreground font-semibold">
                      {formatCurrency(
                        Number(transactionDetails.withdrawal.amount ?? 0)
                      )}
                    </p>
                  </div>
                  {transactionDetails.withdrawal.walletAddress && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Endereço da Carteira</p>
                      <p className="text-foreground font-mono text-xs break-all">{transactionDetails.withdrawal.walletAddress}</p>
                      {transactionDetails.withdrawal.network && (
                        <p className="text-[10px] text-primary mt-0.5 font-medium">Rede: {transactionDetails.withdrawal.network}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Metadata Raw */}
          {transactionDetails.metadata && Object.keys(transactionDetails.metadata).length > 0 && (
            <div className="border-t border-border pt-4">
              <details className="group">
                <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                  <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                  Metadata Bruta
                </summary>
                <pre className="bg-muted p-3 rounded text-[10px] overflow-x-auto mt-2 border border-border">
                  {JSON.stringify(transactionDetails.metadata, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Webhook logs link */}
          <div className="border-t border-border pt-4 flex flex-wrap items-center gap-2">
            <Link
              href="/admin/webhook-logs"
              className="text-sm text-primary hover:text-primary hover:underline flex items-center"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Ver logs de webhook
            </Link>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:bg-muted">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
