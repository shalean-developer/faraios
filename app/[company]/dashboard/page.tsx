import { notFound } from "next/navigation";

import { CompanyOperationsDashboard } from "./company-operations-dashboard";
import { getCompanyBySlug } from "@/lib/services/companies";
import { getHomeOverviewData } from "@/lib/services/home-overview";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export default async function CompanyDashboardPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  const overview = await getHomeOverviewData(row.id);

  return (
    <CompanyOperationsDashboard
      slug={slug}
      company={row}
      overview={overview}
    />
  );
}
