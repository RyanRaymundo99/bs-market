import type { LucideIcon } from "lucide-react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleUser,
  LayoutGrid,
} from "lucide-react";

/** The 4 primary authenticated tabs in the main shell. */
export type AppTabId = "dashboard" | "trade" | "withdraw" | "profile";

export const APP_TAB_IDS: AppTabId[] = [
  "dashboard",
  "trade",
  "withdraw",
  "profile",
];

export const APP_TAB_HREF: Record<AppTabId, string> = {
  dashboard: "/dashboard",
  trade: "/trade",
  withdraw: "/withdraw",
  profile: "/profile",
};

export type AppNavLabelKey = "dashboard" | "trade" | "withdraw" | "profile";

export type AppNavItem = {
  tab: AppTabId;
  href: string;
  icon: LucideIcon;
  labelKey: AppNavLabelKey;
};

/** Shared nav items for sidebar + mobile bottom bar. */
export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    tab: "dashboard",
    href: APP_TAB_HREF.dashboard,
    icon: LayoutGrid,
    labelKey: "dashboard",
  },
  {
    tab: "trade",
    href: APP_TAB_HREF.trade,
    icon: ArrowDownLeft,
    labelKey: "trade",
  },
  {
    tab: "withdraw",
    href: APP_TAB_HREF.withdraw,
    icon: ArrowUpRight,
    labelKey: "withdraw",
  },
  {
    tab: "profile",
    href: APP_TAB_HREF.profile,
    icon: CircleUser,
    labelKey: "profile",
  },
];

/** Returns the AppTabId for a given href, or null for sub-routes. */
export function hrefToTabId(href: string): AppTabId | null {
  const entry = Object.entries(APP_TAB_HREF).find(
    ([, path]) => path === href
  );
  return entry ? (entry[0] as AppTabId) : null;
}

/** True when the current pathname is exactly one of the 4 main tabs. */
export function isMainTabPath(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname === "/trade" ||
    pathname === "/withdraw" ||
    pathname === "/profile"
  );
}
