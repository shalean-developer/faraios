import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { getIntelligenceOverviewData } from "@/lib/services/intelligence-overview";

import { CompanyIntelligenceDashboard } from "./company-intelligence-dashboard";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Intelligence overview — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyIntelligencePage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const overview = await getIntelligenceOverviewData(row.id);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <CompanyIntelligenceDashboard slug={slug} overview={overview} />
    </div>
  );
}
