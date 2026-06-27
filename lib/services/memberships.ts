import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { userHasActivePlatformWorkspaceAccess } from "@/lib/platform/workspace-session";
import type { UserCompany } from "@/types/database";

export type { UserCompany };

type MembershipRow = {
  company_id: string;
  companies?:
    | { id?: string; slug?: string | null; name?: string | null }
    | { id?: string; slug?: string | null; name?: string | null }[]
    | null;
};

function companyFromMembership(row: MembershipRow): UserCompany | null {
  const company = Array.isArray(row.companies)
    ? row.companies[0]
    : row.companies;
  if (!company?.slug || !company?.name) return null;
  return {
    id: company.id ?? row.company_id,
    slug: company.slug,
    name: company.name,
  };
}

export async function listCompaniesForUser(userId: string): Promise<UserCompany[]> {
  if (!isSupabaseConfigured() || !userId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select(
      `
      company_id,
      companies ( id, slug, name )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[memberships] listCompaniesForUser", error.message);
    return [];
  }

  return ((data ?? []) as MembershipRow[])
    .map(companyFromMembership)
    .filter((row): row is UserCompany => row !== null);
}

export async function userHasCompanySlugAccess(
  userId: string,
  companySlug: string
): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId || !companySlug) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select(
      `
      company_id,
      companies!inner ( slug )
    `
    )
    .eq("user_id", userId)
    .eq("companies.slug", companySlug)
    .maybeSingle();

  if (error) {
    console.error("[memberships] userHasCompanySlugAccess", error.message);
    return false;
  }

  if (data) return true;

  return userHasActivePlatformWorkspaceAccess(userId, companySlug);
}
