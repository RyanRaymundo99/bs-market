"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { BalanceDisplay } from "./balance-display";
import { UserNotificationBell } from "./user-notification-bell";
import { useLanguage } from "@/contexts/LanguageContext";
import { FlagBR } from "@/components/icons/FlagBR";
import { FlagUS } from "@/components/icons/FlagUS";
import { syncMobileMenuToBody } from "@/hooks/useMobileMenuOpen";
import { cn } from "@/lib/utils";
import { useAppTabNavigation } from "@/components/navigation/app-tab-navigation";
import { APP_TAB_HREF, APP_NAV_ITEMS } from "@/lib/app-tabs/types";

import { DESKTOP_SHELL_PL } from "@/constants/layout-shell";

export { DESKTOP_SHELL_PL } from "@/constants/layout-shell";

interface NavbarProps {
  isLoggingOut: boolean;
  handleLogout: () => void;
}

export default function NavbarNew({ isLoggingOut, handleLogout }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [moneyDisabled, setMoneyDisabled] = useState(false);
  const [moneyDisabledMessage, setMoneyDisabledMessage] = useState<string>("");
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const { navigateTab, displayTab } = useAppTabNavigation();

  // Use pre-committed displayTab (from the tab shell context) exclusively for
  // the 4 main tabs — this gives instant visual feedback on click and avoids
  // dual-highlight where both old and new tabs appear active simultaneously.
  const navItemActive = (href: string) => {
    const mainTabHref = APP_TAB_HREF[displayTab as keyof typeof APP_TAB_HREF];
    // If on a main-tab route, only match the currently displayed tab
    if (mainTabHref) return mainTabHref === href;
    // Sub-route fallback: match by pathname
    if (!pathname) return false;
    if (pathname === href) return true;
    if (href === "/trade" && pathname === "/deposit") return true;
    return false;
  };

  // Prevent hydration mismatch by only rendering translated content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadSiteStatus = async () => {
      try {
        const response = await fetch("/api/site-status");
        if (!response.ok) return;
        const data = await response.json();
        if (data?.success) {
          setMoneyDisabled(Boolean(data.moneyDisabled));
          setMoneyDisabledMessage(String(data.moneyDisabledMessage || ""));
        }
      } catch (error) {
        console.error("Failed to load site status:", error);
      }
    };
    loadSiteStatus();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    syncMobileMenuToBody(isMobileMenuOpen);

    return () => {
      document.body.style.overflow = "unset";
      syncMobileMenuToBody(false);
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside
        aria-label={t("menu")}
        className="fixed left-0 top-0 z-50 hidden h-dvh w-56 flex-col border-r border-white/10 bg-black/95 backdrop-blur-xl print:hidden md:flex"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-1 px-2 pt-3">
          <div className="mb-3 flex w-full shrink-0 items-center gap-1.5 px-0.5">
            <Link
              href="/dashboard"
              prefetch
              scroll={false}
              className="min-w-0 flex-1 cursor-pointer py-0.5 transition-opacity hover:opacity-80"
            >
              <Image
                src="/shortname-logo.svg"
                alt="Build Strategy"
                width={560}
                height={224}
                className="block h-14 w-auto max-w-full origin-left scale-[1.8] object-contain object-left"
                priority
              />
            </Link>
            <div
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {mounted ? (
                <UserNotificationBell
                  triggerClassName="h-11 w-11 rounded-xl"
                  iconClassName="h-6 w-6"
                />
              ) : (
                <div
                  className="h-11 w-11 shrink-0 rounded-xl"
                  aria-hidden
                />
              )}
            </div>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pb-2 pr-0.5">
            {APP_NAV_ITEMS.map((link) => {
              const IconComponent = link.icon;
              const active = navItemActive(link.href);
              return (
                <Link
                  key={link.labelKey}
                  href={link.href}
                  prefetch
                  scroll={false}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTab(link.href);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-[15px] font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                      active ? "bg-primary/15" : "bg-white/[0.04]"
                    )}
                  >
                    <IconComponent
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        active ? "text-primary" : "text-foreground/70"
                      )}
                      strokeWidth={active ? 2.25 : 1.75}
                    />
                  </span>
                  {t(link.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 space-y-2 border-t border-white/10 p-2">
          {mounted ? (
            <div
              className="flex h-10 items-center rounded-xl border border-border bg-muted/50 p-0.5 transition-colors hover:border-primary/30"
              role="group"
              aria-label="Idioma"
            >
              <button
                type="button"
                onClick={() => setLanguage("pt")}
                className={cn(
                  "flex h-full flex-1 items-center justify-center rounded-lg transition-all duration-200",
                  language === "pt"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Português"
              >
                <FlagBR size={18} className="rounded-sm" />
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={cn(
                  "flex h-full flex-1 items-center justify-center rounded-lg transition-all duration-200",
                  language === "en"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="English"
              >
                <FlagUS size={18} className="rounded-sm" />
              </button>
            </div>
          ) : (
            <div
              className="h-10 rounded-xl border border-border bg-muted/50"
              aria-hidden
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="h-11 w-full gap-2 rounded-xl border border-border bg-muted/50 text-foreground/90 hover:border-primary/30 hover:bg-muted hover:text-primary"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {isLoggingOut ? t("loggingOut") : t("logout")}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex w-full items-center justify-between gap-2 border-b border-white/[0.08] bg-[#0a0a0a]/90 px-3 py-2.5 backdrop-blur-xl md:hidden print:hidden">
        <Link
          href="/dashboard"
          prefetch
          scroll={false}
          className="flex shrink-0 cursor-pointer items-center transition-opacity hover:opacity-85"
        >
          <Image
            src="/shortname-logo.svg"
            alt="Build Strategy"
            width={120}
            height={60}
            className="h-9 w-auto"
            priority
          />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <BalanceDisplay compact className="min-w-0 shrink" />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            className="h-10 w-10 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-0 text-foreground hover:bg-white/10 hover:text-primary"
          >
            {isMobileMenuOpen ? (
              <X className="h-[18px] w-[18px]" strokeWidth={2} />
            ) : (
              <Menu className="h-[18px] w-[18px]" strokeWidth={2} />
            )}
          </Button>
        </div>
      </header>

      {moneyDisabled ? (
        <div
          className={cn(
            "w-full border-b border-warning/30 bg-warning/10 px-4 py-2",
            DESKTOP_SHELL_PL
          )}
        >
          <p className="text-xs text-warning">
            {moneyDisabledMessage ||
              (mounted
                ? language === "pt"
                  ? "A plataforma está em atualização. Depósitos e saques estão temporariamente desativados."
                  : "The platform is being updated. Deposits and withdrawals are temporarily disabled."
                : "Platform update in progress.")}
          </p>
        </div>
      ) : null}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden">
          <div className="absolute inset-0" onClick={toggleMobileMenu}></div>
        </div>
      )}

      {/* Mobile Menu — hide fully when closed (no clipped balance pill at the viewport edge) */}
      <div
        aria-hidden={!isMobileMenuOpen}
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-72 transform border-l border-white/10 bg-black/95 backdrop-blur-[20px] md:hidden transition-[transform,opacity] duration-200 ease-out",
          isMobileMenuOpen
            ? "pointer-events-auto translate-x-0 opacity-100"
            : "pointer-events-none translate-x-full opacity-0"
        )}
      >
        {/* Mobile Menu Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <span className="text-lg font-bold text-white">
            {t("menu")}
          </span>
          <div className="flex items-center gap-1">
            {mounted ? (
              <UserNotificationBell
                triggerClassName="h-10 w-10 rounded-xl"
                iconClassName="h-5 w-5"
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-xl" aria-hidden />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="p-2 text-foreground hover:bg-muted hover:text-primary"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu Content */}
        <div className="flex h-full flex-col">
          <nav className="flex-1 space-y-2 p-6">
            {/* Main Navigation Items */}
            <div className="space-y-0.5">
              {APP_NAV_ITEMS.map((link) => {
                const IconComponent = link.icon;
                const active = navItemActive(link.href);
                return (
                  <Link
                    key={link.labelKey}
                    href={link.href}
                    prefetch
                    scroll={false}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsMobileMenuOpen(false);
                      navigateTab(link.href);
                    }}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-white/75 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        active ? "bg-primary/15" : "bg-white/[0.06]"
                      )}
                    >
                      <IconComponent
                        className="h-[18px] w-[18px]"
                        strokeWidth={active ? 2.25 : 1.75}
                      />
                    </span>
                    <span className="font-medium">{t(link.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
          {/* Mobile Menu Footer */}
          <div className="border-t border-white/10 p-6">
            {/* Language Switcher for Mobile */}
            <div className="mb-4 flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
              <button
                onClick={() => setLanguage("pt")}
                className={`flex items-center justify-center rounded px-3 py-2 text-sm transition-all ${
                  language === "pt"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                title="Português"
              >
                <FlagBR size={24} className="rounded-sm" />
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`flex items-center justify-center rounded px-3 py-2 text-sm transition-all ${
                  language === "en"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                title="English"
              >
                <FlagUS size={24} className="rounded-sm" />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="group flex w-full items-center justify-center gap-2 rounded-lg p-3 text-destructive transition-all duration-200 hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">
                  {isLoggingOut ? t("loggingOut") : t("logout")}
                </span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
