import { Zap } from "lucide-react";

export function HomeFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6">
      <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md">
        <Zap className="h-6 w-6 text-white" />
      </div>
      <div className="h-4 w-48 animate-pulse rounded-full bg-gray-200" />
      <div className="h-3 w-72 max-w-full animate-pulse rounded-full bg-gray-100" />
      <p className="text-sm text-gray-500">Loading FaraiOS…</p>
    </div>
  );
}
