"use client";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { BalanceProvider } from "@/contexts/BalanceContext";
import { SiteThemeProvider } from "@/components/providers/SiteThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SiteThemeProvider>
      <LanguageProvider>
        <BalanceProvider>{children}</BalanceProvider>
      </LanguageProvider>
    </SiteThemeProvider>
  );
}

