export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-in fade-in duration-200">
      <div className="border-b border-border bg-black/60 backdrop-blur-[20px] h-14" />
      <div className="container mx-auto px-4 py-6">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse mb-8" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-80 rounded-xl bg-muted animate-pulse" />
          <div className="h-80 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
