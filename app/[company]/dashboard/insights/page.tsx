import { notFound } from "next/navigation";

import { getBusinessHealthScore } from "@/lib/services/business-health";
import { getBiMetrics } from "@/lib/services/bi-metrics";
import { getCompanyBySlug } from "@/lib/services/companies";

import { CompanyInsightsClient } from "./company-insights-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Business insights — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyInsightsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const [metrics, health] = await Promise.all([
    getBiMetrics(row.id),
    getBusinessHealthScore(row.id),
  ]);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <CompanyInsightsClient slug={slug} metrics={metrics} health={health} />
    </div>
  );
}
