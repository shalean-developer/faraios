import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { CompanyWithIndustry } from "@/types/database";

export async function listCompaniesWithIndustry(): Promise<
  CompanyWithIndustry[]
> {
  if (!isSupabaseConfigured()) {
    console.warn(
      "[companies] Missing NEXT_PUBLIC_SUPABASE_URL or a public key (NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
    );
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(
      `
      *,
      industries ( name, slug )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[companies] listCompaniesWithIndustry", error.message);
    return [];
  }

  return (data ?? []) as CompanyWithIndustry[];
}

/** Companies the signed-in user belongs to (via `memberships`). */
export async function listMemberCompaniesWithIndustry(
  userId: string
): Promise<CompanyWithIndustry[]> {
  if (!isSupabaseConfigured()) {
    console.warn(
      "[companies] Missing NEXT_PUBLIC_SUPABASE_URL or a public key (NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
    );
    return [];
  }
  const supabase = await createClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("company_id")
    .eq("user_id", userId);

  if (membershipError) {
    console.error(
      "[companies] listMemberCompaniesWithIndustry memberships",
      membershipError.message
    );
    return [];
  }
  if (!memberships?.length) {
    return [];
  }

  const ids = memberships.map((m) => m.company_id);
  const { data, error } = await supabase
    .from("companies")
    .select(
      `
      *,
      industries ( name, slug )
    `
    )
    .in("id", ids)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "[companies] listMemberCompaniesWithIndustry companies",
      error.message
    );
    return [];
  }

  return (data ?? []) as CompanyWithIndustry[];
}

export async function getCompanyBySlug(
  slug: string
): Promise<CompanyWithIndustry | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(
      `
      *,
      industries ( name, slug )
    `
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[companies] getCompanyBySlug", error.message);
    return null;
  }

  return data as CompanyWithIndustry | null;
}
