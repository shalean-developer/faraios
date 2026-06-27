import type { PermissionKey } from "@/lib/permissions/shared";

export const WORKSPACE_GRANT_KEYS = [
  "website",
  "seo",
  "crm",
  "marketing",
  "automation",
  "analytics",
  "customers",
  "bookings",
  "invoices",
  "payments",
  "reports",
  "employees",
  "media",
  "files",
  "domains",
  "settings",
  "marketplace",
  "support",
] as const;

export type WorkspaceGrantKey = (typeof WORKSPACE_GRANT_KEYS)[number];

export type PlatformWorkspaceSession = {
  id: string;
  platformUserId: string;
  companyId: string;
  companySlug: string;
  companyName: string;
  reason: string;
  permissionsGranted: WorkspaceGrantKey[];
  fullAccess: boolean;
  platformRoleId: string;
  platformRoleLabel: string;
  startedAt: string;
  lastActivityAt: string;
};

export type PlatformWorkspaceContextValue = {
  active: boolean;
  session: PlatformWorkspaceSession | null;
  adminDisplayName: string;
  businessPermissions: PermissionKey[];
};
