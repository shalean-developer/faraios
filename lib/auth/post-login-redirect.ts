import type { SupabaseClient } from "@supabase/supabase-js";

import { claimPendingOwnerWorkspace } from "@/lib/auth/claim-pending-workspace";
import { isPlatformAdminUser } from "@/lib/auth/platform-admin";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export { isPlatformAdminUser } from "@/lib/auth/platform-admin";

type MembershipWithCompany = {
  companies?:
    | { slug?: string | null }
    | { slug?: string | null }[]
    | null;
};

function companySlugFromMembership(
  membership: MembershipWithCompany | null
): string | null {
  if (!membership?.companies) return null;
  if (Array.isArray(membership.companies)) {
    return membership.companies[0]?.slug ?? null;
  }
  return membership.companies.slug ?? null;
}

async function resolveWorkspacePath(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select(
      `
      company_id,
      companies ( slug )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (membershipError) {
    console.error("[auth] resolvePostLoginPath membership", membershipError.message);
    return null;
  }

  if (!memberships?.length) {
    return null;
  }

  if (memberships.length > 1) {
    return "/app/workspaces";
  }

  const companySlug = companySlugFromMembership(
    memberships[0] as MembershipWithCompany | null
  );
  if (companySlug) {
    return `/${encodeURIComponent(companySlug)}/dashboard`;
  }

  return null;
}

export async function resolvePostLoginPath(
  supabase: SupabaseClient,
  userId: string,
  preferredNext?: string | null
): Promise<string> {
  const next = safeNextPath(preferredNext);
  const isAdmin = await isPlatformAdminUser(supabase, userId);

  if (next !== "/app" && !next.startsWith("/app?")) {
    return next;
  }

  await claimPendingOwnerWorkspace(supabase);

  const workspacePath = await resolveWorkspacePath(supabase, userId);
  if (workspacePath) {
    return workspacePath;
  }

  if (isAdmin) {
    return "/admin";
  }

  return "/onboarding";
}
