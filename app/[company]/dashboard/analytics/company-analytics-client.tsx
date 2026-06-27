"use client";

import { RiseAnalyticsDashboard } from "@/components/company/rise-analytics-dashboard";
import type { MarketingAnalyticsSummary } from "@/lib/services/marketing-analytics";
import type { MarketingAnalytics } from "@/types/growth-engine";

export function CompanyAnalyticsClient({
  slug,
  analytics,
  summary,
}: {
  slug: string;
  analytics: MarketingAnalytics;
  summary: MarketingAnalyticsSummary;
}) {
  return <RiseAnalyticsDashboard slug={slug} analytics={analytics} summary={summary} />;
}
