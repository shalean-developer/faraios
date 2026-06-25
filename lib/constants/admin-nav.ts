/** Primary admin landing page. */
export const ADMIN_HOME_PATH = "/admin";

/** Business directory (formerly Clients). */
export const ADMIN_BUSINESSES_PATH = "/admin/businesses";

/** Full project pipeline table. */
export const ADMIN_PIPELINE_PATH = "/admin/pipeline";

/** @deprecated Use ADMIN_BUSINESSES_PATH */
export const ADMIN_CLIENTS_PATH = ADMIN_BUSINESSES_PATH;

export type AdminPlatformNavKey =
  | "overview"
  | "businesses"
  | "users"
  | "revenue";

export type AdminInfrastructureNavKey =
  | "websites"
  | "seo"
  | "domains"
  | "apiUsage"
  | "emails"
  | "cron";

export type AdminOperationsNavKey = "support" | "featureRequests";

export type AdminInternalNavKey = "pipeline" | "team" | "analytics";

export type AdminSystemNavKey = "activity" | "settings";

/** @deprecated Use overview */
export type AdminLegacyNavKey = "dashboard" | "clients";

export type AdminNavKey =
  | AdminPlatformNavKey
  | AdminInfrastructureNavKey
  | AdminOperationsNavKey
  | AdminInternalNavKey
  | AdminSystemNavKey
  | AdminLegacyNavKey;

export const ADMIN_PLATFORM_NAV: {
  key: AdminPlatformNavKey;
  label: string;
  href: string;
}[] = [
  { key: "overview", label: "Overview", href: ADMIN_HOME_PATH },
  { key: "businesses", label: "Businesses", href: ADMIN_BUSINESSES_PATH },
  { key: "users", label: "Users", href: "/admin/users" },
  { key: "revenue", label: "Revenue", href: "/admin/revenue" },
];

export const ADMIN_INFRASTRUCTURE_NAV: {
  key: AdminInfrastructureNavKey;
  label: string;
  href: string;
}[] = [
  { key: "websites", label: "Websites", href: "/admin/websites" },
  { key: "seo", label: "SEO Platform", href: "/admin/seo" },
  { key: "domains", label: "Domains", href: "/admin/domains" },
  { key: "apiUsage", label: "API Usage", href: "/admin/api-usage" },
  { key: "emails", label: "Emails", href: "/admin/emails" },
  { key: "cron", label: "Cron Jobs", href: "/admin/cron" },
];

export const ADMIN_OPERATIONS_NAV: {
  key: AdminOperationsNavKey;
  label: string;
  href: string;
}[] = [
  { key: "support", label: "Support", href: "/admin/support" },
  {
    key: "featureRequests",
    label: "Feature Requests",
    href: "/admin/feature-requests",
  },
];

export const ADMIN_INTERNAL_NAV: {
  key: AdminInternalNavKey;
  label: string;
  href: string;
}[] = [
  { key: "pipeline", label: "Build Pipeline", href: ADMIN_PIPELINE_PATH },
  { key: "team", label: "Team", href: "/admin/team" },
  { key: "analytics", label: "Analytics", href: "/admin/analytics" },
];

export const ADMIN_SYSTEM_NAV: {
  key: AdminSystemNavKey;
  label: string;
  href: string;
}[] = [
  { key: "activity", label: "Activity", href: "/admin/activity" },
  { key: "settings", label: "Platform Settings", href: "/admin/settings" },
];

/** @deprecated Legacy primary nav — use sectioned nav constants above. */
export const ADMIN_PRIMARY_NAV = [
  { key: "dashboard" as const, label: "Dashboard", href: ADMIN_HOME_PATH },
  { key: "pipeline" as const, label: "Client projects", href: ADMIN_PIPELINE_PATH },
  { key: "team" as const, label: "Team", href: "/admin/team" },
  { key: "clients" as const, label: "Clients", href: ADMIN_BUSINESSES_PATH },
  { key: "websites" as const, label: "Websites", href: "/admin/websites" },
];

export function resolveAdminNavKey(pathname: string): AdminNavKey {
  if (pathname === ADMIN_HOME_PATH) return "overview";
  if (pathname.startsWith(ADMIN_BUSINESSES_PATH)) return "businesses";
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/revenue")) return "revenue";
  if (pathname.startsWith("/admin/websites")) return "websites";
  if (pathname.startsWith("/admin/seo")) return "seo";
  if (pathname.startsWith("/admin/domains")) return "domains";
  if (pathname.startsWith("/admin/api-usage")) return "apiUsage";
  if (pathname.startsWith("/admin/emails")) return "emails";
  if (pathname.startsWith("/admin/cron")) return "cron";
  if (pathname.startsWith("/admin/support")) return "support";
  if (pathname.startsWith("/admin/feature-requests")) return "featureRequests";
  if (pathname.startsWith(ADMIN_PIPELINE_PATH)) return "pipeline";
  if (pathname.startsWith("/admin/team")) return "team";
  if (pathname.startsWith("/admin/analytics")) return "analytics";
  if (pathname.startsWith("/admin/activity")) return "activity";
  if (pathname.startsWith("/admin/settings")) return "settings";
  return "overview";
}
