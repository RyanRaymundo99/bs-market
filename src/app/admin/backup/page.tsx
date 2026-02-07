"use client";

import React, { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, RefreshCw, AlertTriangle } from "lucide-react";

export default function BackupPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<{ counts: Record<string, number> } | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<File | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/backup/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filename = disposition
        ? disposition.replace(/.*filename="?([^";]+)"?/, "$1").trim()
        : `backup-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Backup baixado",
        description: "O arquivo foi salvo no seu computador.",
      });
    } catch (e) {
      toast({
        title: "Erro",
        description: e instanceof Error ? e.message : "Falha ao exportar backup",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      toast({
        title: "Arquivo inválido",
        description: "Envie um arquivo .json de backup.",
        variant: "destructive",
      });
      return;
    }
    setDryRunResult(null);
    setConfirmRestore(file);
  };

  const handleDryRun = async () => {
    if (!confirmRestore) return;
    setRestoring(true);
    try {
      const form = new FormData();
      form.append("backup", confirmRestore);
      form.append("dryRun", "true");
      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dry run failed");
      setDryRunResult({ counts: data.counts ?? {} });
      toast({
        title: "Prévia do restore",
        description: "Confira os números abaixo. Se estiver correto, clique em Restaurar.",
      });
    } catch (e) {
      toast({
        title: "Erro",
        description: e instanceof Error ? e.message : "Falha na prévia",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleRestore = async () => {
    if (!confirmRestore) return;
    setRestoring(true);
    try {
      const form = new FormData();
      form.append("backup", confirmRestore);
      form.append("dryRun", "false");
      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");
      toast({
        title: "Restore concluído",
        description: data.message,
      });
      setConfirmRestore(null);
      setDryRunResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      toast({
        title: "Erro",
        description: e instanceof Error ? e.message : "Falha ao restaurar",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground mb-2">Backup e Restore</h1>
      <p className="text-muted-foreground mb-8">
        Exporte um snapshot dos usuários e dados principais para um arquivo JSON. Use o restore para
        repor dados a partir de um backup (por id: cria ou atualiza registros).
      </p>

      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar backup
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Baixa um arquivo JSON com: usuários, contas, saldos, transações, depósitos, saques,
              pedidos, notificações, notas, emails enviados, suporte, ofertas P2P e configurações de
              alerta. Faça isso antes de mudanças grandes no banco.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExport}
              disabled={exporting}
              variant="outline"
              className="gap-2 border-border text-muted-foreground hover:bg-muted"
            >
              <RefreshCw className={`h-4 w-4 ${exporting ? "animate-spin" : ""}`} />
              {exporting ? "Exportando…" : "Baixar backup agora"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Restaurar de backup
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Envie um arquivo .json de backup. Use &quot;Prévia&quot; para ver quantos registros
              serão aplicados sem alterar nada. &quot;Restaurar&quot; faz upsert por id (cria ou
              atualiza).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-muted file:text-foreground"
            />
            {confirmRestore && (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleDryRun}
                  disabled={restoring}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-border text-muted-foreground"
                >
                  {restoring ? "…" : "Prévia (dry run)"}
                </Button>
                <Button
                  onClick={() => setConfirmRestore(null)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  Limpar
                </Button>
              </div>
            )}
            {dryRunResult && (
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="text-muted-foreground font-medium mb-2">Registros no backup:</p>
                <ul className="text-muted-foreground space-y-1">
                  {Object.entries(dryRunResult.counts).map(([key, count]) => (
                    <li key={key}>
                      {key}: {count}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={handleRestore}
                  disabled={restoring}
                  variant="default"
                  size="sm"
                  className="mt-3 gap-2 bg-amber-600 hover:bg-amber-700"
                >
                  {restoring ? "Restaurando…" : "Restaurar de verdade"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-amber-900/50">
          <CardHeader>
            <CardTitle className="text-amber-400 flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Dica: backups do provedor do banco
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Se você usa Neon, Vercel Postgres, Supabase ou outro provedor, ative os backups
              automáticos e o point-in-time recovery (PITR) no painel deles. Assim você pode voltar
              o banco a um momento anterior sem depender só deste export/restore.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

    </div>
  );
}
