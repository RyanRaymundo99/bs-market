"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  const { language, setLanguage, t } = useLanguage();

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

    return () => {
      document.body.style.overflow = "unset";
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
      {/* Desktop Header */}
      <header className="w-full bg-black/60 border-b border-white/10 backdrop-blur-[20px] items-center justify-between px-4 md:px-6 sticky top-0 z-50 hidden md:flex">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleNavigation("/dashboard")}
          >
            <img
              src="/shortname-logo.svg"
              alt="Build Strategy"
              width={100}
              height={50}
              className="h-auto"
            />
          </div>
          {/* Desktop Navigation */}
          <nav className="flex gap-6 relative">
            {NAV_LINKS_KEYS.map((link) => {
              const IconComponent = link.icon;
              return (
                <button
                  key={link.key}
                  onClick={() => handleNavigation(link.href)}
                  className="text-foreground/80 hover:text-primary font-medium transition-colors flex items-center gap-2 group cursor-pointer"
                >
                  <IconComponent className="w-4 h-4 group-hover:text-primary transition-colors" />
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
        {/* Header Actions - all pills match balance style (gradient, green border on hover) */}
        <div className="flex items-center gap-2">
          <BalanceDisplay />
          {mounted ? (
            <UserNotificationBell />
          ) : (
            <div className="h-10 w-10 rounded-xl shrink-0" aria-hidden />
          )}
          <div
            className="flex items-center h-10 rounded-xl bg-muted/50 border border-border hover:border-primary/30 p-0.5 transition-colors"
            role="group"
            aria-label="Idioma"
          >
            <button
              type="button"
              onClick={() => setLanguage("pt")}
              className={`h-full rounded-lg px-2.5 flex items-center justify-center transition-all duration-200 ${
                language === "pt"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Português"
            >
              <FlagBR size={18} className="rounded-sm" />
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`h-full rounded-lg px-2.5 flex items-center justify-center transition-all duration-200 ${
                language === "en"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
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
            className="h-10 rounded-xl gap-2 text-foreground/80 hover:text-primary hover:border-primary/30 border border-border bg-muted/50 hover:bg-muted px-3 text-sm font-medium transition-all duration-200"
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
      </header>

      {/* Mobile Header with Logo, Sign Out, and Hamburger */}
      <header className="w-full bg-black/60 border-b border-white/10 backdrop-blur-[20px] items-center justify-between px-4 py-3 sticky top-0 z-50 flex md:hidden">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleNavigation("/dashboard")}
        >
          <img
            src="/shortname-logo.svg"
            alt="Build Strategy"
            width={120}
            height={60}
            className="h-12 w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-foreground hover:text-primary hover:bg-muted p-2"
            title={mounted ? t("logout") : "Sair"}
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="bg-card/60 backdrop-blur-[20px] border border-border text-foreground hover:text-primary hover:bg-muted p-2 rounded-lg"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>
      </header>

      {moneyDisabled ? (
        <div className="w-full border-b border-warning/30 bg-warning/10 px-4 py-2">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden">
          <div className="absolute inset-0" onClick={toggleMobileMenu}></div>
        </div>
      )}

      {/* Mobile Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-72 md:w-80 bg-black/95 border-l border-white/10 backdrop-blur-[20px] z-50 transform transition-transform duration-200 ease-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Mobile Menu Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <span className="text-lg font-bold text-white">
            {mounted ? t("menu") : "Menu"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="text-foreground hover:text-primary hover:bg-muted p-2"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Mobile Menu Content */}
        <div className="flex flex-col h-full">
          <nav className="flex-1 p-6 space-y-2">
            {/* Main Navigation Items */}
            <div className="space-y-1">
              {NAV_LINKS_KEYS.map((link) => {
                const IconComponent = link.icon;
                return (
                  <button
                    key={link.key}
                    onClick={() => handleMobileNavigation(link.href)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
                  >
                    <IconComponent className="w-5 h-5 group-hover:text-brand-300 transition-colors" />
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
          <div className="p-6 border-t border-white/10">
            {/* Notifications + Balance for Mobile */}
            <div className="mb-4 flex items-center justify-center gap-3">
              {mounted ? (
                <UserNotificationBell />
              ) : (
                <div className="h-10 w-10 rounded-xl shrink-0" aria-hidden />
              )}
              <BalanceDisplay className="flex-1 justify-center" />
            </div>

            {/* Language Switcher for Mobile */}
            <div className="mb-4 flex items-center justify-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setLanguage("pt")}
                className={`px-3 py-2 rounded text-sm transition-all flex items-center justify-center ${
                  language === "pt"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title="Português"
              >
                <FlagBR size={24} className="rounded-sm" />
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-3 py-2 rounded text-sm transition-all flex items-center justify-center ${
                  language === "en"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-destructive hover:bg-destructive/10 transition-all duration-200 group"
              >
                <LogOut className="w-5 h-5" />
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
