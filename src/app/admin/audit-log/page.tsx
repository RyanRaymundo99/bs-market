"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
import { RefreshCw, ChevronLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function AuditLogPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [resourceType, setResourceType] = useState<string>("all");
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (resourceType && resourceType !== "all") params.set("resourceType", resourceType);
      const response = await fetch(`/api/admin/audit-log?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotal(data.total ?? 0);
      } else {
        const err = await response.json();
        toast({
          title: "Erro",
          description: err.error || "Falha ao carregar log",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Audit log fetch error:", error);
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [limit, offset, resourceType, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Audit Log</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Registro de ações administrativas (quem fez o quê e quando)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={resourceType} onValueChange={setResourceType}>
            <SelectTrigger className="w-[180px] bg-muted border-border text-foreground">
              <SelectValue placeholder="Tipo de recurso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="transaction">Transação</SelectItem>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="withdrawal">Saque</SelectItem>
              <SelectItem value="deposit">Depósito</SelectItem>
              <SelectItem value="money_controls">Controles</SelectItem>
              <SelectItem value="balance">Saldo</SelectItem>
              <SelectItem value="kyc">KYC</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={fetchLogs}
            disabled={loading}
            variant="outline"
            className="gap-2 border-border text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg overflow-hidden border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">Data/Hora</TableHead>
              <TableHead className="text-muted-foreground">Admin</TableHead>
              <TableHead className="text-muted-foreground">Ação</TableHead>
              <TableHead className="text-muted-foreground">Recurso</TableHead>
              <TableHead className="text-muted-foreground">ID Recurso</TableHead>
              <TableHead className="text-muted-foreground">IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="border-border">
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {log.adminEmail || log.adminId}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{log.resourceType}</TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono max-w-[120px] truncate">
                    {log.resourceId || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{log.ipAddress || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between p-3 border-t border-border">
          <span className="text-sm text-muted-foreground">
            Total: {total} | Exibindo {offset + 1}–{Math.min(offset + limit, total)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              className="border-border text-muted-foreground"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + limit >= total}
              onClick={() => setOffset((o) => o + limit)}
              className="border-border text-muted-foreground"
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
