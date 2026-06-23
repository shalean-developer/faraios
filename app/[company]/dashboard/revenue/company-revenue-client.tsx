"use client";

import Link from "next/link";
import { formatRevenue } from "@/lib/operations/metrics";
import {
  companyCustomerPath,
  companyInvoicePath,
  companyInvoicesPath,
  companyPaymentsPath,
} from "@/lib/paths/company";
import { paymentStatusBadgeClass } from "@/lib/financial/status";
import type { RevenuePeriodPoint } from "@/lib/services/revenue-metrics";
import { cn } from "@/lib/utils";
import type { RevenueMetrics } from "@/types/financial";
import type { PaymentWithRelations } from "@/types/financial";

function formatMonthLabel(label: string): string {
  const [year, month] = label.split("-");
  if (!year || !month) return label;
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-ZA", {
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function CompanyRevenueClient({
  slug,
  metrics,
  monthlyTrend,
  recentPayments,
}: {
  slug: string;
  metrics: RevenueMetrics;
  monthlyTrend: RevenuePeriodPoint[];
  recentPayments: PaymentWithRelations[];
}) {
  const maxTrend = Math.max(...monthlyTrend.map((point) => point.revenueCents), 1);

  const primaryCards = [
    { label: "Revenue today", value: formatRevenue(metrics.revenueTodayCents) },
    { label: "This month", value: formatRevenue(metrics.revenueMonthCents) },
    { label: "This year", value: formatRevenue(metrics.revenueYearCents) },
    { label: "Total collected", value: formatRevenue(metrics.totalPaidCents) },
  ];

  const receivablesCards = [
    {
      label: "Outstanding",
      value: formatRevenue(metrics.outstandingInvoicesCents),
      hint: "Issued invoices still due",
    },
    {
      label: "Overdue",
      value: formatRevenue(metrics.overdueInvoicesCents),
      hint: "Past due date",
    },
    {
      label: "Avg booking value",
      value: formatRevenue(metrics.averageBookingValueCents),
      hint: "Completed bookings",
    },
    {
      label: "Quote conversion",
      value: `${metrics.quoteConversionRate}%`,
      hint: `${metrics.quotesAccepted} accepted of ${metrics.quotesSent} sent`,
    },
  ];

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Finance
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Revenue</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Collected customer payments, outstanding invoices, and quote performance.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={companyInvoicesPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Invoices →
          </Link>
          <Link
            href={companyPaymentsPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Payments →
          </Link>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Collected revenue
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {primaryCards.map((card) => (
            <MetricCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Receivables & pipeline
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {receivablesCards.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              hint={card.hint}
            />
          ))}
        </div>
      </section>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Monthly revenue trend</h2>
          <p className="mt-1 text-xs text-slate-500">Paid customer payments by month</p>
          {monthlyTrend.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No paid payments yet.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {monthlyTrend.map((point) => (
                <li key={point.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-600">{formatMonthLabel(point.label)}</span>
                    <span className="font-medium text-slate-900">
                      {formatRevenue(point.revenueCents)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{
                        width: `${Math.max(4, (point.revenueCents / maxTrend) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Payment health</h2>
          <p className="mt-1 text-xs text-slate-500">All payment attempts</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
              <p className="text-xs font-semibold uppercase text-emerald-700">Successful</p>
              <p className="mt-2 text-2xl font-bold text-emerald-900">
                {metrics.paymentsSuccessful}
              </p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
              <p className="text-xs font-semibold uppercase text-red-700">Failed</p>
              <p className="mt-2 text-2xl font-bold text-red-900">{metrics.paymentsFailed}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-600">Refunded</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {metrics.paymentsRefunded}
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
            <p>
              Quotes sent: <span className="font-semibold text-slate-900">{metrics.quotesSent}</span>
            </p>
            <p className="mt-1">
              Accepted:{" "}
              <span className="font-semibold text-slate-900">{metrics.quotesAccepted}</span>
            </p>
            <p className="mt-1">
              Rejected:{" "}
              <span className="font-semibold text-slate-900">{metrics.quotesRejected}</span>
            </p>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent payments</h2>
          <p className="mt-1 text-xs text-slate-500">Latest customer payment activity</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="hidden px-4 py-3 md:table-cell">Invoice</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentPayments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No payments yet.{" "}
                  <Link href={companyInvoicesPath(slug)} className="text-violet-700 hover:text-violet-900">
                    Issue an invoice
                  </Link>{" "}
                  to start collecting revenue.
                </td>
              </tr>
            ) : (
              recentPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(payment.paid_at ?? payment.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={companyCustomerPath(slug, payment.customer_id)}
                      className="font-medium text-slate-900 hover:text-violet-800"
                    >
                      {payment.customers?.name ?? "—"}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <Link
                      href={companyInvoicePath(slug, payment.invoice_id)}
                      className="text-violet-700 hover:text-violet-900"
                    >
                      {payment.invoices?.invoice_number ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {formatRevenue(payment.amount_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        paymentStatusBadgeClass(payment.status)
                      )}
                    >
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
