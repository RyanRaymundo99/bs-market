"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Menu,
  X,
  Home,
  TrendingDown,
  BarChart3,
  User,
} from "lucide-react";
import { BalanceDisplay } from "./balance-display";
import { UserNotificationBell } from "./user-notification-bell";
import { useLanguage } from "@/contexts/LanguageContext";
import { FlagBR } from "@/components/icons/FlagBR";
import { FlagUS } from "@/components/icons/FlagUS";
import { syncMobileMenuToBody } from "@/hooks/useMobileMenuOpen";
import { cn } from "@/lib/utils";

/** Left padding for main page wrappers so content clears the fixed desktop sidebar (`w-56`). */
export const DESKTOP_SHELL_PL = "md:pl-56";

const NAV_LINKS_KEYS = [
  { key: "dashboard", href: "/dashboard", icon: Home },
  { key: "trade", href: "/trade", icon: BarChart3 },
  { key: "withdraw", href: "/withdraw", icon: TrendingDown },
  { key: "profile", href: "/profile", icon: User },
];

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

  const navItemActive = (href: string) => {
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

  const handleNavigation = (href: string) => {
    if (href.startsWith("/")) {
      window.location.href = window.location.origin + href;
    } else {
      window.location.href = window.location.origin + "/" + href;
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileNavigation = (href: string) => {
    handleNavigation(href);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside
        aria-label={mounted ? t("menu") : "Menu"}
        className="fixed left-0 top-0 z-50 hidden h-dvh w-56 flex-col border-r border-white/10 bg-black/95 backdrop-blur-xl print:hidden md:flex"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-1 px-2 pt-3">
          <div className="mb-3 flex w-full shrink-0 items-center gap-1.5 px-0.5">
            <div
              className="min-w-0 flex-1 cursor-pointer py-0.5 transition-opacity hover:opacity-80"
              onClick={() => handleNavigation("/dashboard")}
            >
              <Image
                src="/shortname-logo.svg"
                alt="Build Strategy"
                width={560}
                height={224}
                className="block h-14 w-auto max-w-full origin-left scale-[1.8] object-contain object-left"
                priority
              />
            </div>
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

          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-2 pr-0.5">
            {NAV_LINKS_KEYS.map((link) => {
              const IconComponent = link.icon;
              const active = navItemActive(link.href);
              return (
                <button
                  key={link.key}
                  type="button"
                  onClick={() => handleNavigation(link.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-3 text-left text-base font-medium transition-colors",
                    active
                      ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(34,197,94,0.2)]"
                      : "text-foreground/85 hover:bg-white/5 hover:text-primary"
                  )}
                >
                  <IconComponent
                    className={cn(
                      "h-6 w-6 shrink-0",
                      active ? "text-primary" : "opacity-90"
                    )}
                  />
                  {mounted
                    ? t(link.key)
                    : link.key === "trade"
                      ? "Depositar"
                      : link.key === "dashboard"
                        ? "Dashboard"
                        : link.key === "withdraw"
                          ? "Sacar"
                          : link.key === "profile"
                            ? "Perfil"
                            : link.key}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 space-y-2 border-t border-white/10 p-2">
          <BalanceDisplay className="w-full [&>div]:w-full [&>div]:justify-center" />
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="h-11 w-full gap-2 rounded-xl border border-border bg-muted/50 text-foreground/90 hover:border-primary/30 hover:bg-muted hover:text-primary"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {mounted
              ? isLoggingOut
                ? t("loggingOut")
                : t("logout")
              : isLoggingOut
                ? "Saindo..."
                : "Sair"}
          </Button>
        </div>
      </aside>

      {/* Mobile Header with Logo, Sign Out, and Hamburger */}
      <header className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur-[20px] md:hidden print:hidden">
        <div
          className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
          onClick={() => handleNavigation("/dashboard")}
        >
          <Image
            src="/shortname-logo.svg"
            alt="Build Strategy"
            width={120}
            height={60}
            className="h-12 w-auto"
            priority
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-2 text-foreground hover:bg-muted hover:text-primary"
            title={mounted ? t("logout") : "Sair"}
          >
            <LogOut className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="rounded-lg border border-border bg-card/60 p-2 text-foreground backdrop-blur-[20px] hover:bg-muted hover:text-primary"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
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

      {/* Mobile Menu */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-72 transform border-l border-white/10 bg-black/95 backdrop-blur-[20px] transition-transform duration-200 ease-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Mobile Menu Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <span className="text-lg font-bold text-white">
            {mounted ? t("menu") : "Menu"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="p-2 text-foreground hover:bg-muted hover:text-primary"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Mobile Menu Content */}
        <div className="flex h-full flex-col">
          <nav className="flex-1 space-y-2 p-6">
            {/* Main Navigation Items */}
            <div className="space-y-1">
              {NAV_LINKS_KEYS.map((link) => {
                const IconComponent = link.icon;
                return (
                  <button
                    key={link.key}
                    onClick={() => handleMobileNavigation(link.href)}
                    className="group flex w-full items-center gap-3 rounded-lg p-3 text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white"
                  >
                    <IconComponent className="h-5 w-5 transition-colors group-hover:text-brand-300" />
                    <span className="font-medium">
                      {mounted
                        ? t(link.key)
                        : link.key === "trade"
                          ? "Depositar"
                          : link.key === "dashboard"
                            ? "Dashboard"
                            : link.key === "withdraw"
                              ? "Sacar"
                              : link.key === "profile"
                                ? "Perfil"
                                : link.key}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Mobile Menu Footer */}
          <div className="border-t border-white/10 p-6">
            {/* Notifications + Balance for Mobile */}
            <div className="mb-4 flex items-center justify-center gap-3">
              {mounted ? (
                <UserNotificationBell />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-xl" aria-hidden />
              )}
              <BalanceDisplay className="flex-1 justify-center" />
            </div>

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
                  {mounted
                    ? isLoggingOut
                      ? t("loggingOut")
                      : t("logout")
                    : isLoggingOut
                      ? "Saindo..."
                      : "Sair"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
