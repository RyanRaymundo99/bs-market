"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { SiteAppearance } from "@/app/api/site-appearance/route";

export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) {
      document.documentElement.removeAttribute("data-site-theme");
      document.documentElement.removeAttribute("data-site-primary");
      document.documentElement.removeAttribute("data-site-secondary");
      document.documentElement.removeAttribute("data-site-button-style");
      return;
    }
    fetch("/api/site-appearance")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.appearance) {
          const a = data.appearance as SiteAppearance;
          document.documentElement.setAttribute("data-site-theme", a.theme);
          document.documentElement.setAttribute("data-site-primary", a.primaryColor);
          document.documentElement.setAttribute("data-site-secondary", a.secondaryColor);
          document.documentElement.setAttribute("data-site-button-style", a.buttonStyle);
        }
      })
      .catch(() => {
        document.documentElement.setAttribute("data-site-theme", "dark");
        document.documentElement.setAttribute("data-site-primary", "cyan");
        document.documentElement.setAttribute("data-site-secondary", "cyan");
        document.documentElement.setAttribute("data-site-button-style", "filled");
      });
  }, [isAdmin, pathname]);

  return <>{children}</>;
}
