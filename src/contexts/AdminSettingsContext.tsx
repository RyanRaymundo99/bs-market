"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "admin-settings";

export type AdminTheme = "dark" | "bright";
export type AdminColorPreset = "cyan" | "blue" | "green" | "purple" | "orange";
export type AdminButtonStyle = "filled" | "outline" | "soft";

export const DASHBOARD_SECTION_IDS = [
  "metrics",
  "shortcuts",
  "config",
  "activity",
  "finance",
  "transactions",
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number];

export const DASHBOARD_SECTION_LABELS: Record<DashboardSectionId, string> = {
  metrics: "Métricas",
  shortcuts: "Atalhos",
  config: "Configuração da plataforma",
  activity: "Atividade e transações",
  finance: "Visão financeira",
  transactions: "Transações",
};

export interface AdminSettings {
  theme: AdminTheme;
  primaryColor: AdminColorPreset;
  secondaryColor: AdminColorPreset;
  buttonStyle: AdminButtonStyle;
  dashboardSectionOrder: DashboardSectionId[];
}

const defaultSettings: AdminSettings = {
  theme: "dark",
  primaryColor: "cyan",
  secondaryColor: "cyan",
  buttonStyle: "filled",
  dashboardSectionOrder: [...DASHBOARD_SECTION_IDS],
};

function loadSettings(): AdminSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<AdminSettings>;
    return {
      theme: parsed.theme === "bright" ? "bright" : defaultSettings.theme,
      primaryColor: ["cyan", "blue", "green", "purple", "orange"].includes(parsed.primaryColor as string)
        ? (parsed.primaryColor as AdminColorPreset)
        : defaultSettings.primaryColor,
      secondaryColor: ["cyan", "blue", "green", "purple", "orange"].includes(parsed.secondaryColor as string)
        ? (parsed.secondaryColor as AdminColorPreset)
        : defaultSettings.secondaryColor,
      buttonStyle: ["filled", "outline", "soft"].includes(parsed.buttonStyle as string)
        ? (parsed.buttonStyle as AdminButtonStyle)
        : defaultSettings.buttonStyle,
      dashboardSectionOrder: Array.isArray(parsed.dashboardSectionOrder)
        ? (parsed.dashboardSectionOrder.filter((id) =>
            DASHBOARD_SECTION_IDS.includes(id as DashboardSectionId)
          ) as DashboardSectionId[])
        : defaultSettings.dashboardSectionOrder,
    };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: AdminSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

interface AdminSettingsContextValue {
  settings: AdminSettings;
  setTheme: (theme: AdminTheme) => void;
  setPrimaryColor: (color: AdminColorPreset) => void;
  setSecondaryColor: (color: AdminColorPreset) => void;
  setButtonStyle: (style: AdminButtonStyle) => void;
  setDashboardSectionOrder: (order: DashboardSectionId[]) => void;
  moveSection: (id: DashboardSectionId, direction: "up" | "down") => void;
}

const AdminSettingsContext = createContext<AdminSettingsContextValue | null>(null);

export function AdminSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSettings(settings);
  }, [hydrated, settings]);

  const setTheme = useCallback((theme: AdminTheme) => {
    setSettings((s) => ({ ...s, theme }));
  }, []);

  const setPrimaryColor = useCallback((primaryColor: AdminColorPreset) => {
    setSettings((s) => ({ ...s, primaryColor }));
  }, []);

  const setSecondaryColor = useCallback((secondaryColor: AdminColorPreset) => {
    setSettings((s) => ({ ...s, secondaryColor }));
  }, []);

  const setButtonStyle = useCallback((buttonStyle: AdminButtonStyle) => {
    setSettings((s) => ({ ...s, buttonStyle }));
  }, []);

  const setDashboardSectionOrder = useCallback((dashboardSectionOrder: DashboardSectionId[]) => {
    setSettings((s) => ({ ...s, dashboardSectionOrder }));
  }, []);

  const moveSection = useCallback((id: DashboardSectionId, direction: "up" | "down") => {
    setSettings((s) => {
      const order = [...s.dashboardSectionOrder];
      const i = order.indexOf(id);
      if (i === -1) return s;
      if (direction === "up" && i > 0) {
        [order[i - 1], order[i]] = [order[i], order[i - 1]];
      } else if (direction === "down" && i < order.length - 1) {
        [order[i], order[i + 1]] = [order[i + 1], order[i]];
      } else return s;
      return { ...s, dashboardSectionOrder: order };
    });
  }, []);

  const value = useMemo<AdminSettingsContextValue>(
    () => ({
      settings,
      setTheme,
      setPrimaryColor,
      setSecondaryColor,
      setButtonStyle,
      setDashboardSectionOrder,
      moveSection,
    }),
    [settings, setTheme, setPrimaryColor, setSecondaryColor, setButtonStyle, setDashboardSectionOrder, moveSection]
  );

  return (
    <AdminSettingsContext.Provider value={value}>
      {children}
    </AdminSettingsContext.Provider>
  );
}

export function useAdminSettings() {
  const ctx = useContext(AdminSettingsContext);
  if (!ctx) throw new Error("useAdminSettings must be used within AdminSettingsProvider");
  return ctx;
}
