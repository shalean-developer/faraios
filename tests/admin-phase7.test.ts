import { describe, expect, it } from "vitest";

import { getAdminNavigationSearchResults } from "@/lib/constants/admin-global-search";
import {
  isPlatformOverviewSnapshotFresh,
  parsePlatformOverviewSnapshotMetrics,
} from "@/lib/services/platform-overview-snapshot-utils";
import type { AdminPlatformOverviewMetrics } from "@/types/admin";

function sampleMetrics(): AdminPlatformOverviewMetrics {
  return {
    businesses: {
      total: 0,
      active: 0,
      trial: 0,
      suspended: 0,
      newThisMonth: 0,
    },
    users: {
      total: 0,
      active: 0,
      growthRatePercent: 0,
      newThisMonth: 0,
    },
    revenue: {
      mrr: 0,
      arr: 0,
      totalRevenue: 0,
      activeSubscriptions: 0,
      failedPayments: 0,
      churnRatePercent: 0,
    },
    operations: {
      openTickets: 0,
      urgentTickets: 0,
      pendingFeatureRequests: 0,
    },
    systemHealth: {
      api: "unknown",
      cron: "unknown",
      email: "unknown",
      queue: "unknown",
      hosting: "unknown",
      websites: "unknown",
      domains: "unknown",
      ssl: "unknown",
    },
    infrastructure: {
      pipelineInProgress: 0,
      pipelineInReview: 0,
      pipelinePending: 0,
      pendingHostingOrders: 0,
      failedHostingOrders: 0,
      pendingAutomationJobs: 0,
      failedAutomationJobs: 0,
    },
    marketplace: {
      activeListings: 0,
      featuredListings: 0,
      marketplaceBookings30d: 0,
    },
    businessGrowthTrend: [],
    recentBusinesses: [],
    recentAuditEvents: [],
    recentOpenTickets: [],
    topFeatureRequests: [],
    pipelineStats: {
      total: 0,
      pending: 0,
      inProgress: 0,
      inReview: 0,
      completed: 0,
    },
  };
}

describe("getAdminNavigationSearchResults", () => {
  it("returns all navigation items when query is empty", () => {
    const results = getAdminNavigationSearchResults("");
    expect(results.length).toBeGreaterThan(5);
    expect(results.every((item) => item.category === "navigation")).toBe(true);
  });

  it("filters navigation by label", () => {
    const results = getAdminNavigationSearchResults("business");
    expect(results.some((item) => item.label === "Businesses")).toBe(true);
    expect(results.every((item) => item.category === "navigation")).toBe(true);
  });
});

describe("platform overview snapshot utils", () => {
  it("detects fresh snapshots within ttl", () => {
    const capturedAt = new Date(Date.now() - 60_000).toISOString();
    expect(isPlatformOverviewSnapshotFresh(capturedAt)).toBe(true);
  });

  it("rejects stale snapshots", () => {
    const capturedAt = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(isPlatformOverviewSnapshotFresh(capturedAt)).toBe(false);
  });

  it("parses valid snapshot metrics", () => {
    const metrics = sampleMetrics();
    expect(parsePlatformOverviewSnapshotMetrics(metrics)).toEqual(metrics);
  });
});
