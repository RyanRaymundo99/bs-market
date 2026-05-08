import { AuthenticatedChrome } from "@/components/layout/AuthenticatedChrome";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedChrome>{children}</AuthenticatedChrome>;
}