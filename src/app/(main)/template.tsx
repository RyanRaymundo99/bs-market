"use client";

import { usePathname } from "next/navigation";
import { isMainTabPath } from "@/lib/app-tabs/types";

export default function MainTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // On main tab routes the tab shell handles instant switching.
  // Skip the fade-in so there's no double-animation.
  // On sub-routes (/withdraw/detail, /security, etc.) keep the subtle fade.
  if (isMainTabPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <div key={pathname} className="motion-reduce:animate-none animate-in fade-in duration-200">
      {children}
    </div>
  );
}