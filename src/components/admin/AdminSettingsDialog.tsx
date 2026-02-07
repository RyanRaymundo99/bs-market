"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronUp, ChevronDown, Palette, LayoutGrid, Sun, Moon, Globe } from "lucide-react";
import {
  useAdminSettings,
  type AdminTheme,
  type AdminColorPreset,
  type AdminButtonStyle,
  DASHBOARD_SECTION_LABELS,
  type DashboardSectionId,
} from "@/contexts/AdminSettingsContext";
import { cn } from "@/lib/utils";
import { Square, SquareDashedBottomCode, CircleDot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const THEME_OPTIONS: { value: AdminTheme; label: string; icon: React.ElementType }[] = [
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "bright", label: "Claro", icon: Sun },
];

const COLOR_OPTIONS: { value: AdminColorPreset; label: string; class: string }[] = [
  { value: "cyan", label: "Ciano", class: "bg-cyan-500" },
  { value: "blue", label: "Azul", class: "bg-blue-500" },
  { value: "green", label: "Verde", class: "bg-emerald-500" },
  { value: "purple", label: "Roxo", class: "bg-violet-500" },
  { value: "orange", label: "Laranja", class: "bg-orange-500" },
];

const BUTTON_STYLE_OPTIONS: { value: AdminButtonStyle; label: string; icon: React.ElementType }[] = [
  { value: "filled", label: "Preenchido", icon: Square },
  { value: "outline", label: "Contorno", icon: SquareDashedBottomCode },
  { value: "soft", label: "Suave", icon: CircleDot },
];

interface AdminSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminSettingsDialog({ open, onOpenChange }: AdminSettingsDialogProps) {
  const { settings, setTheme, setPrimaryColor, setSecondaryColor, setButtonStyle, moveSection } = useAdminSettings();
  const [activeTab, setActiveTab] = useState<"theme" | "layout">("theme");
  const [applyingToSite, setApplyingToSite] = useState(false);
  const { toast } = useToast();

  const applyToSite = async () => {
    setApplyingToSite(true);
    try {
      const res = await fetch("/api/admin/site-appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: settings.theme,
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor,
          buttonStyle: settings.buttonStyle,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: "Aparência aplicada ao site", description: "Login, landing e páginas públicas usarão este tema." });
      } else {
        toast({ variant: "destructive", title: "Erro", description: data.error || "Falha ao aplicar ao site." });
      }
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao aplicar ao site." });
    } finally {
      setApplyingToSite(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Aparência do Admin
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Tema, cores e ordem dos blocos do dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b border-border pb-2">
          <Button
            variant={activeTab === "theme" ? "secondary" : "ghost"}
            size="sm"
            className={activeTab === "theme" ? "bg-muted" : ""}
            onClick={() => setActiveTab("theme")}
          >
            <Palette className="h-4 w-4 mr-1.5" />
            Tema e cores
          </Button>
          <Button
            variant={activeTab === "layout" ? "secondary" : "ghost"}
            size="sm"
            className={activeTab === "layout" ? "bg-muted" : ""}
            onClick={() => setActiveTab("layout")}
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Ordem dos blocos
          </Button>
        </div>

        {activeTab === "theme" && (
          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Tema</Label>
              <div className="flex gap-2">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1 border-border",
                      settings.theme === value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                    )}
                    onClick={() => setTheme(value)}
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Cor primária</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(({ value, label, class: colorClass }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPrimaryColor(value)}
                    className={cn(
                      "h-9 w-9 rounded-full border-2 transition-all",
                      colorClass,
                      settings.primaryColor === value ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" : "opacity-80 hover:opacity-100 hover:scale-105",
                      "border-transparent"
                    )}
                    title={label}
                    aria-label={label}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Botões, links e destaques</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Cor secundária</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(({ value, label, class: colorClass }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSecondaryColor(value)}
                    className={cn(
                      "h-9 w-9 rounded-full border-2 transition-all",
                      colorClass,
                      settings.secondaryColor === value ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" : "opacity-80 hover:opacity-100 hover:scale-105",
                      "border-transparent"
                    )}
                    title={label}
                    aria-label={label}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Áreas secundárias e bordas</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Estilo dos botões</Label>
              <p className="text-xs text-muted-foreground mb-1">Aparência dos botões principais (admin e site).</p>
              <p className="text-xs text-muted-foreground mb-2">
                Aparência dos botões principais em todo o admin (mesmo estilo em todas as páginas).
              </p>
              <div className="flex gap-2 flex-wrap">
                {BUTTON_STYLE_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "border-border",
                      settings.buttonStyle === value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                    )}
                    onClick={() => setButtonStyle(value)}
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">
                Aplicar esta aparência ao site público (landing, login, signup e páginas do usuário).
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-border text-foreground hover:bg-muted"
                onClick={applyToSite}
                disabled={applyingToSite}
              >
                <Globe className="h-4 w-4 mr-2" />
                {applyingToSite ? "Aplicando…" : "Aplicar ao site público"}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "layout" && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Altere a ordem dos blocos na página inicial do dashboard. Use as setas para subir ou descer.
            </p>
            <ul className="space-y-1">
              {settings.dashboardSectionOrder.map((id, index) => (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                  <span className="flex-1 text-sm font-medium text-foreground">
                    {DASHBOARD_SECTION_LABELS[id as DashboardSectionId]}
                  </span>
                  <div className="flex gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                      onClick={() => moveSection(id as DashboardSectionId, "up")}
                      disabled={index === 0}
                      aria-label="Subir"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                      onClick={() => moveSection(id as DashboardSectionId, "down")}
                      disabled={index === settings.dashboardSectionOrder.length - 1}
                      aria-label="Descer"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
