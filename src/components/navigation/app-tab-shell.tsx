"use client";

import { APP_TAB_IDS, type AppTabId } from "@/lib/app-tabs/types";
import { useAppTabNavigation } from "./app-tab-navigation";

// Import client-component pages directly.
// dashboard/page.tsx uses next/headers (server API), so we import the
// underlying client component instead of the page file.
import Dashboard from "@/components/pages/Dashboard";

// These three pages are 100% "use client" — import them directly for
// zero-overhead (no dynamic() wrapper) so the keep-alive shell works immediately.
import TradePage from "@/app/(main)/trade/page";
import WithdrawPage from "@/app/(main)/withdraw/page";
import ProfilePage from "@/app/(main)/profile/page";

/**
 * Renders one <section> per tab. Active tab is visible; inactive tabs are
 * display:none but remain mounted — so switching back is instant (no server
 * round-trip, no component remount, no loading spinner).
 *
 * Only tabs that have been visited at least once are mounted in the DOM.
 * This avoids loading all 4 pages up-front on first render.
 */
function AppTabPanel({
  tab,
  children,
}: {
  tab: AppTabId;
  children: React.ReactNode;
}) {
  const { displayTab, visitedTabs } = useAppTabNavigation();
  const active = displayTab === tab;
  const mounted = visitedTabs.has(tab);

  if (!mounted) return null;

  return (
    <section
      id={`app-tab-${tab}`}
      className={active ? "block" : "hidden"}
      aria-hidden={!active}
      data-app-tab={tab}
    >
      {children}
    </section>
  );
}

const TAB_PAGES: Record<AppTabId, React.ReactNode> = {
  dashboard: <Dashboard />,
  trade: <TradePage />,
  withdraw: <WithdrawPage />,
  profile: <ProfilePage />,
};

/**
 * Drop-in wrapper for the (main) layout children.
 * When on a main tab route: renders the pre-mounted tab panels.
 * When on a sub-route (/security, /transaction/[id], etc.): renders children normally.
 */
export function AppTabShell({ children }: { children: React.ReactNode }) {
  const { isMainTabRoute } = useAppTabNavigation();

  if (!isMainTabRoute) {
    // Sub-route: render children directly (template.tsx fade-in still applies)
    return <>{children}</>;
  }

  return (
    <>
      {APP_TAB_IDS.map((tab) => (
        <AppTabPanel key={tab} tab={tab}>
          {TAB_PAGES[tab]}
        </AppTabPanel>
      ))}
      {/* Keep Next.js routing happy — the real page is hidden visually */}
      <div className="sr-only" aria-hidden>
        {children}
      </div>
    </>
  );
}
