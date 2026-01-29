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
  const [depositsDisabled, setDepositsDisabled] = useState(false);
  const [withdrawalsDisabled, setWithdrawalsDisabled] = useState(false);
  const [depositsDisabledMessage, setDepositsDisabledMessage] = useState<string>("");
  const [withdrawalsDisabledMessage, setWithdrawalsDisabledMessage] = useState<string>("");
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
          setDepositsDisabled(Boolean(data.depositsDisabled));
          setWithdrawalsDisabled(Boolean(data.withdrawalsDisabled));
          setDepositsDisabledMessage(String(data.depositsDisabledMessage || ""));
          setWithdrawalsDisabledMessage(String(data.withdrawalsDisabledMessage || ""));
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
                  className="text-white/80 hover:text-brand-300 font-medium transition-colors flex items-center gap-2 group cursor-pointer"
                >
                  <IconComponent className="w-4 h-4 group-hover:text-brand-300 transition-colors" />
                  {mounted ? t(link.key) : (link.key === "trade" ? "Depositar" : link.key === "dashboard" ? "Dashboard" : link.key === "withdraw" ? "Sacar" : link.key === "profile" ? "Perfil" : link.key)}
                </button>
              );
            })}
          </nav>
        </div>
        {/* Header Actions */}
        <div className="flex items-center gap-4">
          {/* Balance Display */}
          <BalanceDisplay />

          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setLanguage("pt")}
              className={`px-2 py-1 rounded text-sm transition-all flex items-center justify-center ${
                language === "pt"
                  ? "bg-brand-500 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              title="Português"
            >
              <FlagBR size={20} className="rounded-sm" />
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`px-2 py-1 rounded text-sm transition-all flex items-center justify-center ${
                language === "en"
                  ? "bg-brand-500 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              title="English"
            >
              <FlagUS size={20} className="rounded-sm" />
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="gap-2 text-white hover:text-brand-300 hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
            {mounted ? (isLoggingOut ? t("loggingOut") : t("logout")) : (isLoggingOut ? "Saindo..." : "Sair")}
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
            className="text-white hover:text-blue-300 hover:bg-white/10 p-2"
            title={mounted ? t("logout") : "Sair"}
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="bg-black/60 backdrop-blur-[20px] border border-white/10 text-white hover:text-blue-300 hover:bg-black/80 p-2 rounded-lg"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>
      </header>

      {(depositsDisabled || withdrawalsDisabled) ? (
        <div className="w-full border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2">
          <p className="text-xs text-yellow-200">
            {depositsDisabled && withdrawalsDisabled
              ? depositsDisabledMessage || withdrawalsDisabledMessage ||
                (mounted
                  ? language === "pt"
                    ? "A plataforma está em atualização. Depósitos e saques estão temporariamente desativados."
                    : "The platform is being updated. Deposits and withdrawals are temporarily disabled."
                  : "Platform update in progress.")
              : depositsDisabled
              ? depositsDisabledMessage ||
                (mounted
                  ? language === "pt"
                    ? "Depósitos estão temporariamente desativados."
                    : "Deposits are temporarily disabled."
                  : "Deposits disabled.")
              : withdrawalsDisabledMessage ||
                (mounted
                  ? language === "pt"
                    ? "Saques estão temporariamente desativados."
                    : "Withdrawals are temporarily disabled."
                  : "Withdrawals disabled.")}
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
          <span className="text-lg font-bold text-white">{mounted ? t("menu") : "Menu"}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="text-white hover:text-blue-300 hover:bg-white/10 p-2"
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
                    <span className="font-medium">{mounted ? t(link.key) : (link.key === "trade" ? "Depositar" : link.key === "dashboard" ? "Dashboard" : link.key === "withdraw" ? "Sacar" : link.key === "profile" ? "Perfil" : link.key)}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Mobile Menu Footer */}
          <div className="p-6 border-t border-white/10">
            {/* Balance Display for Mobile */}
            <div className="mb-4">
              <BalanceDisplay className="w-full justify-center" />
            </div>

            {/* Language Switcher for Mobile */}
            <div className="mb-4 flex items-center justify-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setLanguage("pt")}
                className={`px-3 py-2 rounded text-sm transition-all flex items-center justify-center ${
                  language === "pt"
                    ? "bg-brand-500 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
                title="Português"
              >
                <FlagBR size={24} className="rounded-sm" />
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-3 py-2 rounded text-sm transition-all flex items-center justify-center ${
                  language === "en"
                    ? "bg-brand-500 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
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
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">
                  {mounted ? (isLoggingOut ? t("loggingOut") : t("logout")) : (isLoggingOut ? "Saindo..." : "Sair")}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
