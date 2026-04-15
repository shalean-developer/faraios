"use server";

import { revalidatePath } from "next/cache";

import {
  adminStatusToDb,
  isCurrentUserPlatformAdmin,
} from "@/lib/services/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { createClient } from "@/lib/supabase/server";
import type { AdminPipelineStatus } from "@/types/admin";

export type AdminMutationResult =
  | { ok: true }
  | { ok: false; error: string };

export async function adminUpdateCompanyStatus(
  companyId: string,
  status: AdminPipelineStatus
): Promise<AdminMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ build_status: adminStatusToDb(status) })
    .eq("id", companyId);

  if (error) {
    console.error("[admin] adminUpdateCompanyStatus", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function adminUpdateAssignedDeveloper(
  companyId: string,
  developerName: string | null
): Promise<AdminMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ assigned_developer: developerName })
    .eq("id", companyId);

  if (error) {
    console.error("[admin] adminUpdateAssignedDeveloper", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}
