"use client";

import { RiseGrowthDashboard } from "@/components/company/rise-growth-dashboard";
import type { GrowthOverviewData } from "@/lib/operations/metrics";

type Props = {
  slug: string;
  overview: GrowthOverviewData;
};

export function CompanyGrowthDashboard({ slug, overview }: Props) {
  return <RiseGrowthDashboard slug={slug} overview={overview} />;
}
