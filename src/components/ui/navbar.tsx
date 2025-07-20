"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Timer, ChevronDown, LogOut } from "lucide-react";
import CalculatorModal from "./calculator-modal";

// Import translations type for type safety
const NAV_LINKS = [
  { label: "Início", href: "/dashboard" },
  { label: "Negociar", href: "#", dropdown: true },
  { label: "Depositar", href: "/depositar" },
  { label: "Sacar", href: "/sacar" },
  { label: "Pagar", href: "/pagar" },
  { label: "Portfólio", href: "/portfolio" },
  { label: "Transações", href: "/extrato" },
];

const NEGOCIAR_OPTIONS = [
  {
    title: "Negociação básica",
    desc: "Negocie criptoativos com agilidade e segurança",
    icon: null,
    href: "/negociacao-basica",
  },
  {
    title: "Negociação avançada",
    desc: "Negocie criptoativos com as ferramentas mais avançadas do mercado",
    icon: null,
    href: "/negociacao-avancada",
  },
  // {
  //   title: "Negociação maximizada",
  //   desc: "Maximize suas negociações de criptoativos e aumente o potencial de retorno",
  //   icon: null,
  //   href: "/negociacao-maxima",
  // },
  {
    title: "OTC",
    desc: "Negocie altos valores com liquidez, agilidade e segurança",
    icon: null,
    href: "/otc",
  },
];

interface NavbarProps {
  isLoggingOut: boolean;
  handleLogout: () => void;
}

export default function Navbar({ isLoggingOut, handleLogout }: NavbarProps) {
  const [showCalculator, setShowCalculator] = useState(false);

  const handleNavigation = (href: string) => {
    if (href.startsWith("/")) {
      window.location.href = window.location.origin + href;
    } else {
      window.location.href = window.location.origin + "/" + href;
    }
  };

  return (
    <header className="w-full bg-black/60 border-b border-white/10 backdrop-blur-[20px] flex items-center justify-between px-6 py-3 relative z-50">
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleNavigation("/dashboard")}
        >
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
            <span className="text-sm font-bold text-white">📈</span>
          </div>
          <span className="text-lg font-bold text-white">Build Strategy</span>
        </div>
        {/* Navigation */}
        <nav className="hidden md:flex gap-6 relative">
          {NAV_LINKS.map((link) =>
            link.dropdown ? (
              <DropdownMenu key={link.label}>
                <DropdownMenuTrigger asChild>
                  <button className="text-white/80 hover:text-blue-300 font-medium transition-colors flex items-center gap-1 focus:outline-none">
                    {link.label} <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-80 bg-black/90 border border-white/20 backdrop-blur-[20px] relative overflow-hidden"
                  sideOffset={8}
                >
                  {/* Mirror effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

                  <div className="relative z-10 p-2">
                    {NEGOCIAR_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.title}
                        className="flex gap-3 items-start hover:bg-white/10 rounded-lg p-3 cursor-pointer transition-colors focus:bg-white/10 focus:text-white"
                        onClick={() => handleNavigation(opt.href)}
                      >
                        {opt.icon && <span>{opt.icon}</span>}
                        <div>
                          <div className="font-semibold text-base text-white">
                            {opt.title}
                          </div>
                          <div className="text-sm text-gray-300">
                            {opt.desc}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-white/80 hover:text-blue-300 font-medium transition-colors"
              >
                {link.label}
              </a>
            )
          )}
        </nav>
      </div>
      {/* Header Actions */}
      <div className="flex items-center gap-4">
        {/* Sign Out */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="gap-2 text-white hover:text-blue-300 hover:bg-white/10"
        >
          <LogOut className="w-4 h-4" />
          {isLoggingOut ? "Saindo..." : "Sair"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCalculator(true)}
          title="Calculadora"
          className="text-white hover:text-blue-300 hover:bg-white/10"
        >
          <Timer className="w-4 h-4" />
        </Button>
      </div>
      {/* Calculator Modal */}
      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />
    </header>
  );
}
