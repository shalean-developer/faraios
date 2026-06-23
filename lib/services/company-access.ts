import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

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
