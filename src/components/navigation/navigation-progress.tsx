"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal top highlight on route change (client navigations only).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const id = window.setTimeout(() => setActive(false), 450);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden print:hidden motion-reduce:hidden"
      aria-hidden
    >
      <div
        className={cn(
          "h-full w-full bg-primary transition-opacity duration-200 ease-out",
          active ? "opacity-70" : "opacity-0"
        )}
      />
    </div>
  );
}