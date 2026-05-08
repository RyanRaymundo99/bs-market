export default function ActivityLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-in fade-in duration-200">
      <div className="border-b border-border bg-black/60 backdrop-blur-[20px] h-14" />
      <div className="container mx-auto px-3 sm:px-4 py-6 max-w-4xl">
        <div className="h-8 w-40 rounded-lg bg-muted animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
