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
  revalidatePath("/admin/team");
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
  revalidatePath("/admin/team");
  return { ok: true };
}

export async function adminAssignProjectsToMember(
  memberName: string,
  projectIds: string[]
): Promise<AdminMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }

  const normalizedName = memberName.trim();
  if (!normalizedName) {
    return { ok: false, error: "Member name is required." };
  }
  const uniqueIds = Array.from(
    new Set(projectIds.map((id) => id.trim()).filter(Boolean))
  );
  if (uniqueIds.length === 0) {
    return { ok: false, error: "At least one project is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ assigned_developer: normalizedName })
    .in("id", uniqueIds);

  if (error) {
    console.error("[admin] adminAssignProjectsToMember", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/team");
  return { ok: true };
}

export async function adminAddPlatformAdminByEmail(
  email: string
): Promise<AdminMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, error: "Email is required." };
  }

  const supabase = await createClient();
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (userError) {
    console.error("[admin] adminAddPlatformAdminByEmail user lookup", userError.message);
    return { ok: false, error: userError.message };
  }
  if (!userRow?.id) {
    return { ok: false, error: "No user found with that email." };
  }

  const { error } = await supabase
    .from("platform_admins")
    .upsert({ user_id: userRow.id }, { onConflict: "user_id" });

  if (error) {
    console.error("[admin] adminAddPlatformAdminByEmail upsert", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function adminRemovePlatformAdmin(
  userId: string
): Promise<AdminMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id && user.id === userId) {
    return { ok: false, error: "You cannot remove your own admin access." };
  }

  const { error } = await supabase
    .from("platform_admins")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("[admin] adminRemovePlatformAdmin", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  return { ok: true };
}
