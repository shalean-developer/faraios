"use client";

import { RiseClientsDashboard } from "@/components/company/rise-clients-dashboard";
import type { CustomerFinancials, ClientsOverviewMetrics } from "@/lib/services/clients-overview";
import type { CustomerListStats } from "@/lib/services/customers";
import type { CompanyWithIndustry, Customer } from "@/types/database";

export function CompanyCustomersClient({
  slug,
  company,
  customers,
  stats,
  overview,
  financials,
}: {
  slug: string;
  company: CompanyWithIndustry;
  customers: Customer[];
  stats: Record<string, CustomerListStats>;
  overview: ClientsOverviewMetrics;
  financials: Record<string, CustomerFinancials>;
}) {
  return (
    <RiseClientsDashboard
      slug={slug}
      company={company}
      customers={customers}
      stats={stats}
      overview={overview}
      financials={financials}
    />
  );
}
