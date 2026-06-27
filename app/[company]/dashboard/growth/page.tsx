import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { getGrowthOverviewData } from "@/lib/services/growth-overview";

import { CompanyGrowthDashboard } from "./company-growth-dashboard";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Growth overview — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyGrowthPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const overview = await getGrowthOverviewData(row.id);

  return <CompanyGrowthDashboard slug={slug} overview={overview} />;
}
