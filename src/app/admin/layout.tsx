"use client";

import { usePathname } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { AdminSettingsProvider } from "@/contexts/AdminSettingsContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AdminSettingsProvider>
      <AdminShell>{children}</AdminShell>
    </AdminSettingsProvider>
  );
}
