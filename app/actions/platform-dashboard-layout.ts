"use server";

import { revalidatePath } from "next/cache";

import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import { normalizeOverviewDashboardLayout } from "@/lib/platform/overview-widget-registry";
import { savePlatformOverviewDashboardLayout } from "@/lib/services/platform-dashboard-layout";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_PLATFORM_OVERVIEW_LAYOUT,
  type PlatformDashboardLayout,
} from "@/types/platform-dashboard";

export type PlatformDashboardLayoutActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requirePlatformAdmin(): Promise<
  PlatformDashboardLayoutActionResult | null
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }
  return null;
}

export async function savePlatformOverviewDashboardLayoutAction(
  layout: PlatformDashboardLayout
): Promise<PlatformDashboardLayoutActionResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const normalized = normalizeOverviewDashboardLayout(layout);
  const result = await savePlatformOverviewDashboardLayout(user.id, normalized);
  if (!result.ok) return result;

  revalidatePath("/admin");
  return { ok: true };
}

export async function resetPlatformOverviewDashboardLayoutAction(): Promise<PlatformDashboardLayoutActionResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const result = await savePlatformOverviewDashboardLayout(user.id, {
    ...DEFAULT_PLATFORM_OVERVIEW_LAYOUT,
  });
  if (!result.ok) return result;

  revalidatePath("/admin");
  return { ok: true };
}
