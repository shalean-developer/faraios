export type PlatformOverviewWidgetId =
  | "system_health"
  | "platform_metrics"
  | "user_revenue"
  | "business_growth"
  | "infrastructure"
  | "marketplace"
  | "operations"
  | "support_panels"
  | "backlog_actions"
  | "audit_activity";

export type PlatformDashboardLayout = {
  order: PlatformOverviewWidgetId[];
  pinned: PlatformOverviewWidgetId[];
  hidden: PlatformOverviewWidgetId[];
};

export type PlatformOverviewWidgetDefinition = {
  id: PlatformOverviewWidgetId;
  title: string;
  description: string;
};

export const PLATFORM_OVERVIEW_DASHBOARD_KEY = "overview" as const;

export const DEFAULT_PLATFORM_OVERVIEW_LAYOUT: PlatformDashboardLayout = {
  order: [
    "system_health",
    "platform_metrics",
    "user_revenue",
    "business_growth",
    "infrastructure",
    "marketplace",
    "operations",
    "support_panels",
    "backlog_actions",
    "audit_activity",
  ],
  pinned: ["system_health", "operations"],
  hidden: [],
};
