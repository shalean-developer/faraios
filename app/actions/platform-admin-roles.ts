"use server";

import { revalidatePath } from "next/cache";

import {
  assignPlatformAdminRole,
  getWorkspaceEntryOptions,
} from "@/lib/services/platform-admin-roles";
import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { PlatformRoleId } from "@/lib/platform/platform-role-definitions";

export async function fetchWorkspaceEntryOptions() {
  if (!isSupabaseConfigured()) return null;
  if (!(await isCurrentUserPlatformAdmin())) return null;
  return getWorkspaceEntryOptions();
}

export async function updatePlatformAdminRole(input: {
  userId: string;
  roleId: PlatformRoleId;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }

  const result = await assignPlatformAdminRole(input);
  if (result.ok) {
    revalidatePath("/admin/settings");
  }
  return result;
}
