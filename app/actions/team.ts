"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyOwner } from "@/lib/services/company-access";
import {
  findUserIdByEmail,
  type CompanyMemberRole,
} from "@/lib/services/team";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type TeamMutationResult = { ok: true } | { ok: false; error: string };

const INVITE_ROLES: CompanyMemberRole[] = ["admin", "staff"];

function revalidateTeamPaths(slug: string) {
  revalidatePath(`/${slug}/dashboard/team`);
  revalidatePath(`/${slug}/dashboard/settings`);
}

export async function inviteTeamMember(input: {
  companyId: string;
  companySlug: string;
  email: string;
  role: CompanyMemberRole;
}): Promise<TeamMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (!INVITE_ROLES.includes(input.role)) {
    return { ok: false, error: "Role must be admin or staff." };
  }

  const access = await requireCompanyOwner(input.companyId);
  if (!access.ok) return access;

  const user = await findUserIdByEmail(email);
  if (!user) {
    return {
      ok: false,
      error:
        "No FaraiOS account found for that email. Ask them to sign up first, then invite again.",
    };
  }

  if (user.id === access.userId) {
    return { ok: false, error: "You are already a member of this workspace." };
  }

  const supabase = await createClient();
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
  role: CompanyMemberRole;
}): Promise<TeamMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  if (!INVITE_ROLES.includes(input.role)) {
    return { ok: false, error: "Role must be admin or staff." };
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
