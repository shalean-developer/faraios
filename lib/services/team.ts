import { requireCompanyMembership } from "@/lib/services/company-access";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type CompanyMemberRole = "owner" | "admin" | "staff";

export type CompanyMember = {
  id: string;
  user_id: string;
  company_id: string;
  role: CompanyMemberRole;
  created_at: string;
  email: string;
  full_name: string | null;
};

export async function listCompanyMembers(
  companyId: string
): Promise<CompanyMember[]> {
  if (!isSupabaseConfigured() || !companyId) return [];

  const access = await requireCompanyMembership(companyId);
  if (!access.ok) return [];

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_company_members", {
      p_company_id: companyId,
    });

    if (error) {
      console.error("[team] listCompanyMembers rpc", error.message);
      return [];
    }

    return (data ?? []).map((row: {
      id: string;
      user_id: string;
      company_id: string;
      role: string | null;
      created_at: string | null;
      email?: string | null;
      full_name?: string | null;
    }) => ({
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      role: (row.role ?? "owner") as CompanyMemberRole,
      created_at: row.created_at ?? "",
      email: row.email ?? "",
      full_name: row.full_name ?? null,
    }));
  }

  const { data, error } = await admin.client
    .from("memberships")
    .select(
      `
      id,
      user_id,
      company_id,
      role,
      created_at,
      users ( email, full_name )
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[team] listCompanyMembers admin", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const users = row.users as
      | { email?: string; full_name?: string | null }
      | { email?: string; full_name?: string | null }[]
      | null;
    const user = Array.isArray(users) ? users[0] : users;
    return {
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      role: (row.role ?? "owner") as CompanyMemberRole,
      created_at: row.created_at ?? "",
      email: user?.email ?? "",
      full_name: user?.full_name ?? null,
    };
  });
}

export async function getMemberRoleForUser(
  companyId: string,
  userId: string
): Promise<CompanyMemberRole | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;
  return (data.role ?? "owner") as CompanyMemberRole;
}

export async function findUserIdByEmail(
  email: string
): Promise<{ id: string; email: string } | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data, error } = await admin.client
    .from("users")
    .select("id, email")
    .ilike("email", normalized)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return { id: data.id, email: data.email };
}
