import { AuthenticatedChrome } from "@/components/layout/AuthenticatedChrome";
import { AppTabNavigationProvider } from "@/components/navigation/app-tab-navigation";
import { AppTabShell } from "@/components/navigation/app-tab-shell";
import { MobileScrollSnapBack } from "@/components/navigation/mobile-scroll-snap-back";

/** Fixed shell for all authenticated (main) routes. */
export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppTabNavigationProvider>
      <AuthenticatedChrome>
        <MobileScrollSnapBack />
        <AppTabShell>{children}</AppTabShell>
      </AuthenticatedChrome>
    </AppTabNavigationProvider>
  );
}