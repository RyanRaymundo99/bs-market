"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Mail,
  Send,
  Webhook,
  ScrollText,
  Database,
  Search,
  ArrowRight,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/kyc", label: "KYC", icon: FileText },
  { href: "/admin/notification-center", label: "Notificações", icon: Mail },
  { href: "/admin/sent-emails", label: "Emails enviados", icon: Send },
  { href: "/admin/webhook-logs", label: "Webhooks", icon: Webhook },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText },
  { href: "/admin/backup", label: "Backup / Restore", icon: Database },
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

interface UserResult {
  id: string;
  name: string | null;
  email: string | null;
}

type ResultItem =
  | { type: "nav"; item: NavItem }
  | { type: "user"; user: UserResult };

function fuzzyMatch(query: string, text: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  let i = 0;
  for (let j = 0; j < t.length && i < q.length; j++) {
    if (t[j] === q[i]) i++;
  }
  return i === q.length;
}

export function AdminCommandPalette({
  open,
  onOpenChange,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredNav = NAV_ITEMS.filter((item) =>
    fuzzyMatch(query, item.label)
  );
  const allResults: ResultItem[] = [
    ...filteredNav.map((item) => ({ type: "nav" as const, item })),
    ...(query.trim().length >= 2
      ? userResults.map((user) => ({ type: "user" as const, user }))
      : []),
  ];
  const totalCount = allResults.length;

  const searchUsers = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setUserResults([]);
      return;
    }
    setLoadingUsers(true);
    try {
      const res = await fetch(
        `/api/admin/users?search=${encodeURIComponent(q)}&limit=8`
      );
      if (!res.ok) {
        setUserResults([]);
        return;
      }
      const data = await res.json();
      const list = (data.users ?? []).map((u: { id: string; name: string | null; email: string | null }) => ({
        id: u.id,
        name: u.name ?? null,
        email: u.email ?? null,
      }));
      setUserResults(list);
    } catch {
      setUserResults([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchUsers(query), 250);
    return () => clearTimeout(t);
  }, [query, searchUsers]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setUserResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex((i) => Math.min(Math.max(0, i), Math.max(0, totalCount - 1)));
  }, [totalCount]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const selected = el.querySelector("[data-selected]");
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = (item: ResultItem) => {
    if (item.type === "nav") {
      router.push(item.item.href);
    } else {
      router.push(`/admin/users/${item.user.id}`);
    }
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, totalCount - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && totalCount > 0) {
      e.preventDefault();
      handleSelect(allResults[selectedIndex]);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="admin-theme max-w-xl border-border bg-card p-0 gap-0 overflow-hidden"
          onPointerDownOutside={() => onOpenChange(false)}
          onEscapeKeyDown={() => onOpenChange(false)}
        >
          <DialogTitle className="sr-only">Buscar no Admin</DialogTitle>
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar páginas, usuários..."
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-base"
              aria-label="Buscar"
            />
            <kbd className="hidden sm:inline-flex h-6 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-xs text-muted-foreground">
              esc
            </kbd>
          </div>
          <div
            ref={listRef}
            className="max-h-[min(60vh,400px)] overflow-y-auto py-2"
          >
            {loadingUsers && query.trim().length >= 2 ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : allResults.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {query.trim().length >= 2
                  ? "Nenhum resultado encontrado."
                  : "Digite para buscar páginas ou usuários."}
              </div>
            ) : (
              <ul className="space-y-0.5" role="listbox">
                {filteredNav.length > 0 && (
                  <li className="px-3 py-1.5">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Páginas
                    </span>
                  </li>
                )}
                {filteredNav.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <li key={item.href}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        data-selected={isSelected ? true : undefined}
                        onClick={() =>
                          handleSelect({ type: "nav", item })
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                          isSelected
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1">{item.label}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 opacity-50" />
                      </button>
                    </li>
                  );
                })}
                {userResults.length > 0 && query.trim().length >= 2 && (
                  <li className="px-3 py-1.5 pt-3">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Usuários
                    </span>
                  </li>
                )}
                {query.trim().length >= 2 &&
                  userResults.map((user, idx) => {
                  const isSelected = filteredNav.length + idx === selectedIndex;
                  return (
                    <li key={user.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        data-selected={isSelected ? true : undefined}
                        onClick={() =>
                          handleSelect({ type: "user", user })
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                          isSelected
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {user.name || "Sem nome"}
                          </p>
                          {user.email && (
                            <p className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 opacity-50" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <span>
              <kbd className="rounded border border-border bg-muted px-1">↑↓</kbd> navegar
              {" · "}
              <kbd className="rounded border border-border bg-muted px-1">↵</kbd> abrir
            </span>
            <span>
              <kbd className="rounded border border-border bg-muted px-1">⌘K</kbd> abrir
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
