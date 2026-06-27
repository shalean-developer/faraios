import type { AdminPlatformOverviewMetrics } from "@/types/admin";

const CACHE_TTL_MS = 60_000;

let cached: AdminPlatformOverviewMetrics | null = null;
let cachedAt = 0;

export function getCachedPlatformOverviewMetrics(): AdminPlatformOverviewMetrics | null {
  if (!cached) return null;
  if (Date.now() - cachedAt > CACHE_TTL_MS) {
    cached = null;
    return null;
  }
  return cached;
}

export function setCachedPlatformOverviewMetrics(
  metrics: AdminPlatformOverviewMetrics
): void {
  cached = metrics;
  cachedAt = Date.now();
}

export function invalidatePlatformOverviewCache(): void {
  cached = null;
  cachedAt = 0;
}
