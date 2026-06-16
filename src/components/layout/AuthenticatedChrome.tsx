"use client";

import { useCallback, useState } from "react";
import NavbarNew from "@/components/ui/navbar-new";
import { GlobalKYCBanner } from "@/components/GlobalKYCBanner";
import { MobileBottomNav } from "@/components/navigation/app-tab-navigation";
import { handleLogout as performLogout } from "@/lib/auth-utils";

/** Fixed shell for logged-in product routes; does not remount on child page changes. */
export function AuthenticatedChrome({ children }: { children: React.ReactNode }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await performLogout();
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  return (
    <>
      <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
      <GlobalKYCBanner />
      {children}
      <MobileBottomNav />
    </>
  );
}