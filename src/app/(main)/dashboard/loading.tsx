import { DESKTOP_SHELL_PL } from "@/constants/layout-shell";

export default function DashboardSegmentLoading() {
  return (
    <div
      className={`flex min-h-[30vh] flex-col items-center justify-center gap-3 px-4 pt-6 ${DESKTOP_SHELL_PL}`}
      role="status"
      aria-busy
      aria-label="Loading"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
