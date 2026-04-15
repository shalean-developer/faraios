export function GetStartedFallback() {
  return (
    <div className="space-y-6 rounded-3xl border border-border/60 bg-card p-8 shadow-xl">
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-muted" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-16 animate-pulse rounded-full bg-muted"
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Loading form…</p>
    </div>
  );
}
