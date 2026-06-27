import {
  PERMISSION_KEYS,
  type PermissionKey,
} from "@/lib/permissions/shared";
import {
  WORKSPACE_GRANT_KEYS,
  type WorkspaceGrantKey,
} from "@/types/platform-workspace";

/** Maps workspace grant keys to business permission keys. */
export const WORKSPACE_GRANT_PERMISSIONS: Record<
  WorkspaceGrantKey,
  PermissionKey[]
> = {
  website: ["view_websites"],
  seo: ["manage_marketing", "view_reports"],
  crm: ["view_customers", "edit_customers"],
  marketing: ["manage_marketing"],
  automation: ["manage_automations"],
  analytics: ["view_reports", "view_ai_insights"],
  customers: ["view_customers", "edit_customers"],
  bookings: ["view_bookings", "edit_bookings"],
  invoices: ["view_revenue", "create_invoices"],
  payments: ["view_revenue"],
  reports: ["view_reports"],
  employees: ["manage_staff"],
  media: ["view_websites", "manage_marketing"],
  files: ["view_websites"],
  domains: ["view_websites", "manage_settings"],
  settings: ["manage_settings"],
  marketplace: ["view_websites", "manage_marketing"],
  support: ["view_customers"],
};

export const WORKSPACE_GRANT_LABELS: Record<WorkspaceGrantKey, string> = {
  website: "Website",
  seo: "SEO",
  crm: "CRM",
  marketing: "Marketing",
  automation: "Automation",
  analytics: "Analytics",
  customers: "Customers",
  bookings: "Bookings",
  invoices: "Invoices",
  payments: "Payments",
  reports: "Reports",
  employees: "Employees",
  media: "Media",
  files: "Files",
  domains: "Domains",
  settings: "Settings",
  marketplace: "Marketplace",
  support: "Support",
};

/** Full platform admin access inside a workspace (Phase 1 default). */
export const DEFAULT_PLATFORM_WORKSPACE_GRANTS: WorkspaceGrantKey[] = [
  ...WORKSPACE_GRANT_KEYS,
];

export function workspaceGrantsToPermissionKeys(
  grants: WorkspaceGrantKey[]
): PermissionKey[] {
  const keys = new Set<PermissionKey>();
  for (const grant of grants) {
    for (const permission of WORKSPACE_GRANT_PERMISSIONS[grant] ?? []) {
      keys.add(permission);
    }
  }
  return [...keys];
}

/** Platform owners receive all business permissions when entering a workspace. */
export function fullPlatformWorkspacePermissions(): PermissionKey[] {
  return [...PERMISSION_KEYS];
}

export function normalizeWorkspaceGrants(
  grants: string[] | null | undefined
): WorkspaceGrantKey[] {
  if (!grants?.length) return [];
  const allowed = new Set<string>(WORKSPACE_GRANT_KEYS);
  return grants.filter((grant): grant is WorkspaceGrantKey => allowed.has(grant));
}
