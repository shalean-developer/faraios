"use client";

import { RiseMarketingDashboard } from "@/components/company/rise-marketing-dashboard";
import type { MarketingAnalytics } from "@/types/growth-engine";

export function CompanyMarketingClient({
  slug,
  analytics,
}: {
  slug: string;
  analytics: MarketingAnalytics;
}) {
  return <RiseMarketingDashboard slug={slug} analytics={analytics} />;
}
