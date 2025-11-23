"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Timer,
  Menu,
  X,
  Home,
  TrendingDown,
  Wallet,
  BarChart3,
  User,
} from "lucide-react";
import CalculatorModal from "./calculator-modal";
import { BalanceDisplay } from "./balance-display";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Trade", href: "/trade", icon: BarChart3 },
  { label: "Withdraw", href: "/withdraw", icon: TrendingDown },
  { label: "Profile", href: "/profile", icon: User },
];

interface NavbarProps {
  isLoggingOut: boolean;
  handleLogout: () => void;
}

export default function NavbarNew({ isLoggingOut, handleLogout }: NavbarProps) {
  const [showCalculator, setShowCalculator] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleCalculatorOpen = () => {
    setShowCalculator(true);
  };

  const handleCalculatorClose = () => {
    setShowCalculator(false);
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
            <Image
              src="/shortname-logo.svg"
              alt="Build Strategy"
              width={100}
              height={50}
              priority
            />
          </div>
          {/* Desktop Navigation */}
          <nav className="flex gap-6 relative">
            {NAV_LINKS.map((link) => {
              const IconComponent = link.icon;
              return (
                <button
                  key={link.label}
                  onClick={() => handleNavigation(link.href)}
                  className="text-white/80 hover:text-brand-300 font-medium transition-colors flex items-center gap-2 group cursor-pointer"
                >
                  <IconComponent className="w-4 h-4 group-hover:text-brand-300 transition-colors" />
                  {link.label}
                </button>
              );
            })}
          </nav>
        </div>
        {/* Header Actions */}
        <div className="flex items-center gap-4">
          {/* Balance Display */}
          <BalanceDisplay />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="gap-2 text-white hover:text-brand-300 hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? "Saindo..." : "Sair"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCalculatorOpen}
            title="Calculadora de Conversão"
            className="text-white hover:text-brand-300 hover:bg-white/10"
          >
            <Timer className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Mobile Header with Logo, Sign Out, and Hamburger */}
      <header className="w-full bg-black/60 border-b border-white/10 backdrop-blur-[20px] items-center justify-between px-4 py-3 sticky top-0 z-50 flex md:hidden">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleNavigation("/dashboard")}
        >
          <Image
            src="/shortname-logo.svg"
            alt="Build Strategy"
            width={120}
            height={60}
            priority
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
            title="Sair"
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
          <span className="text-lg font-bold text-white">Menu</span>
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
              <button
                onClick={() => handleMobileNavigation("/dashboard")}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
              >
                <Home className="w-5 h-5 group-hover:text-brand-300 transition-colors" />
                <span className="font-medium">Dashboard</span>
              </button>

              <button
                onClick={() => handleMobileNavigation("/trade")}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
              >
                <BarChart3 className="w-5 h-5 group-hover:text-brand-300 transition-colors" />
                <span className="font-medium">Trade</span>
              </button>

              <button
                onClick={() => handleMobileNavigation("/withdraw")}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
              >
                <TrendingDown className="w-5 h-5 group-hover:text-brand-300 transition-colors" />
                <span className="font-medium">Withdraw</span>
              </button>

              <button
                onClick={() => handleMobileNavigation("/profile")}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
              >
                <User className="w-5 h-5 group-hover:text-brand-300 transition-colors" />
                <span className="font-medium">Profile</span>
              </button>
            </div>
          </nav>

          {/* Mobile Menu Footer */}
          <div className="p-6 border-t border-white/10">
            {/* Balance Display for Mobile */}
            <div className="mb-4">
              <BalanceDisplay className="w-full justify-center" />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCalculatorOpen}
                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
              >
                <Timer className="w-5 h-5 group-hover:text-brand-300 transition-colors" />
                <span className="font-medium">Calculadora</span>
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">
                  {isLoggingOut ? "Saindo..." : "Sair"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calculator Modal - Rendered outside navbar to avoid z-index conflicts */}
      <CalculatorModal
        isOpen={showCalculator}
        onClose={handleCalculatorClose}
      />
    </>
  );
}
