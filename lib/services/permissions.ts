import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export const PERMISSION_KEYS = [
  "view_bookings",
  "edit_bookings",
  "view_revenue",
  "create_invoices",
  "manage_staff",
  "manage_marketing",
  "manage_settings",
  "view_customers",
  "edit_customers",
  "view_reports",
  "manage_automations",
  "view_tasks",
  "manage_tasks",
  "view_ai_insights",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

const ROLE_DEFAULTS: Record<string, PermissionKey[]> = {
  owner: [...PERMISSION_KEYS],
  admin: PERMISSION_KEYS.filter((k) => k !== "manage_settings"),
  manager: [
    "view_bookings",
    "edit_bookings",
    "view_customers",
    "edit_customers",
    "view_tasks",
    "manage_tasks",
    "view_reports",
    "view_ai_insights",
  ],
  staff: ["view_bookings", "edit_bookings", "view_customers", "view_tasks"],
  finance: ["view_revenue", "create_invoices", "view_reports", "view_customers"],
  marketing: ["manage_marketing", "view_customers", "view_reports", "view_ai_insights"],
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

  const supabase = await createClient();
  const { data } = await supabase
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

  const supabase = await createClient();
  await supabase
    .from("role_permissions")
    .delete()
    .eq("company_id", companyId)
    .eq("role", role);

  if (permissions.length > 0) {
    const { error } = await supabase.from("role_permissions").insert(
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
