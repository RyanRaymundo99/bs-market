export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-in fade-in duration-200">
      <div className="border-b border-border bg-black/60 backdrop-blur-[20px] h-14" />
      <div className="container mx-auto px-3 sm:px-4 py-6 max-w-7xl space-y-6">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
