export type AdminPrimaryNavKey = "dashboard" | "pipeline" | "team" | "clients";
export type AdminSystemNavKey = "analytics" | "settings" | "activity";
export type AdminNavKey = AdminPrimaryNavKey | AdminSystemNavKey;

/** Primary admin landing page. */
export const ADMIN_HOME_PATH = "/admin";

/** Full project pipeline table. */
export const ADMIN_PIPELINE_PATH = "/admin/pipeline";

export const ADMIN_PRIMARY_NAV: {
  key: AdminPrimaryNavKey;
  label: string;
  href: string;
}[] = [
  { key: "dashboard", label: "Dashboard", href: ADMIN_HOME_PATH },
  { key: "pipeline", label: "Project Pipeline", href: ADMIN_PIPELINE_PATH },
  { key: "team", label: "Team", href: "/admin/team" },
  { key: "clients", label: "Clients", href: "/admin/clients" },
];

export const ADMIN_SYSTEM_NAV: {
  key: AdminSystemNavKey;
  label: string;
  href: string;
}[] = [
  { key: "analytics", label: "Analytics", href: "/admin/analytics" },
  { key: "activity", label: "Activity", href: "/admin/activity" },
  { key: "settings", label: "Settings", href: "/admin/settings" },
];
