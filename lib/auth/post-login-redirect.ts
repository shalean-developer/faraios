import type { SupabaseClient } from "@supabase/supabase-js";

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

export async function resolvePostLoginPath(
  supabase: SupabaseClient,
  userId: string,
  preferredNext?: string | null
): Promise<string> {
  const next = safeNextPath(preferredNext);
  const isAdmin = await isPlatformAdminUser(supabase, userId);

  if (isAdmin) {
    if (next.startsWith("/admin")) return next;
    return "/admin";
  }

  if (next !== "/app") {
    return next;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select(
      `
      company_id,
      companies ( slug )
    `
    )
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("[auth] resolvePostLoginPath membership", membershipError.message);
    return "/onboarding";
  }

  const companySlug = companySlugFromMembership(
    membership as MembershipWithCompany | null
  );
  if (companySlug) {
    return `/${encodeURIComponent(companySlug)}/dashboard`;
  }

  return "/onboarding";
}
