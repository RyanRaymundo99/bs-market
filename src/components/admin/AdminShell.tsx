"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/admin/NotificationBell";
import { cn } from "@/lib/utils";

const SIDEBAR_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/kyc", label: "KYC", icon: FileText },
  { href: "/admin/notification-center", label: "Notificações", icon: Mail },
  { href: "/admin/sent-emails", label: "Emails enviados", icon: Send },
  { href: "/admin/webhook-logs", label: "Webhooks", icon: Webhook },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText },
  { href: "/admin/backup", label: "Backup / Restore", icon: Database },
] as const;

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
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                : "text-gray-400 hover:bg-gray-800 hover:text-white",
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight
              className={cn(
                "h-4 w-4 flex-shrink-0",
                isActive ? "text-blue-400" : "text-gray-500",
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    document.cookie =
      "better-auth.session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Sidebar - fixed left, desktop-first */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-60 flex-shrink-0",
          "border-r border-gray-800 bg-gray-900/95 backdrop-blur",
          "hidden lg:flex lg:flex-col",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-gray-800 px-4">
          <Shield className="h-6 w-6 text-blue-400" />
          <span className="font-semibold text-white">Admin</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks pathname={pathname} />
        </div>
      </aside>

      {/* Main area: top bar + content */}
      <div className="flex flex-1 flex-col lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900/95 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-gray-400 hover:text-white hover:bg-gray-800"
                  aria-label="Abrir menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="start"
                className="w-56 border-gray-700 bg-gray-900 p-2 lg:hidden"
              >
                {SIDEBAR_LINKS.map(({ href, label, icon: Icon }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer"
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
              className="text-lg font-semibold text-white hover:text-blue-400 transition-colors"
            >
              BS Market Admin
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell className="text-white hover:text-blue-400" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Conta
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-gray-900 border-gray-700"
              >
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer focus:bg-gray-800 focus:text-white"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
