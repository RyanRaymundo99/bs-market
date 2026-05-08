"use client";

import { usePathname } from "next/navigation";

export default function MainTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="motion-reduce:animate-none animate-in fade-in duration-200">
      {children}
    </div>
  );
}