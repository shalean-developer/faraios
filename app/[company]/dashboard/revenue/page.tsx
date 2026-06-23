import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { getRevenueMetrics } from "@/lib/services/revenue-metrics";
import { formatRevenue } from "@/lib/operations/metrics";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export default async function CompanyRevenuePage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const metrics = await getRevenueMetrics(row.id);

  const cards = [
    { label: "Revenue today", value: formatRevenue(metrics.revenueTodayCents) },
    { label: "Revenue this month", value: formatRevenue(metrics.revenueMonthCents) },
    { label: "Revenue this year", value: formatRevenue(metrics.revenueYearCents) },
    { label: "Total paid", value: formatRevenue(metrics.totalPaidCents) },
    { label: "Outstanding invoices", value: formatRevenue(metrics.outstandingInvoicesCents) },
    { label: "Overdue invoices", value: formatRevenue(metrics.overdueInvoicesCents) },
    {
      label: "Avg booking value",
      value: formatRevenue(metrics.averageBookingValueCents),
    },
  ];

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Revenue</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Revenue dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          Based on collected customer payments, not booking estimates.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
