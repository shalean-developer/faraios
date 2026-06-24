import { requireCompanyMembership } from "@/lib/services/company-access";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type CompanyMemberRole =
  | "owner"
  | "admin"
  | "manager"
  | "staff"
  | "finance"
  | "marketing";

export type CompanyMember = {
  id: string;
  user_id: string;
  company_id: string;
  role: string;
  created_at: string;
  email: string;
  full_name: string | null;
};

export type TeamSummary = {
  total: number;
  owners: number;
  admins: number;
  staff: number;
  other: number;
};

export function summarizeTeamMembers(members: CompanyMember[]): TeamSummary {
  let owners = 0;
  let admins = 0;
  let staff = 0;
  let other = 0;

  for (const member of members) {
    if (member.role === "owner") owners += 1;
    else if (member.role === "admin") admins += 1;
    else if (member.role === "staff") staff += 1;
    else other += 1;
  }

  return { total: members.length, owners, admins, staff, other };
}

async function listCompanyMembersWithAdmin(
  companyId: string
): Promise<CompanyMember[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data: memberships, error } = await admin.client
    .from("memberships")
    .select("id, user_id, company_id, role, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[team] listCompanyMembers admin fallback", error.message);
    return [];
  }

  if (!memberships?.length) return [];

  const userIds = [
    ...new Set(
      memberships.map((row) => row.user_id).filter((id): id is string => Boolean(id))
    ),
  ];

  const { data: users, error: usersError } = await admin.client
    .from("users")
    .select("id, email, full_name")
    .in("id", userIds);

  if (usersError) {
    console.error("[team] listCompanyMembers users lookup", usersError.message);
  }

  const userById = new Map(
    (users ?? []).map((user) => [user.id as string, user as { email?: string; full_name?: string | null }])
  );

  return memberships.map((row) => {
    const user = userById.get(row.user_id);
    return {
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      role: (row.role ?? "owner") as string,
      created_at: row.created_at ?? "",
      email: user?.email ?? "",
      full_name: user?.full_name ?? null,
    };
  });
}

export async function listCompanyMembers(
  companyId: string
): Promise<CompanyMember[]> {
  if (!isSupabaseConfigured() || !companyId) return [];

  const access = await requireCompanyMembership(companyId);
  if (!access.ok) return [];

  return listCompanyMembersWithAdmin(companyId);
}

export async function getMemberRoleForUser(
  companyId: string,
  userId: string
): Promise<CompanyMemberRole | null> {
  if (!isSupabaseConfigured() || !companyId || !userId) return null;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
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
