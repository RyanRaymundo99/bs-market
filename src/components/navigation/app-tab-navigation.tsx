"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMobileMenuOpen } from "@/hooks/useMobileMenuOpen";
import { cn } from "@/lib/utils";
import {
  hrefToTabId,
  isMainTabPath,
  APP_TAB_HREF,
  APP_TAB_IDS,
  APP_NAV_ITEMS,
  type AppNavItem,
  type AppTabId,
} from "@/lib/app-tabs/types";
import { scheduleIdleWork } from "@/lib/utils";

type AppTabNavigationContextValue = {
  /** The tab whose content is currently displayed (pre-committed on click). */
  displayTab: AppTabId;
  /** True when the current pathname is one of the 4 main tabs. */
  isMainTabRoute: boolean;
  /** Set of tabs that have been mounted at least once (keeps content alive). */
  visitedTabs: ReadonlySet<AppTabId>;
  /** Navigate to a tab (or sub-route) with startTransition + instant visual feedback. */
  navigateTab: (href: string) => void;
};

const AppTabNavigationContext =
  createContext<AppTabNavigationContextValue | null>(null);

function pathnameToTab(pathname: string): AppTabId {
  return hrefToTabId(pathname) ?? "dashboard";
}

export function AppTabNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard";
  const isMainTabRoute = isMainTabPath(pathname);

  const [displayTab, setDisplayTab] = useState<AppTabId>(() =>
    pathnameToTab(pathname)
  );
  const [visitedTabs, setVisitedTabs] = useState<Set<AppTabId>>(
    () => new Set([pathnameToTab(pathname)])
  );

  // Keep displayTab in sync when navigating via browser back/forward
  useEffect(() => {
    if (isMainTabRoute) {
      const tab = pathnameToTab(pathname);
      setDisplayTab(tab);
      setVisitedTabs((prev) => new Set(prev).add(tab));
    }
  }, [pathname, isMainTabRoute]);

  // Pre-warm ALL tab pages on mount so subsequent taps are instant.
  useEffect(() => {
    for (const tab of APP_TAB_IDS) {
      router.prefetch(APP_TAB_HREF[tab]);
    }
  }, [router]);

  // Mount every main tab in the background so the first tap feels instant.
  useEffect(() => {
    return scheduleIdleWork(() => {
      setVisitedTabs((prev) => {
        const next = new Set(prev);
        for (const tab of APP_TAB_IDS) next.add(tab);
        return next;
      });
      void fetch("/api/user/status", { cache: "no-store" });
    }, 1200);
  }, []);

  // Browser back/forward for tabs switched via pushState.
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      if (isMainTabPath(path)) {
        const tab = pathnameToTab(path);
        setDisplayTab(tab);
        setVisitedTabs((prev) => new Set(prev).add(tab));
        return;
      }
      router.replace(path);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [router]);

  const navigateTab = useCallback(
    (href: string) => {
      const tab = hrefToTabId(href);

      if (!tab) {
        router.push(href);
        return;
      }

      setDisplayTab(tab);
      setVisitedTabs((prev) => new Set(prev).add(tab));

      if (
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 767px)").matches
      ) {
        window.scrollTo({ top: 0, behavior: "auto" });
      }

      if (pathname !== href) {
        window.history.pushState(null, "", href);
      }
    },
    [pathname, router]
  );

  const value = useMemo(
    () => ({
      displayTab,
      isMainTabRoute,
      visitedTabs,
      navigateTab,
    }),
    [displayTab, isMainTabRoute, visitedTabs, navigateTab]
  );

  return (
    <AppTabNavigationContext.Provider value={value}>
      {children}
    </AppTabNavigationContext.Provider>
  );
}

export function useAppTabNavigation() {
  const ctx = useContext(AppTabNavigationContext);
  if (!ctx) {
    throw new Error("useAppTabNavigation must be used within AppTabNavigationProvider");
  }
  return ctx;
}

type MobileNavItem = AppNavItem;

function isMobileNavActive(
  item: MobileNavItem,
  pathname: string,
  displayTab: AppTabId
) {
  if (isMainTabPath(pathname)) {
    return displayTab === item.tab;
  }

  if (item.tab === "trade") {
    return pathname === "/trade" || pathname === "/deposit";
  }

  if (item.tab === "profile") {
    return (
      pathname === "/profile" ||
      pathname.startsWith("/profile/") ||
      pathname.startsWith("/security")
    );
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname() ?? "/dashboard";
  const { t } = useLanguage();
  const mobileMenuOpen = useMobileMenuOpen();
  const { navigateTab, displayTab } = useAppTabNavigation();

  if (mobileMenuOpen) return null;

  return (
    <nav
      aria-label={t("menu")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-[#0a0a0a]/95 backdrop-blur-xl md:hidden print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid grid-cols-4 px-1 pt-1.5 pb-1">
        {APP_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isMobileNavActive(item, pathname, displayTab);

          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => navigateTab(item.href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 touch-manipulation transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:bg-white/5"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                  active ? "bg-primary/12" : "bg-transparent"
                )}
              >
                <Icon
                  className="h-[18px] w-[18px] shrink-0"
                  strokeWidth={active ? 2.25 : 1.75}
                />
              </span>
              <span
                className={cn(
                  "max-w-full truncate text-[11px] leading-none tracking-tight",
                  active ? "font-semibold text-primary" : "font-medium text-muted-foreground"
                )}
              >
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
