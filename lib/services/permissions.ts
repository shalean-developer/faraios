import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import {
  hasAnyPermission,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  ROLE_DEFAULTS,
  type PermissionKey,
} from "@/lib/permissions/shared";

export {
  hasAnyPermission,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type PermissionKey,
};

export async function getUserRole(
  companyId: string,
  userId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

export async function getRolePermissions(
  companyId: string,
  role: string
): Promise<PermissionKey[]> {
  if (!isSupabaseConfigured()) return ROLE_DEFAULTS[role] ?? [];

  const admin = tryCreateAdminClient();
  if (!admin.ok) return ROLE_DEFAULTS[role] ?? [];

  const { data } = await admin.client
    .from("role_permissions")
    .select("permission_key")
    .eq("company_id", companyId)
    .eq("role", role);

  if (data && data.length > 0) {
    return data.map((r) => r.permission_key as PermissionKey);
  }
  return ROLE_DEFAULTS[role] ?? [];
}

export async function userHasPermission(
  companyId: string,
  userId: string,
  permission: PermissionKey
): Promise<boolean> {
  const role = await getUserRole(companyId, userId);
  if (!role) return false;
  if (role === "owner") return true;
  const perms = await getRolePermissions(companyId, role);
  return perms.includes(permission);
}

export async function getUserPermissionKeys(
  companyId: string,
  userId: string
): Promise<PermissionKey[]> {
  const role = await getUserRole(companyId, userId);
  if (!role) return [];
  if (role === "owner") return [...PERMISSION_KEYS];
  return getRolePermissions(companyId, role);
}

export async function listPermissionsForCompany(companyId: string): Promise<
  {
    role: string;
    permissions: PermissionKey[];
  }[]
> {
  const roles = ["owner", "admin", "manager", "staff", "finance", "marketing"];
  const result = await Promise.all(
    roles.map(async (role) => ({
      role,
      permissions: await getRolePermissions(companyId, role),
    }))
  );
  return result;
}

export async function updateRolePermissions(
  companyId: string,
  role: string,
  permissions: PermissionKey[]
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  if (role === "owner") return { ok: false, error: "Owner permissions cannot be modified." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  await admin.client
    .from("role_permissions")
    .delete()
    .eq("company_id", companyId)
    .eq("role", role);

  if (permissions.length > 0) {
    const { error } = await admin.client.from("role_permissions").insert(
      permissions.map((permission_key) => ({
        company_id: companyId,
        role,
        permission_key,
      }))
    );
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}
