"use client";

import React, { useState, useEffect } from "react";
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

  const fetchLogs = async () => {
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
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

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
    } catch (e) {
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
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Emails enviados
          </h1>
          <p className="text-gray-400">
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
        <div className="bg-gray-900 rounded-lg p-8 text-center">
          <p className="text-gray-400">
            Nenhum email registrado ainda. Os envios a partir de agora serão
            listados aqui.
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="text-gray-300">Data/Hora</TableHead>
                <TableHead className="text-gray-300">Tipo</TableHead>
                <TableHead className="text-gray-300">Assunto</TableHead>
                <TableHead className="text-gray-300">Usuário</TableHead>
                <TableHead className="text-gray-300 w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="border-gray-800">
                  <TableCell className="text-gray-300 text-sm">
                    {formatDate(log.sentAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {typeLabel[log.type] ?? log.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm max-w-[280px] truncate">
                    {log.subject || "—"}
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm">
                    <span title={log.user.email}>
                      {log.user.name || log.user.email}
                    </span>
                    <br />
                    <span className="text-gray-500 text-xs">
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
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Remover registro de email?
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Isso só remove o registro da lista. O email já enviado não é
              alterado. O usuário não é afetado.
            </DialogDescription>
          </DialogHeader>
          {confirmDelete && (
            <div className="text-sm text-gray-300 py-2">
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
              className="border-gray-600"
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
