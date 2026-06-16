"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Headset, Mail, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMobileMenuOpen } from "@/hooks/useMobileMenuOpen";
import { cn } from "@/lib/utils";

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5511984284867";
const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "suporte@bsmarket.com.br";

export function FloatingSupportWidget() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mobileMenuOpen = useMobileMenuOpen();

  useEffect(() => {
    setMounted(true);
  }, []);

  const excludedPaths = [
    "/admin",
    "/login",
    "/signup",
    "/auth",
    "/forgot-password",
    "/reset-password",
  ];
  const shouldShow = !excludedPaths.some((path) => pathname.startsWith(path));

  if (!shouldShow) return null;

  // Use static position until mounted to avoid hydration mismatch (mobileMenuOpen can differ server vs client)
  const alignBottomRight = mounted && mobileMenuOpen;

  return (
    <div
      className={cn(
        "fixed z-40 flex flex-col items-end gap-2",
        alignBottomRight
          ? "bottom-0 right-0"
          : "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-3 md:bottom-6 md:right-6"
      )}
      style={{
        paddingBottom: alignBottomRight ? "env(safe-area-inset-bottom, 0)" : undefined,
        paddingRight: "env(safe-area-inset-right, 0)",
      }}
    >
      {open && (
        <div className="rounded-xl border border-white/20 bg-black/95 backdrop-blur-xl shadow-xl p-4 w-72 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-white flex items-center gap-2">
              <Headset className="w-4 h-4 text-primary" />
              {t("contactSupport")}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-white/70 mb-3">
            {t("contactSupportDescription")}
          </p>
          <div className="flex flex-col gap-2">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 border border-[#25D366]/40 transition-colors text-sm font-medium"
            >
              <Headset className="w-4 h-4 shrink-0" />
              <span>{t("contactViaWhatsApp")}</span>
              <span className="text-xs opacity-80">+55 11 98428-4867</span>
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-colors text-sm font-medium"
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>{t("contactViaEmail")}</span>
            </a>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full border border-primary/30 bg-primary/90 text-primary-foreground shadow-md hover:bg-primary transition-colors p-2.5 md:p-3.5"
        aria-label={t("contactSupport")}
        title={t("contactSupport")}
      >
        <Headset className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />
      </button>
    </div>
  );
}
