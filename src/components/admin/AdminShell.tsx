"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Mail,
  Send,
  Webhook,
  ScrollText,
  Shield,
  LogOut,
  ChevronRight,
  Menu,
  Database,
  Search,
  Settings,
} from "lucide-react";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";
import { AdminSettingsDialog } from "@/components/admin/AdminSettingsDialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/admin/NotificationBell";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";

const SIDEBAR_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/transactions", label: "Transações", icon: ScrollText },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/kyc", label: "KYC", icon: FileText },
  { href: "/admin/notification-center", label: "Notificações", icon: Mail },
  { href: "/admin/sent-emails", label: "Emails enviados", icon: Send },
  { href: "/admin/webhook-logs", label: "Webhooks", icon: Webhook },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText },
  { href: "/admin/backup", label: "Backup / Restore", icon: Database },
];

function NavLinks({
  pathname,
  onLinkClick,
  className,
}: {
  pathname: string;
  onLinkClick?: () => void;
  className?: string;
}) {
  return (
    <nav className={cn("flex flex-col space-y-0.5", className)}>
      {SIDEBAR_LINKS.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight
              className={cn(
                "h-4 w-4 flex-shrink-0",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useAdminSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);

  const themeClass = settings.theme === "bright" ? "admin-theme-bright" : "";
  const primaryClass = `admin-primary-${settings.primaryColor}`;
  const secondaryClass = `admin-secondary-${settings.secondaryColor}`;
  const buttonStyleClass = `admin-button-${settings.buttonStyle}`;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = () => {
    document.cookie =
      "better-auth.session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/admin/login");
  };

  return (
    <div
      className={cn(
        "admin-theme flex min-h-screen bg-background text-foreground",
        themeClass,
        primaryClass,
        secondaryClass,
        buttonStyleClass
      )}
    >
      {/* Sidebar - fixed left, desktop-first */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-60 flex-shrink-0",
          "border-r border-border bg-card backdrop-blur",
          "hidden lg:flex lg:flex-col",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-semibold text-foreground">Admin</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks pathname={pathname} />
        </div>
      </aside>

      {/* Main area: top bar + content */}
      <div className="flex flex-1 flex-col lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Abrir menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="start"
                className="w-56 border-border bg-card p-2 lg:hidden"
              >
                {SIDEBAR_LINKS.map(({ href, label, icon: Icon }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href="/admin"
              className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
            >
              BS Market Admin
            </Link>
            <AdminCommandPalette
              open={commandPaletteOpen}
              onOpenChange={setCommandPaletteOpen}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCommandPalette}
                  className="h-9 border-border text-muted-foreground hover:bg-muted hover:text-foreground ml-2"
                >
                  <Search className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Buscar...</span>
                  <kbd className="hidden sm:inline ml-1.5 rounded border border-border bg-muted px-1 text-[10px] text-muted-foreground">
                    ⌘K
                  </kbd>
                </Button>
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setSettingsOpen(true)}
              aria-label="Aparência e layout"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <NotificationBell className="text-foreground hover:text-primary" />
            <AdminSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Conta
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-card border-border"
              >
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer focus:bg-muted focus:text-foreground"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
