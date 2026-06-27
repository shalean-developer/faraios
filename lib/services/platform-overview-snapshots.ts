import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import {
  isPlatformOverviewSnapshotFresh,
  parsePlatformOverviewSnapshotMetrics,
} from "@/lib/services/platform-overview-snapshot-utils";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AdminPlatformOverviewMetrics } from "@/types/admin";

async function resolveSnapshotClient() {
  const adminClient = tryCreateAdminClient();
  if (adminClient.ok) {
    return adminClient.client;
  }
  return createClient();
}

export async function getLatestPlatformOverviewSnapshot(): Promise<AdminPlatformOverviewMetrics | null> {
  if (!isSupabaseConfigured()) return null;
  if (!(await isCurrentUserPlatformAdmin())) return null;

  const supabase = await resolveSnapshotClient();
  const { data, error } = await supabase
    .from("platform_overview_metrics_snapshots")
    .select("metrics,captured_at")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[admin] getLatestPlatformOverviewSnapshot", error.message);
    return null;
  }

  if (!data?.captured_at || !isPlatformOverviewSnapshotFresh(data.captured_at)) {
    return null;
  }

  return parsePlatformOverviewSnapshotMetrics(data.metrics);
}

export async function savePlatformOverviewSnapshot(
  metrics: AdminPlatformOverviewMetrics
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (!(await isCurrentUserPlatformAdmin())) return;

  const supabase = await resolveSnapshotClient();
  const { error } = await supabase.from("platform_overview_metrics_snapshots").insert({
    metrics,
  });

  if (error) {
    console.error("[admin] savePlatformOverviewSnapshot", error.message);
  }
}
