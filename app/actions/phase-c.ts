"use server";

import { revalidatePath } from "next/cache";

import {
  createCompanyRole,
  deleteCompanyRole,
  updateCompanyRolePermissions,
} from "@/lib/services/company-roles";
import {
  createRetentionCampaign,
  runRetentionCampaign,
  toggleRetentionCampaign,
} from "@/lib/services/retention-campaigns";
import { requireCompanyPermission, requireCompanyOwner } from "@/lib/services/company-access";
import type { PermissionKey } from "@/lib/permissions/shared";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type PhaseCMutationResult = { ok: true } | { ok: false; error: string };

function revalidateTeam(slug: string) {
  revalidatePath(`/${slug}/dashboard/team`);
  revalidatePath(`/${slug}/dashboard/team/roles`);
}

function revalidateCampaigns(slug: string) {
  revalidatePath(`/${slug}/dashboard/campaigns`);
  revalidatePath(`/${slug}/dashboard/campaigns/retention`);
}

export async function createCompanyRoleAction(input: {
  companyId: string;
  companySlug: string;
  label: string;
  permissions?: PermissionKey[];
}): Promise<PhaseCMutationResult & { roleKey?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const access = await requireCompanyOwner(input.companyId);
  if (!access.ok) return access;

  const result = await createCompanyRole({
    companyId: input.companyId,
    label: input.label,
    permissions: input.permissions,
  });

  if (!result.ok) return result;
  revalidateTeam(input.companySlug);
  return { ok: true, roleKey: result.roleKey };
}

export async function updateCustomRolePermissionsAction(input: {
  companyId: string;
  companySlug: string;
  roleKey: string;
  permissions: PermissionKey[];
}): Promise<PhaseCMutationResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const access = await requireCompanyOwner(input.companyId);
  if (!access.ok) return access;

  const result = await updateCompanyRolePermissions(input);
  if (!result.ok) return { ok: false, error: result.error ?? "Failed to update permissions." };
  revalidateTeam(input.companySlug);
  return { ok: true };
}

export async function deleteCompanyRoleAction(input: {
  companyId: string;
  companySlug: string;
  roleKey: string;
}): Promise<PhaseCMutationResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const access = await requireCompanyOwner(input.companyId);
  if (!access.ok) return access;

  const result = await deleteCompanyRole(input);
  if (!result.ok) return { ok: false, error: result.error ?? "Failed to delete role." };
  revalidateTeam(input.companySlug);
  return { ok: true };
}

export async function createRetentionCampaignAction(input: {
  companyId: string;
  companySlug: string;
  name: string;
  campaignType: "win_back" | "service_reminder" | "seasonal" | "loyalty";
  segmentType: string;
  subject: string;
  bodyHtml: string;
}): Promise<PhaseCMutationResult & { id?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const access = await requireCompanyPermission(input.companyId, "manage_marketing");
  if (!access.ok) return access;

  const result = await createRetentionCampaign(input);
  if (!result.ok) return result;
  revalidateCampaigns(input.companySlug);
  return { ok: true, id: result.id };
}

export async function runRetentionCampaignAction(input: {
  companyId: string;
  companySlug: string;
  campaignId: string;
}): Promise<PhaseCMutationResult & { sentCount?: number }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const access = await requireCompanyPermission(input.companyId, "manage_marketing");
  if (!access.ok) return access;

  const result = await runRetentionCampaign(input);
  if (!result.ok) return result;
  revalidateCampaigns(input.companySlug);
  return { ok: true, sentCount: result.sentCount };
}

export async function toggleRetentionCampaignAction(input: {
  companyId: string;
  companySlug: string;
  campaignId: string;
  enabled: boolean;
}): Promise<PhaseCMutationResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const access = await requireCompanyPermission(input.companyId, "manage_marketing");
  if (!access.ok) return access;

  const result = await toggleRetentionCampaign(input);
  if (!result.ok) return { ok: false, error: result.error ?? "Failed to update campaign." };
  revalidateCampaigns(input.companySlug);
  return { ok: true };
}
