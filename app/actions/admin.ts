"use server";

import { revalidatePath } from "next/cache";

import {
  adminStatusToDb,
  isCurrentUserPlatformAdmin,
} from "@/lib/services/admin";
import { DEFAULT_PROGRESS_BY_STATUS } from "@/lib/data/project-stages";
import { buildStatusToProjectStatus } from "@/lib/data/project-stages";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { createClient } from "@/lib/supabase/server";
import { slugifyBusinessName } from "@/lib/slug";
import type {
  AdminNotificationPreferences,
  AdminPipelineStatus,
} from "@/types/admin";

export type AdminMutationResult =
  | { ok: true }
  | { ok: false; error: string };

async function requirePlatformAdmin(): Promise<AdminMutationResult | null> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }
  return null;
}

function revalidateAdminSurfaces(options?: {
  companySlug?: string | null;
  companyId?: string | null;
}) {
  revalidatePath("/admin");
  revalidatePath("/admin/pipeline");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/team");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/analytics");
  revalidatePath("/admin/activity");
  revalidatePath("/admin/settings");
  revalidatePath("/marketplace");
  if (options?.companySlug) {
    revalidatePath(`/marketplace/${options.companySlug}`);
  }
  if (options?.companyId) {
    revalidatePath(`/admin/pipeline/${options.companyId}`);
  }
  if (options?.companySlug) {
    revalidatePath(`/${options.companySlug}/project`);
    revalidatePath(`/${options.companySlug}/dashboard`);
  }
}

export async function adminUpdateCompanyStatus(
  companyId: string,
  status: AdminPipelineStatus
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const dbBuildStatus = adminStatusToDb(status);
  const projectStatus = buildStatusToProjectStatus(dbBuildStatus);
  const progress = DEFAULT_PROGRESS_BY_STATUS[projectStatus];

  const { error } = await admin
    .from("companies")
    .update({ build_status: dbBuildStatus })
    .eq("id", companyId);

  if (error) {
    console.error("[admin] adminUpdateCompanyStatus", error.message);
    return { ok: false, error: error.message };
  }

  const { data: company } = await admin
    .from("companies")
    .select("slug, name")
    .eq("id", companyId)
    .maybeSingle();

  const { data: existingProject } = await admin
    .from("projects")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();

  if (existingProject?.id) {
    const { error: projectError } = await admin
      .from("projects")
      .update({
        status: projectStatus,
        progress,
        current_stage: projectStatus,
      })
      .eq("company_id", companyId);

    if (projectError) {
      console.error(
        "[admin] adminUpdateCompanyStatus project sync",
        projectError.message
      );
      return { ok: false, error: projectError.message };
    }
  } else if (company?.name) {
    const { error: insertError } = await admin.from("projects").insert({
      company_id: companyId,
      name: `${company.name} Website Build`,
      status: projectStatus,
      progress,
      current_stage: projectStatus,
    });

    if (insertError) {
      console.error(
        "[admin] adminUpdateCompanyStatus project insert",
        insertError.message
      );
      return { ok: false, error: insertError.message };
    }
  }

  revalidateAdminSurfaces({
    companySlug: company?.slug,
    companyId,
  });
  return { ok: true };
}

export async function adminUpdateAssignedDeveloper(
  companyId: string,
  developerName: string | null
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const { error } = await admin
    .from("companies")
    .update({ assigned_developer: developerName })
    .eq("id", companyId);

  if (error) {
    console.error("[admin] adminUpdateAssignedDeveloper", error.message);
    return { ok: false, error: error.message };
  }

  revalidateAdminSurfaces();
  return { ok: true };
}

export async function adminAssignProjectsToMember(
  memberName: string,
  projectIds: string[]
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

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

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const { error } = await admin
    .from("companies")
    .update({ assigned_developer: normalizedName })
    .in("id", uniqueIds);

  if (error) {
    console.error("[admin] adminAssignProjectsToMember", error.message);
    return { ok: false, error: error.message };
  }

  revalidateAdminSurfaces();
  return { ok: true };
}

export async function adminUpdateMarketplaceListing(
  companyId: string,
  input: {
    listed: boolean;
    summary?: string | null;
    location?: string | null;
    featured?: boolean;
  }
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const { data: company, error } = await admin
    .from("companies")
    .update({
      listed_in_marketplace: input.listed,
      marketplace_summary: input.summary?.trim() || null,
      marketplace_location: input.location?.trim() || null,
      marketplace_featured: input.featured ?? false,
    })
    .eq("id", companyId)
    .select("slug")
    .maybeSingle();

  if (error) {
    console.error("[admin] adminUpdateMarketplaceListing", error.message);
    return { ok: false, error: error.message };
  }

  revalidateAdminSurfaces({ companyId, companySlug: company?.slug });
  revalidatePath("/examples");
  return { ok: true };
}

export async function adminAddPlatformAdminByEmail(
  email: string
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, error: "Email is required." };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const { data: userRow, error: userError } = await admin
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

  const { error } = await admin
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
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id && user.id === userId) {
    return { ok: false, error: "You cannot remove your own admin access." };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const { error } = await admin
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

async function uniqueCompanySlug(
  admin: Exclude<
    ReturnType<typeof tryCreateAdminClient>,
    { ok: false; error: string }
  >["client"],
  baseName: string
): Promise<string> {
  const base = slugifyBusinessName(baseName);
  let candidate = base;
  let suffix = 2;
  while (true) {
    const { data } = await admin
      .from("companies")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function adminUpdatePlatformSettings(input: {
  companyName: string;
  platformName: string;
}): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const companyName = input.companyName.trim();
  const platformName = input.platformName.trim();
  if (!companyName || !platformName) {
    return { ok: false, error: "Company name and platform name are required." };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const { error } = await admin.from("platform_settings").upsert(
    {
      id: 1,
      company_name: companyName,
      platform_name: platformName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[admin] adminUpdatePlatformSettings", error.message);
    if (
      error.message.includes("platform_settings") &&
      error.message.includes("does not exist")
    ) {
      return {
        ok: false,
        error:
          "Platform settings require the admin workspace migration. Apply 20260623140000_admin_workspace_features.sql in Supabase.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function adminUpdateNotificationPreferences(
  preferences: AdminNotificationPreferences
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const { error } = await admin
    .from("users")
    .update({ admin_preferences: preferences })
    .eq("id", user.id);

  if (error) {
    console.error("[admin] adminUpdateNotificationPreferences", error.message);
    if (
      error.message.includes("admin_preferences") &&
      error.message.includes("does not exist")
    ) {
      return {
        ok: false,
        error:
          "Notification preferences require the admin workspace migration. Apply 20260623140000_admin_workspace_features.sql in Supabase.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function adminCreateClientCompany(input: {
  businessName: string;
  contactName: string;
  contactEmail: string;
  phone?: string | null;
  location?: string | null;
}): Promise<AdminMutationResult & { companyId?: string }> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const businessName = input.businessName.trim();
  const contactName = input.contactName.trim();
  const contactEmail = input.contactEmail.trim().toLowerCase();
  if (!businessName || !contactName || !contactEmail) {
    return {
      ok: false,
      error: "Business name, contact name, and email are required.",
    };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;
  const slug = await uniqueCompanySlug(admin, businessName);

  const insertPayload = {
    name: businessName,
    slug,
    primary_contact_name: contactName,
    primary_contact_email: contactEmail,
    contact_phone: input.phone?.trim() || null,
    contact_location: input.location?.trim() || null,
    build_status: "pending" as const,
  };

  let { data, error } = await admin
    .from("companies")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error?.message.includes("contact_phone") || error?.message.includes("contact_location")) {
    const { contact_phone: _p, contact_location: _l, ...basePayload } = insertPayload;
    ({ data, error } = await admin
      .from("companies")
      .insert(basePayload)
      .select("id")
      .single());
  }

  if (error) {
    console.error("[admin] adminCreateClientCompany", error.message);
    return { ok: false, error: error.message };
  }
  if (!data?.id) {
    return { ok: false, error: "Client was created but no company id was returned." };
  }

  revalidateAdminSurfaces({ companySlug: slug, companyId: data.id });
  return { ok: true, companyId: data.id };
}

export async function adminUpdateClientCompany(
  companyId: string,
  input: {
    businessName: string;
    contactName: string;
    contactEmail: string;
    phone?: string | null;
    location?: string | null;
  }
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const businessName = input.businessName.trim();
  const contactName = input.contactName.trim();
  const contactEmail = input.contactEmail.trim().toLowerCase();
  if (!businessName || !contactName || !contactEmail) {
    return {
      ok: false,
      error: "Business name, contact name, and email are required.",
    };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const updatePayload = {
    name: businessName,
    primary_contact_name: contactName,
    primary_contact_email: contactEmail,
    contact_phone: input.phone?.trim() || null,
    contact_location: input.location?.trim() || null,
  };

  let { data: company, error } = await admin
    .from("companies")
    .update(updatePayload)
    .eq("id", companyId)
    .select("slug")
    .maybeSingle();

  if (error?.message.includes("contact_phone") || error?.message.includes("contact_location")) {
    const { contact_phone: _p, contact_location: _l, ...basePayload } = updatePayload;
    ({ data: company, error } = await admin
      .from("companies")
      .update(basePayload)
      .eq("id", companyId)
      .select("slug")
      .maybeSingle());
  }

  if (error) {
    console.error("[admin] adminUpdateClientCompany", error.message);
    return { ok: false, error: error.message };
  }

  revalidateAdminSurfaces({ companyId, companySlug: company?.slug });
  return { ok: true };
}

export async function adminSaveClientNote(
  companyId: string,
  note: string
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const trimmed = note.trim();
  if (!trimmed) {
    return { ok: false, error: "Note cannot be empty." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authorName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    user?.email?.split("@")[0] ??
    "Admin";

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const now = new Date().toISOString();
  const { error: noteError } = await admin.from("admin_company_notes").insert({
    company_id: companyId,
    author_user_id: user?.id ?? null,
    author_name: authorName,
    body: trimmed,
  });

  if (noteError) {
    console.error("[admin] adminSaveClientNote insert", noteError.message);
  }

  const { error: companyError } = await admin
    .from("companies")
    .update({
      admin_client_note: trimmed,
      admin_client_note_updated_at: now,
    })
    .eq("id", companyId);

  if (companyError) {
    console.error("[admin] adminSaveClientNote company", companyError.message);
    if (noteError) {
      return {
        ok: false,
        error:
          noteError.message.includes("admin_company_notes") ||
          noteError.message.includes("does not exist")
            ? "Client notes require the admin workspace migration. Apply 20260623140000_admin_workspace_features.sql in Supabase."
            : noteError.message,
      };
    }
    return { ok: false, error: companyError.message };
  }

  revalidateAdminSurfaces({ companyId });
  return { ok: true };
}

export async function adminAddProjectNote(
  companyId: string,
  body: string
): Promise<AdminMutationResult> {
  return adminSaveClientNote(companyId, body);
}
