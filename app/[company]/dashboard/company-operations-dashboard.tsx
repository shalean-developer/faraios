"use client";

import { RiseDashboard } from "@/components/company/rise-dashboard";
import type { HomeOverviewData } from "@/lib/operations/metrics";
import type { RiseDashboardExtras } from "@/lib/services/rise-dashboard-data";

type Props = {
  slug: string;
  overview: HomeOverviewData;
  extras: RiseDashboardExtras;
  userDisplayName: string;
};

export function CompanyOperationsDashboard({
  slug,
  overview,
  extras,
  userDisplayName,
}: Props) {
  return (
    <RiseDashboard
      slug={slug}
      overview={overview}
      extras={extras}
      userDisplayName={userDisplayName}
    />
  );
}
