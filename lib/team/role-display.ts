import type { PermissionKey } from "@/lib/permissions/shared";

export type CompanyRoleRecord = {
  id: string;
  companyId: string;
  roleKey: string;
  label: string;
  isSystem: boolean;
  permissions: PermissionKey[];
};

const SYSTEM_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  finance: "Finance",
  marketing: "Marketing",
};

export function roleDisplayLabel(
  roleKey: string,
  customRoles: Pick<CompanyRoleRecord, "roleKey" | "label">[] = []
): string {
  const custom = customRoles.find((row) => row.roleKey === roleKey);
  if (custom) return custom.label;
  return SYSTEM_ROLE_LABELS[roleKey] ?? roleKey.replace(/_/g, " ");
}

export function systemRoleLabel(roleKey: string): string {
  return SYSTEM_ROLE_LABELS[roleKey] ?? roleKey.replace(/_/g, " ");
}
