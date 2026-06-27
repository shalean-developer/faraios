import type { AdminPlatformOverviewMetrics } from "@/types/admin";

export const PLATFORM_OVERVIEW_SNAPSHOT_TTL_MS = 5 * 60_000;

export function isPlatformOverviewSnapshotFresh(capturedAt: string): boolean {
  const capturedMs = Date.parse(capturedAt);
  if (Number.isNaN(capturedMs)) return false;
  return Date.now() - capturedMs <= PLATFORM_OVERVIEW_SNAPSHOT_TTL_MS;
}

export function parsePlatformOverviewSnapshotMetrics(
  value: unknown
): AdminPlatformOverviewMetrics | null {
  if (!value || typeof value !== "object") return null;
  const metrics = value as AdminPlatformOverviewMetrics;
  if (
    !metrics.businesses ||
    !metrics.users ||
    !metrics.revenue ||
    !metrics.infrastructure ||
    !metrics.marketplace
  ) {
    return null;
  }
  return metrics;
}
