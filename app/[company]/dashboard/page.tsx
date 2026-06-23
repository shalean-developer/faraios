import { notFound } from "next/navigation";

import { CompanyOperationsDashboard } from "./company-operations-dashboard";
import { getCompanyBySlug } from "@/lib/services/companies";
import {
  getOperationsMetrics,
  getRecentActivity,
} from "@/lib/services/operations-metrics";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export default async function CompanyDashboardPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  const [metrics, recentActivity] = await Promise.all([
    getOperationsMetrics(row.id),
    getRecentActivity(row.id),
  ]);

  return (
    <CompanyOperationsDashboard
      slug={slug}
      company={row}
      metrics={metrics}
      recentActivity={recentActivity}
    />
  );
}
