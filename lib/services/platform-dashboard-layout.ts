import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import {
  normalizeOverviewDashboardLayout,
} from "@/lib/platform/overview-widget-registry";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_PLATFORM_OVERVIEW_LAYOUT,
  PLATFORM_OVERVIEW_DASHBOARD_KEY,
  type PlatformDashboardLayout,
} from "@/types/platform-dashboard";

export async function getPlatformOverviewDashboardLayout(): Promise<PlatformDashboardLayout> {
  if (!isSupabaseConfigured()) return { ...DEFAULT_PLATFORM_OVERVIEW_LAYOUT };
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ...DEFAULT_PLATFORM_OVERVIEW_LAYOUT };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...DEFAULT_PLATFORM_OVERVIEW_LAYOUT };

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ...DEFAULT_PLATFORM_OVERVIEW_LAYOUT };

  const { data, error } = await adminResult.client
    .from("platform_admin_dashboard_layouts")
    .select("layout")
    .eq("user_id", user.id)
    .eq("dashboard_key", PLATFORM_OVERVIEW_DASHBOARD_KEY)
    .maybeSingle();

  if (error) {
    console.error("[admin] getPlatformOverviewDashboardLayout", error.message);
    return { ...DEFAULT_PLATFORM_OVERVIEW_LAYOUT };
  }

  return normalizeOverviewDashboardLayout(data?.layout);
}

export async function savePlatformOverviewDashboardLayout(
  userId: string,
  layout: PlatformDashboardLayout
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }

  const normalized = normalizeOverviewDashboardLayout(layout);
  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) {
    return { ok: false, error: adminResult.error };
  }

  const { error } = await adminResult.client
    .from("platform_admin_dashboard_layouts")
    .upsert(
      {
        user_id: userId,
        dashboard_key: PLATFORM_OVERVIEW_DASHBOARD_KEY,
        layout: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,dashboard_key" }
    );

  if (error) {
    console.error("[admin] savePlatformOverviewDashboardLayout", error.message);
    if (
      error.message.includes("platform_admin_dashboard_layouts") &&
      error.message.includes("does not exist")
    ) {
      return {
        ok: false,
        error:
          "Dashboard layouts require migration 20260714200000_platform_admin_dashboard_layouts.sql.",
      };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
