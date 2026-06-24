import type { SupabaseClient } from "@supabase/supabase-js";

type ClaimResult = {
  claimed: boolean;
  companyId: string | null;
  companySlug: string | null;
};

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

/**
 * Links a newly signed-in user to an admin-precreated company when
 * `companies.primary_contact_email` matches their auth email and the
 * company has no members yet (uses `create_owner_membership` RPC).
 */
export async function claimPendingOwnerWorkspace(
  supabase: SupabaseClient
): Promise<ClaimResult> {
  const empty: ClaimResult = { claimed: false, companyId: null, companySlug: null };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = normalizeEmail(user?.email);
  if (!user || !email) {
    return empty;
  }

  const { data: existingMembership, error: membershipError } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("[auth] claimPendingOwnerWorkspace membership", membershipError.message);
    return empty;
  }
  if (existingMembership) {
    return empty;
  }

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, slug, primary_contact_email, created_at")
    .not("primary_contact_email", "is", null)
    .order("created_at", { ascending: true });

  if (companiesError) {
    console.error("[auth] claimPendingOwnerWorkspace companies", companiesError.message);
    return empty;
  }

  const claimable = (companies ?? []).filter(
    (row) => normalizeEmail(row.primary_contact_email as string | null) === email
  );

  for (const company of claimable) {
    const companyId = company.id as string;
    const { data: membershipId, error: claimError } = await supabase.rpc(
      "create_owner_membership",
      { p_company_id: companyId }
    );

    if (!claimError && membershipId) {
      return {
        claimed: true,
        companyId,
        companySlug: (company.slug as string | null) ?? null,
      };
    }

    if (claimError) {
      const message = claimError.message.toLowerCase();
      if (message.includes("already has members")) {
        continue;
      }
      if (message.includes("already have a workspace")) {
        return empty;
      }
      console.error("[auth] claimPendingOwnerWorkspace claim", claimError.message);
    }
  }

  return empty;
}
