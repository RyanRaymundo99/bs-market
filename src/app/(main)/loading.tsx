import { DESKTOP_SHELL_PL } from "@/constants/layout-shell";

export default function MainSegmentLoading() {
  return (
    <div
      className={`flex min-h-[45vh] flex-col items-center justify-center gap-4 px-4 pt-10 ${DESKTOP_SHELL_PL}`}
      role="status"
      aria-busy
      aria-label="Carregando"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Carregando…</p>
    </div>
  );
}