"use server";

import { revalidatePath } from "next/cache";

import { clearFailedPlatformEmailLogs } from "@/lib/platform/email-log";
import { logPlatformAuditEvent } from "@/lib/platform/audit-log";
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
import { syncHostingSubscriptionFromWebsiteDomain } from "@/lib/services/hosting-domain";
import { normalizeDomain } from "@/lib/services/website-domains";
import { syncDomainSettingsCustomDomain } from "@/lib/website-builder/service";
import type {
  AdminFeatureRequestPriority,
  AdminFeatureRequestStatus,
  AdminNotificationPreferences,
  AdminPipelineStatus,
  AdminSupportTicketCategory,
  AdminSupportTicketPriority,
  AdminSupportTicketStatus,
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

async function auditAdminAction(
  input: Parameters<typeof logPlatformAuditEvent>[0]
): Promise<void> {
  try {
    await logPlatformAuditEvent(input);
  } catch (error) {
    console.error("[admin] auditAdminAction", error);
  }
}

function revalidateAdminSurfaces(options?: {
  companySlug?: string | null;
  companyId?: string | null;
}) {
  revalidatePath("/admin");
  revalidatePath("/admin/businesses");
  revalidatePath("/admin/pipeline");
  revalidatePath("/admin/team");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/analytics");
  revalidatePath("/admin/activity");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/revenue");
  revalidatePath("/admin/businesses");
  revalidatePath("/admin/support");
  revalidatePath("/admin/feature-requests");
  revalidatePath("/admin/domains");
  revalidatePath("/admin/emails");
  revalidatePath("/marketplace");
  if (options?.companySlug) {
    revalidatePath(`/marketplace/${options.companySlug}`);
  }
  if (options?.companyId) {
    revalidatePath(`/admin/pipeline/${options.companyId}`);
  }
  if (options?.companySlug) {
    revalidatePath(`/${options.companySlug}/dashboard/project`);
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
  await auditAdminAction({
    action: "pipeline.status_updated",
    targetType: "company",
    targetId: companyId,
    targetLabel: company?.name ?? null,
    metadata: { status },
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
  await auditAdminAction({
    action: "pipeline.developer_assigned",
    targetType: "company",
    targetId: companyId,
    metadata: { developerName },
  });
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
  await auditAdminAction({
    action: "pipeline.projects_assigned",
    targetType: "team_member",
    targetLabel: normalizedName,
    metadata: { projectIds: uniqueIds },
  });
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
  await auditAdminAction({
    action: "marketplace.listing_updated",
    targetType: "company",
    targetId: companyId,
    metadata: input,
  });
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
    .upsert({ user_id: userRow.id, role_id: "platform_admin" }, { onConflict: "user_id" });

  if (error) {
    console.error("[admin] adminAddPlatformAdminByEmail upsert", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  await auditAdminAction({
    action: "platform_admin.added",
    targetType: "user",
    targetId: userRow.id,
    targetLabel: normalizedEmail,
  });
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
  await auditAdminAction({
    action: "platform_admin.removed",
    targetType: "user",
    targetId: userId,
  });
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
  await auditAdminAction({
    action: "settings.platform_updated",
    targetType: "platform_settings",
    metadata: { companyName, platformName },
  });
  return { ok: true };
}

export async function adminUpdateSearchConsoleIntegration(input: {
  clientId: string;
  clientSecret?: string;
}): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const clientId = input.clientId.trim();
  if (!clientId) {
    return { ok: false, error: "Client ID is required." };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const { data: existing } = await admin
    .from("platform_settings")
    .select("integration_settings")
    .eq("id", 1)
    .maybeSingle();

  const currentSettings =
    (existing?.integration_settings as Record<string, unknown>) ?? {};
  const currentGsc =
    (currentSettings.google_search_console as Record<string, unknown>) ?? {};

  const clientSecret = input.clientSecret?.trim() || String(currentGsc.client_secret ?? "").trim();
  if (!clientSecret) {
    return { ok: false, error: "Client secret is required." };
  }

  const integration_settings = {
    ...currentSettings,
    google_search_console: {
      client_id: clientId,
      client_secret: clientSecret,
    },
  };

  const { data: existingRow } = await admin
    .from("platform_settings")
    .select("id")
    .eq("id", 1)
    .maybeSingle();

  if (existingRow) {
    const { error } = await admin
      .from("platform_settings")
      .update({
        integration_settings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      console.error("[admin] adminUpdateSearchConsoleIntegration", error.message);
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await admin.from("platform_settings").insert({
      id: 1,
      company_name: "Farai Creative Studio",
      platform_name: "FaraiOS",
      integration_settings,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[admin] adminUpdateSearchConsoleIntegration insert", error.message);
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/seo");
  await auditAdminAction({
    action: "settings.integrations.gsc_updated",
    targetType: "platform_settings",
    metadata: { clientId },
  });
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
  await auditAdminAction({
    action: "business.created",
    targetType: "company",
    targetId: data.id,
    targetLabel: businessName,
    metadata: { contactEmail, slug },
  });
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
  await auditAdminAction({
    action: "business.updated",
    targetType: "company",
    targetId: companyId,
    targetLabel: businessName,
    metadata: { contactEmail },
  });
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
  await auditAdminAction({
    action: "business.note_added",
    targetType: "company",
    targetId: companyId,
    metadata: { noteLength: trimmed.length },
  });
  return { ok: true };
}

export async function adminAddProjectNote(
  companyId: string,
  body: string
): Promise<AdminMutationResult> {
  return adminSaveClientNote(companyId, body);
}

export async function adminSuspendBusiness(
  companyId: string
): Promise<AdminMutationResult> {
  return adminSetBusinessPlatformStatus(companyId, "suspend");
}

export async function adminActivateBusiness(
  companyId: string
): Promise<AdminMutationResult> {
  return adminSetBusinessPlatformStatus(companyId, "activate");
}

export async function adminSetSetupFeeWaived(
  companyId: string,
  waived: boolean
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const trimmedId = companyId.trim();
  if (!trimmedId) {
    return { ok: false, error: "Business id is required." };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("name, setup_fee_paid_at")
    .eq("id", trimmedId)
    .maybeSingle();

  if (companyError) {
    console.error("[admin] adminSetSetupFeeWaived company", companyError.message);
    return { ok: false, error: companyError.message };
  }

  if (!company) {
    return { ok: false, error: "Business not found." };
  }

  if (waived && company.setup_fee_paid_at) {
    return { ok: false, error: "Setup fee has already been collected for this business." };
  }

  const { error } = await admin
    .from("companies")
    .update({ setup_fee_waived: waived })
    .eq("id", trimmedId);

  if (error) {
    console.error("[admin] adminSetSetupFeeWaived update", error.message);
    return { ok: false, error: error.message };
  }

  revalidateAdminSurfaces({ companyId: trimmedId });
  revalidatePath(`/admin/businesses/${trimmedId}`);
  await auditAdminAction({
    action: waived ? "business.setup_fee_waived" : "business.setup_fee_restored",
    targetType: "company",
    targetId: trimmedId,
    targetLabel: company.name ?? null,
  });
  return { ok: true };
}

export async function adminUpdateWorkspaceSetupFeeEnabled(
  enabled: boolean
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const { setWorkspaceSetupFeeEnabled } = await import(
    "@/lib/billing/platform-billing-settings"
  );
  const result = await setWorkspaceSetupFeeEnabled(enabled);
  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings?tab=billing");
  await auditAdminAction({
    action: enabled
      ? "billing.workspace_setup_fee_enabled"
      : "billing.workspace_setup_fee_disabled",
    targetType: "platform_settings",
    targetId: "1",
    targetLabel: "Workspace setup fee",
  });
  return { ok: true };
}

async function adminSetBusinessPlatformStatus(
  companyId: string,
  action: "suspend" | "activate"
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const trimmedId = companyId.trim();
  if (!trimmedId) {
    return { ok: false, error: "Business id is required." };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const subscriptionStatus = action === "suspend" ? "suspended" : "active";
  const hostingStatus = action === "suspend" ? "suspended" : "active";

  const { error: companyError } = await admin
    .from("companies")
    .update({ subscription_status: subscriptionStatus })
    .eq("id", trimmedId);

  if (companyError) {
    console.error("[admin] adminSetBusinessPlatformStatus company", companyError.message);
    return { ok: false, error: companyError.message };
  }

  const { data: existingSub } = await admin
    .from("hosting_subscriptions")
    .select("id")
    .eq("company_id", trimmedId)
    .maybeSingle();

  if (existingSub?.id) {
    const { error: hostingError } = await admin
      .from("hosting_subscriptions")
      .update({ status: hostingStatus, updated_at: new Date().toISOString() })
      .eq("company_id", trimmedId);

    if (hostingError) {
      console.error("[admin] adminSetBusinessPlatformStatus hosting", hostingError.message);
      return { ok: false, error: hostingError.message };
    }
  }

  const { data: company } = await admin
    .from("companies")
    .select("name")
    .eq("id", trimmedId)
    .maybeSingle();

  revalidateAdminSurfaces({ companyId: trimmedId });
  revalidatePath(`/admin/businesses/${trimmedId}`);
  await auditAdminAction({
    action: action === "suspend" ? "business.suspended" : "business.activated",
    targetType: "company",
    targetId: trimmedId,
    targetLabel: company?.name ?? null,
  });
  return { ok: true };
}

function revalidateSupportSurfaces(ticketId?: string) {
  revalidatePath("/admin/support");
  if (ticketId) {
    revalidatePath(`/admin/support/${ticketId}`);
  }
}

function revalidateFeatureRequestSurfaces() {
  revalidatePath("/admin/feature-requests");
}

export async function adminCreateSupportTicket(input: {
  subject: string;
  description: string;
  companyId?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  priority?: AdminSupportTicketPriority;
  category?: AdminSupportTicketCategory;
}): Promise<AdminMutationResult & { ticketId?: string }> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const subject = input.subject.trim();
  const description = input.description.trim();
  if (!subject || !description) {
    return { ok: false, error: "Subject and description are required." };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const { data, error } = await admin
    .from("platform_support_tickets")
    .insert({
      company_id: input.companyId?.trim() || null,
      subject,
      description,
      priority: input.priority ?? "medium",
      category: input.category ?? "general",
      requester_name: input.requesterName?.trim() || null,
      requester_email: input.requesterEmail?.trim().toLowerCase() || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[admin] adminCreateSupportTicket", error.message);
    return { ok: false, error: error.message };
  }

  revalidateSupportSurfaces(data.id);
  await auditAdminAction({
    action: "support.ticket_created",
    targetType: "support_ticket",
    targetId: data.id,
    targetLabel: subject,
  });
  return { ok: true, ticketId: data.id };
}

export async function adminUpdateSupportTicket(
  ticketId: string,
  input: {
    status?: AdminSupportTicketStatus;
    priority?: AdminSupportTicketPriority;
    assignedTo?: string | null;
  }
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const trimmedId = ticketId.trim();
  if (!trimmedId) {
    return { ok: false, error: "Ticket id is required." };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = { updated_at: now };
  if (input.status) {
    updatePayload.status = input.status;
    if (input.status === "resolved" || input.status === "closed") {
      updatePayload.resolved_at = now;
    }
  }
  if (input.priority) updatePayload.priority = input.priority;
  if (input.assignedTo !== undefined) {
    updatePayload.assigned_to = input.assignedTo?.trim() || null;
  }

  const { data, error } = await admin
    .from("platform_support_tickets")
    .update(updatePayload)
    .eq("id", trimmedId)
    .select("subject")
    .maybeSingle();

  if (error) {
    console.error("[admin] adminUpdateSupportTicket", error.message);
    return { ok: false, error: error.message };
  }

  revalidateSupportSurfaces(trimmedId);
  await auditAdminAction({
    action: "support.ticket_updated",
    targetType: "support_ticket",
    targetId: trimmedId,
    targetLabel: data?.subject ?? null,
    metadata: input,
  });
  return { ok: true };
}

export async function adminReplySupportTicket(
  ticketId: string,
  body: string,
  options?: { isInternal?: boolean }
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const trimmedId = ticketId.trim();
  const trimmedBody = body.trim();
  if (!trimmedId || !trimmedBody) {
    return { ok: false, error: "Ticket id and message are required." };
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

  const { error: messageError } = await admin.from("platform_support_messages").insert({
    ticket_id: trimmedId,
    author_user_id: user?.id ?? null,
    author_name: authorName,
    author_email: user?.email ?? null,
    body: trimmedBody,
    is_internal: options?.isInternal ?? false,
  });

  if (messageError) {
    console.error("[admin] adminReplySupportTicket message", messageError.message);
    return { ok: false, error: messageError.message };
  }

  const { error: ticketError } = await admin
    .from("platform_support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", trimmedId);

  if (ticketError) {
    console.error("[admin] adminReplySupportTicket ticket touch", ticketError.message);
  }

  revalidateSupportSurfaces(trimmedId);
  await auditAdminAction({
    action: "support.ticket_replied",
    targetType: "support_ticket",
    targetId: trimmedId,
    metadata: { isInternal: options?.isInternal ?? false },
  });
  return { ok: true };
}

export async function adminCreateFeatureRequest(input: {
  title: string;
  description: string;
  companyId?: string | null;
  submittedByName?: string | null;
  submittedByEmail?: string | null;
  category?: string | null;
  priority?: AdminFeatureRequestPriority;
}): Promise<AdminMutationResult & { requestId?: string }> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || !description) {
    return { ok: false, error: "Title and description are required." };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const { data, error } = await admin
    .from("platform_feature_requests")
    .insert({
      company_id: input.companyId?.trim() || null,
      title,
      description,
      category: input.category?.trim() || null,
      priority: input.priority ?? "medium",
      submitted_by_name: input.submittedByName?.trim() || null,
      submitted_by_email: input.submittedByEmail?.trim().toLowerCase() || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[admin] adminCreateFeatureRequest", error.message);
    return { ok: false, error: error.message };
  }

  revalidateFeatureRequestSurfaces();
  await auditAdminAction({
    action: "feature_request.created",
    targetType: "feature_request",
    targetId: data.id,
    targetLabel: title,
  });
  return { ok: true, requestId: data.id };
}

export async function adminUpdateFeatureRequest(
  requestId: string,
  input: {
    status?: AdminFeatureRequestStatus;
    priority?: AdminFeatureRequestPriority;
    adminNotes?: string | null;
    voteCount?: number;
  }
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const trimmedId = requestId.trim();
  if (!trimmedId) {
    return { ok: false, error: "Request id is required." };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.status) updatePayload.status = input.status;
  if (input.priority) updatePayload.priority = input.priority;
  if (input.adminNotes !== undefined) {
    updatePayload.admin_notes = input.adminNotes?.trim() || null;
  }
  if (input.voteCount !== undefined && input.voteCount >= 0) {
    updatePayload.vote_count = input.voteCount;
  }

  const { data, error } = await admin
    .from("platform_feature_requests")
    .update(updatePayload)
    .eq("id", trimmedId)
    .select("title")
    .maybeSingle();

  if (error) {
    console.error("[admin] adminUpdateFeatureRequest", error.message);
    return { ok: false, error: error.message };
  }

  revalidateFeatureRequestSurfaces();
  await auditAdminAction({
    action: "feature_request.updated",
    targetType: "feature_request",
    targetId: trimmedId,
    targetLabel: data?.title ?? null,
    metadata: input,
  });
  return { ok: true };
}

export async function adminUpdateWebsiteDomainAction(input: {
  domainId: string;
  domain: string;
  domainType: "primary" | "subdomain" | "preview";
  verificationStatus: "pending" | "verified" | "failed";
  sslStatus: "not_started" | "pending" | "active" | "failed";
}): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const domainId = input.domainId.trim();
  const normalized = normalizeDomain(input.domain);
  if (!domainId) return { ok: false, error: "Domain id is required." };
  if (!normalized || !normalized.includes(".")) {
    return { ok: false, error: "Enter a valid domain." };
  }

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const { data: existing, error: fetchError } = await admin
    .from("website_domains")
    .select("id, company_id, website_id, domain, verification_status, ssl_status")
    .eq("id", domainId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }
  if (!existing) {
    return { ok: false, error: "Domain not found." };
  }

  const { data: conflict } = await admin
    .from("website_domains")
    .select("id")
    .ilike("domain", normalized)
    .neq("id", domainId)
    .maybeSingle();

  if (conflict) {
    return { ok: false, error: "This domain is already connected to another workspace." };
  }

  const now = new Date().toISOString();
  const previousDomain = existing.domain as string;
  const companyId = existing.company_id as string;
  const websiteId = (existing.website_id as string | null) ?? null;

  const { error: updateError } = await admin
    .from("website_domains")
    .update({
      domain: normalized,
      domain_type: input.domainType,
      verification_status: input.verificationStatus,
      ssl_status: input.sslStatus,
      updated_at: now,
    })
    .eq("id", domainId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  if (websiteId) {
    await admin
      .from("websites")
      .update({ domain: normalized })
      .eq("id", websiteId)
      .eq("client_id", companyId);

    await syncDomainSettingsCustomDomain({
      websiteId,
      companyId,
      customDomain: normalized,
      customDomainStatus: input.verificationStatus,
    });
  }

  if (previousDomain !== normalized) {
    await admin
      .from("connected_websites")
      .update({
        primary_domain: normalized,
        updated_at: now,
      })
      .eq("company_id", companyId)
      .ilike("primary_domain", previousDomain);
  }

  await syncHostingSubscriptionFromWebsiteDomain(
    companyId,
    normalized,
    input.verificationStatus,
    input.sslStatus
  );

  revalidatePath("/admin/domains");
  await auditAdminAction({
    action: "website_domain.updated",
    targetType: "website_domain",
    targetId: domainId,
    targetLabel: normalized,
    metadata: {
      domainType: input.domainType,
      verificationStatus: input.verificationStatus,
      sslStatus: input.sslStatus,
    },
  });

  return { ok: true };
}

export async function adminDeleteWebsiteDomainAction(
  domainId: string
): Promise<AdminMutationResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const trimmedId = domainId.trim();
  if (!trimmedId) return { ok: false, error: "Domain id is required." };

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return { ok: false, error: adminResult.error };
  const admin = adminResult.client;

  const { data: existing, error: fetchError } = await admin
    .from("website_domains")
    .select("id, company_id, website_id, domain")
    .eq("id", trimmedId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }
  if (!existing) {
    return { ok: false, error: "Domain not found." };
  }

  const companyId = existing.company_id as string;
  const websiteId = (existing.website_id as string | null) ?? null;
  const domain = existing.domain as string;
  const now = new Date().toISOString();

  const { error: deleteError } = await admin
    .from("website_domains")
    .delete()
    .eq("id", trimmedId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  if (websiteId) {
    const { data: website } = await admin
      .from("websites")
      .select("domain, subdomain")
      .eq("id", websiteId)
      .eq("client_id", companyId)
      .maybeSingle();

    if (website && normalizeDomain((website.domain as string | null) ?? "") === normalizeDomain(domain)) {
      await admin
        .from("websites")
        .update({ domain: null })
        .eq("id", websiteId)
        .eq("client_id", companyId);

      await syncDomainSettingsCustomDomain({
        websiteId,
        companyId,
        customDomain: null,
        customDomainStatus: "not_connected",
      });
    }
  }

  await admin
    .from("connected_websites")
    .update({
      primary_domain: null,
      status: "connected",
      updated_at: now,
    })
    .eq("company_id", companyId)
    .ilike("primary_domain", domain);

  await admin
    .from("hosting_subscriptions")
    .update({
      custom_domain: null,
      domain_status: "pending",
      ssl_status: "pending",
      updated_at: now,
    })
    .eq("company_id", companyId)
    .eq("status", "active")
    .ilike("custom_domain", domain);

  revalidatePath("/admin/domains");
  await auditAdminAction({
    action: "website_domain.deleted",
    targetType: "website_domain",
    targetId: trimmedId,
    targetLabel: domain,
  });

  return { ok: true };
}

export async function adminClearFailedEmailLogs(): Promise<
  AdminMutationResult & { deletedCount?: number }
> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await clearFailedPlatformEmailLogs();
  if (!result.ok) return { ok: false, error: result.error };

  revalidateAdminSurfaces();
  await auditAdminAction({
    action: "email_logs.failed_cleared",
    targetType: "platform_email_logs",
    metadata: { deletedCount: result.deletedCount },
  });

  return { ok: true, deletedCount: result.deletedCount };
}
