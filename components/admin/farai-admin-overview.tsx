"use client";

import { PlatformOverviewDashboard } from "@/components/admin/dashboard/platform-overview-dashboard";
import type { AdminPlatformOverviewMetrics } from "@/types/admin";
import type { PlatformDashboardLayout } from "@/types/platform-dashboard";

export function FaraiAdminOverview({
  metrics,
  initialLayout,
}: {
  metrics: AdminPlatformOverviewMetrics;
  initialLayout: PlatformDashboardLayout;
}) {
  return <PlatformOverviewDashboard metrics={metrics} initialLayout={initialLayout} />;
}
