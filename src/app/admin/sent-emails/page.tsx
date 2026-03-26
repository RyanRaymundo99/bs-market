"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SentEmailLog {
  id: string;
  userId: string;
  type: string;
  subject: string | null;
  sentAt: string;
  metadata: Record<string, unknown> | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function SentEmailsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<SentEmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SentEmailLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/communication-log?limit=200");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      } else {
        const err = await res.json();
        toast({
          title: "Erro",
          description: err.error || "Falha ao carregar emails enviados",
          variant: "destructive",
        });
      }
    } catch (e: unknown) {
      console.error(e);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDelete = async (log: SentEmailLog) => {
    setConfirmDelete(log);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      const res = await fetch(
        `/api/admin/communication-log/${confirmDelete.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== confirmDelete.id));
        toast({
          title: "Removido",
          description: "Registro de email removido da lista.",
        });
        setConfirmDelete(null);
      } else {
        const err = await res.json();
        toast({
          title: "Erro",
          description: err.error || "Falha ao remover",
          variant: "destructive",
        });
      }
    } catch (e: unknown) {
      toast({
        title: "Erro",
        description: "Falha ao remover",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const typeLabel: Record<string, string> = {
    receipt: "Recibo",
    notification: "Notificação",
    approval: "Aprovação",
    kyc: "KYC",
    other: "Outro",
  };

  if (loading && logs.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Emails enviados
          </h1>
          <p className="text-muted-foreground">
            Registro de emails enviados aos usuários. Você pode remover
            registros da lista (não altera o email já enviado).
          </p>
        </div>
        <Button
          onClick={fetchLogs}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="bg-card rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            Nenhum email registrado ainda. Os envios a partir de agora serão
            listados aqui.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Data/Hora</TableHead>
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-muted-foreground">Assunto</TableHead>
                <TableHead className="text-muted-foreground">Usuário</TableHead>
                <TableHead className="text-muted-foreground w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="border-border">
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(log.sentAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {typeLabel[log.type] ?? log.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[280px] truncate">
                    {log.subject || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <span title={log.user.email}>
                      {log.user.name || log.user.email}
                    </span>
                    <br />
                    <span className="text-muted-foreground text-xs">
                      {log.user.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(log)}
                      disabled={deletingId === log.id}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Remover registro de email?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Isso só remove o registro da lista. O email já enviado não é
              alterado. O usuário não é afetado.
            </DialogDescription>
          </DialogHeader>
          {confirmDelete && (
            <div className="text-sm text-muted-foreground py-2">
              <p>
                <strong>Assunto:</strong> {confirmDelete.subject || "—"}
              </p>
              <p>
                <strong>Para:</strong> {confirmDelete.user.email}
              </p>
              <p>
                <strong>Data:</strong> {formatDate(confirmDelete.sentAt)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAction}
              disabled={deletingId !== null}
            >
              {deletingId ? "Removendo…" : "Remover registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
