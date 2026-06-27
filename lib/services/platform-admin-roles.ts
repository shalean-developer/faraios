import {
  getPlatformRoleDefinition,
  isPlatformRoleId,
  PLATFORM_ROLE_DEFINITIONS,
  WORKSPACE_FULL_ACCESS_MODIFIER,
  type PlatformRoleDefinition,
  type PlatformRoleId,
} from "@/lib/platform/platform-role-definitions";
import {
  normalizeWorkspaceGrants,
  workspaceGrantsToPermissionKeys,
  fullPlatformWorkspacePermissions,
} from "@/lib/platform/workspace-grants";
import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { isSupabaseSchemaMissingError } from "@/lib/supabase/schema-errors";
import { createClient } from "@/lib/supabase/server";
import type { PermissionKey } from "@/lib/permissions/shared";
import type { WorkspaceGrantKey } from "@/types/platform-workspace";

export type PlatformAdminRoleRecord = {
  id: PlatformRoleId;
  label: string;
  description: string;
  fullAccess: boolean;
  allowedGrants: WorkspaceGrantKey[];
};

export type PlatformAdminUserRole = PlatformAdminRoleRecord & {
  userId: string;
};

type RoleRow = {
  id: string;
  label: string;
  description: string | null;
  full_access: boolean;
};

type GrantRow = {
  role_id: string;
  grant_key: string;
};

function mapRoleRow(row: RoleRow, grants: WorkspaceGrantKey[]): PlatformAdminRoleRecord {
  const fallback = getPlatformRoleDefinition(row.id);
  return {
    id: isPlatformRoleId(row.id) ? row.id : "platform_admin",
    label: row.label,
    description: row.description ?? fallback.description,
    fullAccess: row.full_access,
    allowedGrants: grants.length > 0 ? grants : fallback.allowedGrants,
  };
}

function fallbackRoleGrantsMap(): Map<string, WorkspaceGrantKey[]> {
  const map = new Map<string, WorkspaceGrantKey[]>();
  for (const [roleId, role] of Object.entries(PLATFORM_ROLE_DEFINITIONS)) {
    map.set(roleId, role.allowedGrants);
  }
  return map;
}

function logPlatformRolesQueryError(scope: string, error: { code?: string; message?: string }) {
  if (isSupabaseSchemaMissingError(error)) return;
  console.error(`[platform-roles] ${scope}`, error.message);
}

async function loadRoleGrantsMap(): Promise<Map<string, WorkspaceGrantKey[]>> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return fallbackRoleGrantsMap();
  }

  const { data, error } = await admin.client
    .from("platform_admin_role_grants")
    .select("role_id, grant_key");

  if (error) {
    logPlatformRolesQueryError("loadRoleGrantsMap", error);
    return fallbackRoleGrantsMap();
  }

  const map = new Map<string, WorkspaceGrantKey[]>();
  for (const row of (data ?? []) as GrantRow[]) {
    const normalized = normalizeWorkspaceGrants([row.grant_key]);
    if (normalized.length === 0) continue;
    const existing = map.get(row.role_id) ?? [];
    map.set(row.role_id, [...new Set([...existing, ...normalized])]);
  }

  for (const [roleId, role] of Object.entries(PLATFORM_ROLE_DEFINITIONS)) {
    if (!map.has(roleId)) {
      map.set(roleId, role.allowedGrants);
    }
  }

  return map;
}

export async function listPlatformAdminRoles(): Promise<PlatformAdminRoleRecord[]> {
  if (!isSupabaseConfigured()) {
    return Object.values(PLATFORM_ROLE_DEFINITIONS).map((role) => ({
      id: role.id,
      label: role.label,
      description: role.description,
      fullAccess: role.fullAccess,
      allowedGrants: role.allowedGrants,
    }));
  }
  if (!(await isCurrentUserPlatformAdmin())) return [];

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return Object.values(PLATFORM_ROLE_DEFINITIONS).map((role) => ({
      id: role.id,
      label: role.label,
      description: role.description,
      fullAccess: role.fullAccess,
      allowedGrants: role.allowedGrants,
    }));
  }

  const [rolesResult, grantsMap] = await Promise.all([
    admin.client
      .from("platform_admin_roles")
      .select("id, label, description, full_access")
      .order("sort_order", { ascending: true }),
    loadRoleGrantsMap(),
  ]);

  if (rolesResult.error) {
    logPlatformRolesQueryError("listPlatformAdminRoles", rolesResult.error);
    return Object.values(PLATFORM_ROLE_DEFINITIONS).map((role) => ({
      id: role.id,
      label: role.label,
      description: role.description,
      fullAccess: role.fullAccess,
      allowedGrants: role.allowedGrants,
    }));
  }

  return ((rolesResult.data ?? []) as RoleRow[]).map((row) =>
    mapRoleRow(row, grantsMap.get(row.id) ?? [])
  );
}

export async function getPlatformAdminRoleForUser(
  userId: string
): Promise<PlatformAdminUserRole> {
  const fallback = getPlatformRoleDefinition("platform_admin");

  if (!isSupabaseConfigured() || !userId) {
    return {
      userId,
      id: fallback.id,
      label: fallback.label,
      description: fallback.description,
      fullAccess: fallback.fullAccess,
      allowedGrants: fallback.allowedGrants,
    };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    const role = getPlatformRoleDefinition("platform_owner");
    return {
      userId,
      id: role.id,
      label: role.label,
      description: role.description,
      fullAccess: role.fullAccess,
      allowedGrants: role.allowedGrants,
    };
  }

  const [{ data: adminRow }, grantsMap, rolesResult] = await Promise.all([
    admin.client
      .from("platform_admins")
      .select("user_id, role_id")
      .eq("user_id", userId)
      .maybeSingle(),
    loadRoleGrantsMap(),
    admin.client
      .from("platform_admin_roles")
      .select("id, label, description, full_access"),
  ]);

  const roleRows = (rolesResult.data ?? []) as RoleRow[];
  const roleId =
    (adminRow as { role_id?: string | null } | null)?.role_id ??
    "platform_admin";
  const roleRow = roleRows.find((row) => row.id === roleId);
  const grants = grantsMap.get(roleId) ?? getPlatformRoleDefinition(roleId).allowedGrants;

  if (!roleRow) {
    const role = getPlatformRoleDefinition(roleId);
    return {
      userId,
      id: role.id,
      label: role.label,
      description: role.description,
      fullAccess: role.fullAccess,
      allowedGrants: grants,
    };
  }

  const mapped = mapRoleRow(roleRow, grants);
  return { userId, ...mapped };
}

export async function getCurrentPlatformAdminRole(): Promise<PlatformAdminUserRole | null> {
  if (!(await isCurrentUserPlatformAdmin())) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getPlatformAdminRoleForUser(user.id);
}

export function clampWorkspaceGrantsToRole(
  role: Pick<PlatformAdminRoleRecord, "fullAccess" | "allowedGrants">,
  requested: WorkspaceGrantKey[],
  options?: { fullAccess?: boolean }
): { grants: WorkspaceGrantKey[]; fullAccess: boolean } {
  if (role.fullAccess || options?.fullAccess) {
    return {
      grants: [...role.allowedGrants],
      fullAccess: true,
    };
  }

  const allowed = new Set(role.allowedGrants);
  const grants = requested.filter((grant) => allowed.has(grant));
  const fallback = role.allowedGrants.length > 0 ? role.allowedGrants : [];
  return {
    grants: grants.length > 0 ? grants : fallback,
    fullAccess: false,
  };
}

export function sessionGrantValues(input: {
  grants: WorkspaceGrantKey[];
  fullAccess?: boolean;
}): string[] {
  if (input.fullAccess) {
    return [WORKSPACE_FULL_ACCESS_MODIFIER, ...input.grants];
  }
  return input.grants;
}

export function parseSessionGrantValues(values: string[] | null | undefined): {
  grants: WorkspaceGrantKey[];
  fullAccess: boolean;
} {
  const raw = values ?? [];
  const fullAccess = raw.includes(WORKSPACE_FULL_ACCESS_MODIFIER);
  const grants = normalizeWorkspaceGrants(
    raw.filter((value) => value !== WORKSPACE_FULL_ACCESS_MODIFIER)
  );
  return { grants, fullAccess };
}

export function permissionsFromSessionGrants(input: {
  grants: WorkspaceGrantKey[];
  fullAccess: boolean;
}): PermissionKey[] {
  if (input.fullAccess) {
    return fullPlatformWorkspacePermissions();
  }
  return workspaceGrantsToPermissionKeys(input.grants);
}

export async function currentUserCanManagePlatformRoles(): Promise<boolean> {
  const role = await getCurrentPlatformAdminRole();
  return Boolean(role?.fullAccess);
}

export type WorkspaceEntryOptions = {
  role: PlatformAdminUserRole;
  allowedGrants: WorkspaceGrantKey[];
  defaultGrants: WorkspaceGrantKey[];
  canSelectFullAccess: boolean;
  assignableRoles: PlatformAdminRoleRecord[];
};

export async function getWorkspaceEntryOptions(): Promise<WorkspaceEntryOptions | null> {
  const role = await getCurrentPlatformAdminRole();
  if (!role) return null;

  const definition = getPlatformRoleDefinition(role.id);
  const assignableRoles = role.fullAccess ? await listPlatformAdminRoles() : [];

  return {
    role,
    allowedGrants: role.allowedGrants,
    defaultGrants: definition.defaultGrants.filter((grant) =>
      role.allowedGrants.includes(grant)
    ),
    canSelectFullAccess: role.fullAccess,
    assignableRoles,
  };
}

export async function assignPlatformAdminRole(input: {
  userId: string;
  roleId: PlatformRoleId;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await currentUserCanManagePlatformRoles())) {
    return { ok: false, error: "Only platform owners can assign roles." };
  }
  if (!isPlatformRoleId(input.roleId)) {
    return { ok: false, error: "Invalid platform role." };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: "Admin client unavailable." };
  }

  const { error } = await admin.client
    .from("platform_admins")
    .update({ role_id: input.roleId })
    .eq("user_id", input.userId);

  if (error) {
    logPlatformRolesQueryError("assignPlatformAdminRole", error);
    return { ok: false, error: "Could not assign platform role." };
  }

  return { ok: true };
}
