"use client";

import { RiseRevenueDashboard } from "@/components/company/rise-revenue-dashboard";
import type { RevenuePeriodPoint } from "@/lib/services/revenue-metrics";
import type {
  RiseIncomeExpenseSummary,
  RiseInvoiceBreakdown,
} from "@/lib/services/rise-dashboard-data";
import type { RevenueMetrics, PaymentWithRelations } from "@/types/financial";

export function CompanyRevenueClient({
  slug,
  metrics,
  monthlyTrend,
  recentPayments,
  invoiceBreakdown,
  invoiceMonthlyCents,
  incomeExpense,
}: {
  slug: string;
  metrics: RevenueMetrics;
  monthlyTrend: RevenuePeriodPoint[];
  recentPayments: PaymentWithRelations[];
  invoiceBreakdown: RiseInvoiceBreakdown;
  invoiceMonthlyCents: number[];
  incomeExpense: RiseIncomeExpenseSummary;
}) {
  return (
    <RiseRevenueDashboard
      slug={slug}
      metrics={metrics}
      monthlyTrend={monthlyTrend}
      recentPayments={recentPayments}
      invoiceBreakdown={invoiceBreakdown}
      invoiceMonthlyCents={invoiceMonthlyCents}
      incomeExpense={incomeExpense}
    />
  );
}
