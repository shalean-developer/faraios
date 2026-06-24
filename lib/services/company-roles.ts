import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { PermissionKey } from "@/lib/permissions/shared";
import { getRolePermissions, updateRolePermissions } from "@/lib/services/permissions";
import type { CompanyRoleRecord } from "@/lib/team/role-display";

export type { CompanyRoleRecord };

function slugifyRoleKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base ? `custom_${base}` : `custom_role_${Date.now()}`;
}

export async function listCompanyRoles(companyId: string): Promise<CompanyRoleRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_roles")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[company-roles] listCompanyRoles", error.message);
    return [];
  }

  const rows = data ?? [];
  const customRows = rows.filter((row) => !row.is_system);

  return Promise.all(
    customRows.map(async (row) => ({
      id: row.id as string,
      companyId,
      roleKey: row.role_key as string,
      label: row.label as string,
      isSystem: Boolean(row.is_system),
      permissions: await getRolePermissions(companyId, row.role_key as string),
    }))
  );
}

export async function createCompanyRole(input: {
  companyId: string;
  label: string;
  permissions?: PermissionKey[];
}): Promise<{ ok: true; roleKey: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };

  const label = input.label.trim();
  if (!label) return { ok: false, error: "Role name is required." };

  const roleKey = slugifyRoleKey(label);
  const supabase = await createClient();

  const { error } = await supabase.from("company_roles").insert({
    company_id: input.companyId,
    role_key: roleKey,
    label,
    is_system: false,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "A role with a similar name already exists." };
    }
    return { ok: false, error: error.message };
  }

  if (input.permissions?.length) {
    const permResult = await updateRolePermissions(input.companyId, roleKey, input.permissions);
    if (!permResult.ok) return { ok: false, error: permResult.error ?? "Failed to set permissions." };
  }

  return { ok: true, roleKey };
}

export async function updateCompanyRolePermissions(input: {
  companyId: string;
  roleKey: string;
  permissions: PermissionKey[];
}): Promise<{ ok: boolean; error?: string }> {
  return updateRolePermissions(input.companyId, input.roleKey, input.permissions);
}

export async function deleteCompanyRole(input: {
  companyId: string;
  roleKey: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  if (!input.roleKey.startsWith("custom_")) {
    return { ok: false, error: "System roles cannot be deleted." };
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("company_id", input.companyId)
    .eq("role", input.roleKey);

  if ((count ?? 0) > 0) {
    return { ok: false, error: "Reassign team members before deleting this role." };
  }

  await supabase
    .from("role_permissions")
    .delete()
    .eq("company_id", input.companyId)
    .eq("role", input.roleKey);

  const { error } = await supabase
    .from("company_roles")
    .delete()
    .eq("company_id", input.companyId)
    .eq("role_key", input.roleKey);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
