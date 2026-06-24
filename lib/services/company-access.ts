import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { PermissionKey } from "@/lib/permissions/shared";
import { userHasPermission } from "@/lib/services/permissions";
import {
  canAccessFeature,
  type AccessFeatureKey,
} from "@/lib/subscriptions/access";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";

export type CompanyAccessResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function requireCompanyMembership(
  companyId: string
): Promise<CompanyAccessResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!companyId) {
    return { ok: false, error: "Missing company." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in again." };
  }

  const { data: membership, error } = await supabase
    .from("memberships")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !membership) {
    return { ok: false, error: "You do not have access to this company." };
  }

  return { ok: true, userId: user.id };
}

export async function requireCompanyPermission(
  companyId: string,
  permission: PermissionKey
): Promise<CompanyAccessResult> {
  const access = await requireCompanyMembership(companyId);
  if (!access.ok) return access;

  const allowed = await userHasPermission(
    companyId,
    access.userId,
    permission
  );
  if (!allowed) {
    return {
      ok: false,
      error: "You do not have permission to perform this action.",
    };
  }

  return access;
}

export type WebsiteAccessResult =
  | { ok: true; userId: string; companyId: string }
  | { ok: false; error: string };

export async function requireWebsiteCompanyPermission(
  websiteId: string,
  permission: PermissionKey = "view_websites"
): Promise<WebsiteAccessResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const { data: website, error } = await supabase
    .from("websites")
    .select("client_id")
    .eq("id", websiteId)
    .maybeSingle();

  if (error || !website?.client_id) {
    return { ok: false, error: "Website not found." };
  }

  const access = await requireCompanyPermission(website.client_id, permission);
  if (!access.ok) return access;
  return { ok: true, userId: access.userId, companyId: website.client_id };
}

export type CompanyManagerResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; error: string };

export async function requireCompanyOwner(
  companyId: string
): Promise<CompanyManagerResult> {
  const access = await requireCompanyMembership(companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { data: membership, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", access.userId)
    .maybeSingle();

  if (error || !membership) {
    return { ok: false, error: "You do not have access to this company." };
  }

  const role = membership.role ?? "owner";
  if (role !== "owner") {
    return { ok: false, error: "Only the workspace owner can manage team access." };
  }

  return { ok: true, userId: access.userId, role };
}

async function loadCompanySubscriptionFields(
  companyId: string
): Promise<SubscriptionCompanyFields | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(
      "plan, subscription_status, subscription_started_at, subscription_expires_at, next_billing_date"
    )
    .eq("id", companyId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function requireCompanyFeature(
  companyId: string,
  feature: AccessFeatureKey
): Promise<CompanyAccessResult> {
  const access = await requireCompanyMembership(companyId);
  if (!access.ok) return access;

  const company = await loadCompanySubscriptionFields(companyId);
  if (!company) {
    return { ok: false, error: "Workspace not found." };
  }

  if (!canAccessFeature(company, feature)) {
    return {
      ok: false,
      error: "This feature is not available on your current plan or subscription status.",
    };
  }

  return access;
}

export async function requireCompanyPermissionAndFeature(
  companyId: string,
  permission: PermissionKey,
  feature: AccessFeatureKey
): Promise<CompanyAccessResult> {
  const access = await requireCompanyPermission(companyId, permission);
  if (!access.ok) return access;

  const company = await loadCompanySubscriptionFields(companyId);
  if (!company) {
    return { ok: false, error: "Workspace not found." };
  }

  if (!canAccessFeature(company, feature)) {
    return {
      ok: false,
      error: "This feature is not available on your current plan or subscription status.",
    };
  }

  return access;
}
