import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { markOverdueInvoices } from "@/lib/services/invoices";
import { listPaymentsForCompany } from "@/lib/services/payments";
import { getRiseRevenuePageExtras } from "@/lib/services/rise-dashboard-data";
import {
  getRevenueByPeriod,
  getRevenueMetrics,
} from "@/lib/services/revenue-metrics";

import { CompanyRevenueClient } from "./company-revenue-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Revenue — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyRevenuePage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  await markOverdueInvoices(row.id);

  const [metrics, monthlyTrend, payments, extras] = await Promise.all([
    getRevenueMetrics(row.id),
    getRevenueByPeriod(row.id, "monthly", 6),
    listPaymentsForCompany(row.id),
    getRiseRevenuePageExtras(row.id),
  ]);

  return (
    <CompanyRevenueClient
      slug={slug}
      metrics={metrics}
      monthlyTrend={monthlyTrend}
      recentPayments={payments.slice(0, 8)}
      invoiceBreakdown={extras.invoiceBreakdown}
      invoiceMonthlyCents={extras.invoiceMonthlyCents}
      incomeExpense={extras.incomeExpense}
    />
  );
}
