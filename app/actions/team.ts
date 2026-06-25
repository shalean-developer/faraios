"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyOwner } from "@/lib/services/company-access";
import { listCompanyRoles } from "@/lib/services/company-roles";
import {
  findUserIdByEmail,
  listCompanyMembers,
  type CompanyMemberRole,
} from "@/lib/services/team";
import { planMemberLimit } from "@/lib/subscriptions/plan-entitlements";
import { ASSIGNABLE_MEMBER_ROLES } from "@/lib/team/assignable-roles";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type TeamMutationResult = { ok: true } | { ok: false; error: string };

const INVITE_ROLES = ASSIGNABLE_MEMBER_ROLES;

async function isAssignableRole(companyId: string, role: string): Promise<boolean> {
  if (INVITE_ROLES.includes(role as CompanyMemberRole)) return true;
  if (!role.startsWith("custom_")) return false;
  const customRoles = await listCompanyRoles(companyId);
  return customRoles.some((item) => item.roleKey === role);
}

function revalidateTeamPaths(slug: string) {
  revalidatePath(`/${slug}/dashboard/team`);
  revalidatePath(`/${slug}/dashboard/settings`);
}

export async function inviteTeamMember(input: {
  companyId: string;
  companySlug: string;
  email: string;
  role: string;
}): Promise<TeamMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (!(await isAssignableRole(input.companyId, input.role))) {
    return { ok: false, error: "Invalid role selected." };
  }

  const access = await requireCompanyOwner(input.companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", input.companyId)
    .maybeSingle();

  if (companyError || !company) {
    return { ok: false, error: "Workspace not found." };
  }

  const members = await listCompanyMembers(input.companyId);
  const memberLimit = planMemberLimit(company.plan);
  if (members.length >= memberLimit) {
    return {
      ok: false,
      error: `Your plan allows up to ${memberLimit === Infinity ? "unlimited" : memberLimit} team member${memberLimit === 1 ? "" : "s"}. Upgrade your plan to invite more people.`,
    };
  }

  const user = await findUserIdByEmail(email);
  if (!user) {
    return {
      ok: false,
      error:
        "No Shalean account found for that email. Ask them to sign up first, then invite again.",
    };
  }

  if (user.id === access.userId) {
    return { ok: false, error: "You are already a member of this workspace." };
  }

  const { error } = await supabase.rpc("invite_company_member", {
    p_company_id: input.companyId,
    p_user_id: user.id,
    p_role: input.role,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTeamPaths(input.companySlug);
  return { ok: true };
}

export async function updateTeamMemberRole(input: {
  memberUserId: string;
  companyId: string;
  companySlug: string;
  role: string;
}): Promise<TeamMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  if (!(await isAssignableRole(input.companyId, input.role))) {
    return { ok: false, error: "Invalid role selected." };
  }

  const access = await requireCompanyOwner(input.companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_company_member_role", {
    p_company_id: input.companyId,
    p_member_user_id: input.memberUserId,
    p_role: input.role,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTeamPaths(input.companySlug);
  return { ok: true };
}

export async function removeTeamMember(input: {
  memberUserId: string;
  companyId: string;
  companySlug: string;
}): Promise<TeamMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyOwner(input.companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_company_member", {
    p_company_id: input.companyId,
    p_member_user_id: input.memberUserId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTeamPaths(input.companySlug);
  return { ok: true };
}
