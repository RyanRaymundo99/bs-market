export default function WithdrawLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-in fade-in duration-200">
      <div className="border-b border-border bg-black/60 backdrop-blur-[20px] h-14" />
      <div className="container mx-auto px-3 sm:px-4 py-6 max-w-7xl">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-10 w-56 rounded-lg bg-muted animate-pulse mx-auto" />
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
