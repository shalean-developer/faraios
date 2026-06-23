import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { getRevenueByPeriod, getRevenueMetrics } from "@/lib/services/revenue-metrics";
import { formatRevenue } from "@/lib/operations/metrics";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export default async function CompanyReportsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const [metrics, monthlyRevenue] = await Promise.all([
    getRevenueMetrics(row.id),
    getRevenueByPeriod(row.id, "monthly", 6),
  ]);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Reports</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Financial reports</h1>
      </header>

      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportCard label="Quotes sent" value={String(metrics.quotesSent)} />
        <ReportCard label="Quotes accepted" value={String(metrics.quotesAccepted)} />
        <ReportCard label="Quotes rejected" value={String(metrics.quotesRejected)} />
        <ReportCard label="Conversion rate" value={`${metrics.quoteConversionRate}%`} />
        <ReportCard label="Payments successful" value={String(metrics.paymentsSuccessful)} />
        <ReportCard label="Payments failed" value={String(metrics.paymentsFailed)} />
        <ReportCard label="Payments refunded" value={String(metrics.paymentsRefunded)} />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900">Monthly revenue</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyRevenue.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                    No payment data yet.
                  </td>
                </tr>
              ) : (
                monthlyRevenue.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-3">{row.label}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatRevenue(row.revenueCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ReportCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
