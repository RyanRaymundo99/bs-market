"use client";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { SiteThemeProvider } from "@/components/providers/SiteThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SiteThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </SiteThemeProvider>
  );
}

