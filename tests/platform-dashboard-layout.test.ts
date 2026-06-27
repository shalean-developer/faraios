import { describe, expect, it } from "vitest";

import {
  normalizeOverviewDashboardLayout,
  resolveOverviewWidgetRenderOrder,
} from "@/lib/platform/overview-widget-registry";
import { DEFAULT_PLATFORM_OVERVIEW_LAYOUT } from "@/types/platform-dashboard";

describe("overview dashboard layout", () => {
  it("normalizes unknown widget ids and fills missing order entries", () => {
    const layout = normalizeOverviewDashboardLayout({
      order: ["operations", "system_health", "not-a-widget"],
      pinned: ["operations"],
      hidden: ["marketplace"],
    });

    expect(layout.order[0]).toBe("operations");
    expect(layout.order[1]).toBe("system_health");
    expect(layout.order).toContain("platform_metrics");
    expect(layout.pinned).toEqual(["operations"]);
    expect(layout.hidden).toEqual(["marketplace"]);
  });

  it("keeps pinned widgets first in view mode", () => {
    const layout = normalizeOverviewDashboardLayout({
      order: [
        "marketplace",
        "operations",
        "system_health",
        "platform_metrics",
        "user_revenue",
        "business_growth",
        "infrastructure",
        "support_panels",
        "backlog_actions",
        "audit_activity",
      ],
      pinned: ["system_health", "operations"],
      hidden: [],
    });

    const order = resolveOverviewWidgetRenderOrder(layout);
    expect(order.indexOf("system_health")).toBeLessThan(order.indexOf("marketplace"));
    expect(order.indexOf("operations")).toBeLessThan(order.indexOf("marketplace"));
  });

  it("falls back to defaults for invalid payloads", () => {
    expect(normalizeOverviewDashboardLayout(null)).toEqual(DEFAULT_PLATFORM_OVERVIEW_LAYOUT);
  });
});
