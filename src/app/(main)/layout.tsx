import { AuthenticatedChrome } from "@/components/layout/AuthenticatedChrome";
import { AppTabNavigationProvider } from "@/components/navigation/app-tab-navigation";
import { AppTabShell } from "@/components/navigation/app-tab-shell";
import { MobileScrollSnapBack } from "@/components/navigation/mobile-scroll-snap-back";
import { BalanceProvider } from "@/contexts/BalanceContext";

/** Fixed shell for all authenticated (main) routes. */
export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BalanceProvider>
      <AppTabNavigationProvider>
        <AuthenticatedChrome>
          <MobileScrollSnapBack />
          <AppTabShell>{children}</AppTabShell>
        </AuthenticatedChrome>
      </AppTabNavigationProvider>
    </BalanceProvider>
  );
}