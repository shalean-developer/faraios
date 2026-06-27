import {
  DEFAULT_PLATFORM_OVERVIEW_LAYOUT,
  type PlatformOverviewWidgetDefinition,
  type PlatformOverviewWidgetId,
} from "@/types/platform-dashboard";

export const OVERVIEW_WIDGET_DEFINITIONS: PlatformOverviewWidgetDefinition[] = [
  {
    id: "system_health",
    title: "System Health",
    description: "API, cron, email, queue, hosting, websites, domains, and SSL status.",
  },
  {
    id: "platform_metrics",
    title: "Platform Metrics",
    description: "Business counts across the platform.",
  },
  {
    id: "user_revenue",
    title: "Users & Revenue",
    description: "User growth and subscription revenue KPIs.",
  },
  {
    id: "business_growth",
    title: "Business Growth",
    description: "New businesses over the last six months.",
  },
  {
    id: "infrastructure",
    title: "Infrastructure",
    description: "Pipeline, hosting orders, and automation queue health.",
  },
  {
    id: "marketplace",
    title: "Marketplace",
    description: "Listings and marketplace-sourced bookings.",
  },
  {
    id: "operations",
    title: "Operations",
    description: "Support tickets and feature request backlog.",
  },
  {
    id: "support_panels",
    title: "Recent Businesses & Tickets",
    description: "Latest signups and open support queue.",
  },
  {
    id: "backlog_actions",
    title: "Feature Requests & Quick Actions",
    description: "Top votes and common admin shortcuts.",
  },
  {
    id: "audit_activity",
    title: "Recent Platform Activity",
    description: "Latest audit log events.",
  },
];

export const OVERVIEW_WIDGET_IDS = OVERVIEW_WIDGET_DEFINITIONS.map(
  (widget) => widget.id
) as PlatformOverviewWidgetId[];

const OVERVIEW_WIDGET_ID_SET = new Set<string>(OVERVIEW_WIDGET_IDS);

export function isOverviewWidgetId(value: string): value is PlatformOverviewWidgetId {
  return OVERVIEW_WIDGET_ID_SET.has(value);
}

export function getOverviewWidgetDefinition(
  id: PlatformOverviewWidgetId
): PlatformOverviewWidgetDefinition {
  return (
    OVERVIEW_WIDGET_DEFINITIONS.find((widget) => widget.id === id) ?? {
      id,
      title: id,
      description: "",
    }
  );
}

export function normalizeOverviewDashboardLayout(
  value: unknown
): typeof DEFAULT_PLATFORM_OVERVIEW_LAYOUT {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_PLATFORM_OVERVIEW_LAYOUT };
  }

  const row = value as Record<string, unknown>;
  const order = Array.isArray(row.order)
    ? row.order.filter((item): item is PlatformOverviewWidgetId =>
        typeof item === "string" && isOverviewWidgetId(item)
      )
    : [];
  const pinned = Array.isArray(row.pinned)
    ? row.pinned.filter((item): item is PlatformOverviewWidgetId =>
        typeof item === "string" && isOverviewWidgetId(item)
      )
    : [];
  const hidden = Array.isArray(row.hidden)
    ? row.hidden.filter((item): item is PlatformOverviewWidgetId =>
        typeof item === "string" && isOverviewWidgetId(item)
      )
    : [];

  const mergedOrder = [
    ...order,
    ...DEFAULT_PLATFORM_OVERVIEW_LAYOUT.order.filter((id) => !order.includes(id)),
  ];

  return {
    order: mergedOrder,
    pinned: pinned.filter((id) => mergedOrder.includes(id)),
    hidden: hidden.filter((id) => mergedOrder.includes(id)),
  };
}

/** Pinned widgets first, then the rest — respecting saved order within each group. */
export function resolveOverviewWidgetRenderOrder(
  layout: typeof DEFAULT_PLATFORM_OVERVIEW_LAYOUT,
  options?: { includeHidden?: boolean }
): PlatformOverviewWidgetId[] {
  const includeHidden = options?.includeHidden ?? false;
  const candidates = layout.order.filter(
    (id) => includeHidden || !layout.hidden.includes(id)
  );

  const pinned = candidates.filter((id) => layout.pinned.includes(id));
  const unpinned = candidates.filter((id) => !layout.pinned.includes(id));
  return [...pinned, ...unpinned];
}
