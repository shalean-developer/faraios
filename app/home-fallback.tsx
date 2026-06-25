import { Sparkles } from "lucide-react";

export function HomeFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-amber-50/50 px-6">
      <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-emerald-600 shadow-md">
        <Sparkles className="h-6 w-6 text-white" />
      </div>
      <div className="h-4 w-48 animate-pulse rounded-full bg-slate-200" />
      <div className="h-3 w-72 max-w-full animate-pulse rounded-full bg-slate-100" />
      <p className="text-sm text-slate-500">Loading FaraiOS…</p>
    </div>
  );
}
