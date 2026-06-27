"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertCircle,
  FileText,
  PieChart,
  Receipt,
  ShoppingCart,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { formatRevenue } from "@/lib/operations/metrics";
import {
  companyCustomerPath,
  companyInvoicePath,
  companyInvoicesPath,
  companyPaymentsPath,
  companyQuotesPath,
} from "@/lib/paths/company";
import { paymentStatusBadgeClass } from "@/lib/financial/status";
import type { RevenuePeriodPoint } from "@/lib/services/revenue-metrics";
import type {
  RiseIncomeExpenseSummary,
  RiseInvoiceBreakdown,
} from "@/lib/services/rise-dashboard-data";
import { cn } from "@/lib/utils";
import type { RevenueMetrics } from "@/types/financial";
import type { PaymentWithRelations } from "@/types/financial";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseStretchCardClassName = cn(riseCardClassName, "flex h-full min-h-0 flex-col");
const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

type FooterTone = "positive" | "warning" | "neutral";

const footerToneClass: Record<FooterTone, string> = {
  positive: "text-emerald-600",
  warning: "text-orange-600",
  neutral: "text-slate-500",
};

function formatRiseDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatMonthLabel(label: string): string {
  const [year, month] = label.split("-");
  if (!year || !month) return label;
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-ZA", {
    month: "short",
    year: "numeric",
  });
}

function growthFromTrend(monthlyTrend: RevenuePeriodPoint[]): number {
  if (monthlyTrend.length < 2) return 0;
  const current = monthlyTrend[monthlyTrend.length - 1]?.revenueCents ?? 0;
  const previous = monthlyTrend[monthlyTrend.length - 2]?.revenueCents ?? 0;
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function WidgetHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
        <h2 className="truncate text-sm font-medium text-slate-700">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  title,
  value,
  footer,
  footerTone,
  href,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string;
  footer: string;
  footerTone: FooterTone;
  href: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Link
      href={href}
      className="block min-w-[10.5rem] flex-1 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:min-w-[11rem] lg:min-w-0"
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            iconBg
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", iconColor)} strokeWidth={1.75} />
        </span>
        <p className="min-w-0 line-clamp-2 text-xs font-semibold leading-tight text-slate-900">
          {title}
        </p>
      </div>
      <p className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className={cn("mt-1 truncate text-xs font-medium", footerToneClass[footerTone])}>
        {footer}
      </p>
    </Link>
  );
}

function InvoiceRow({
  count,
  label,
  amountCents,
  barColor,
  trackColor,
  countColor,
  maxAmount,
}: {
  count: number;
  label: string;
  amountCents: number;
  barColor: string;
  trackColor: string;
  countColor: string;
  maxAmount: number;
}) {
  const pct = maxAmount > 0 ? Math.min(100, Math.round((amountCents / maxAmount) * 100)) : 0;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={cn("w-5 shrink-0 text-right font-medium", countColor)}>{count}</span>
      <span className="w-24 shrink-0 text-slate-600">{label}</span>
      <div className={cn("h-2 flex-1 overflow-hidden rounded-full", trackColor)}>
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right text-slate-700">
        {formatRevenue(amountCents)}
      </span>
    </div>
  );
}

function InvoiceOverviewCard({
  breakdown,
  monthlyTotals,
}: {
  breakdown: RiseInvoiceBreakdown;
  monthlyTotals: number[];
}) {
  const maxAmount = Math.max(
    breakdown.overdueCents,
    breakdown.notPaidCents,
    breakdown.partiallyPaidCents,
    breakdown.fullyPaidCents,
    breakdown.draftCents,
    1
  );

  const sparkMax = Math.max(...monthlyTotals, 1);
  const sparkHeights = monthlyTotals.map((amount) =>
    Math.max(4, Math.round((amount / sparkMax) * 52))
  );

  return (
    <section className={riseStretchCardClassName}>
      <WidgetHeader icon={FileText} title="Invoice Overview" />
      <div className="flex flex-1 flex-col p-4">
        <div className="space-y-3">
          <InvoiceRow
            count={breakdown.overdue}
            label="Overdue"
            amountCents={breakdown.overdueCents}
            countColor="text-[#ef4444]"
            barColor="bg-[#ef4444]"
            trackColor="bg-red-100"
            maxAmount={maxAmount}
          />
          <InvoiceRow
            count={breakdown.notPaid}
            label="Not paid"
            amountCents={breakdown.notPaidCents}
            countColor="text-[#eab308]"
            barColor="bg-[#eab308]"
            trackColor="bg-amber-100"
            maxAmount={maxAmount}
          />
          <InvoiceRow
            count={breakdown.partiallyPaid}
            label="Partially paid"
            amountCents={breakdown.partiallyPaidCents}
            countColor="text-[#5a8dee]"
            barColor="bg-[#5a8dee]"
            trackColor="bg-blue-100"
            maxAmount={maxAmount}
          />
          <InvoiceRow
            count={breakdown.fullyPaid}
            label="Fully paid"
            amountCents={breakdown.fullyPaidCents}
            countColor="text-[#1d4ed8]"
            barColor="bg-[#1d4ed8]"
            trackColor="bg-blue-100"
            maxAmount={maxAmount}
          />
          <InvoiceRow
            count={breakdown.draft}
            label="Draft"
            amountCents={breakdown.draftCents}
            countColor="text-slate-500"
            barColor="bg-slate-400"
            trackColor="bg-slate-100"
            maxAmount={maxAmount}
          />
        </div>

        <div className="mt-auto border-t border-slate-100 pt-4">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">
                Total invoiced{" "}
                <span className="font-semibold text-slate-900">
                  {formatRevenue(breakdown.totalInvoicedCents)}
                </span>
              </p>
              <p className="text-slate-600">
                Due{" "}
                <span className="font-semibold text-[#5a8dee]">
                  {formatRevenue(breakdown.dueCents)}
                </span>
              </p>
            </div>
            <div className="text-right">
              <div className="flex h-14 items-end justify-end gap-0.5">
                {sparkHeights.map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-t bg-[#5a8dee]/80"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">Last 12 months</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DonutChart({
  segments,
  size = 110,
  thickness = 20,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const gradient = useMemo(() => {
    if (total === 0) return "#e2e8f0";
    let cursor = 0;
    const parts = segments
      .filter((segment) => segment.value > 0)
      .map((segment) => {
        const start = (cursor / total) * 100;
        cursor += segment.value;
        const end = (cursor / total) * 100;
        return `${segment.color} ${start}% ${end}%`;
      });
    return `conic-gradient(${parts.join(", ")})`;
  }, [segments, total]);

  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{ width: size, height: size, background: gradient }}
    >
      <div
        className="absolute rounded-full bg-white"
        style={{ inset: thickness }}
        aria-hidden
      />
    </div>
  );
}

function IncomeVsExpensesCard({
  incomeThisYearCents,
  expenseThisYearCents,
  incomeLastYearCents,
  expenseLastYearCents,
}: RiseIncomeExpenseSummary) {
  return (
    <section className={riseStretchCardClassName}>
      <WidgetHeader icon={PieChart} title="Income vs Expenses" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-4">
          <DonutChart
            segments={[
              { value: incomeThisYearCents, color: "#22c55e" },
              { value: expenseThisYearCents, color: "#f472b6" },
            ]}
          />
          <div className="space-y-3 text-sm">
            <p className="font-medium text-slate-700">This Year</p>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600">{formatRevenue(incomeThisYearCents)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-pink-400" />
              <span className="text-slate-600">{formatRevenue(expenseThisYearCents)}</span>
            </div>
            <p className="pt-1 font-medium text-slate-700">Last Year</p>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span>{formatRevenue(incomeLastYearCents)}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full bg-pink-300" />
              <span>{formatRevenue(expenseLastYearCents)}</span>
            </div>
          </div>
        </div>
        <div className="mt-auto pt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">This Year</p>
          <div className="relative h-20 overflow-hidden rounded bg-gradient-to-t from-pink-100 via-white to-emerald-100">
            <svg viewBox="0 0 200 80" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <path
                d="M0,60 C30,55 50,40 80,45 C110,50 130,20 160,30 C180,35 190,25 200,15 L200,80 L0,80 Z"
                fill="#86efac"
                fillOpacity="0.55"
              />
              <path
                d="M0,65 C25,62 55,58 85,50 C115,42 140,55 170,48 C185,44 195,40 200,38 L200,80 L0,80 Z"
                fill="#f9a8d4"
                fillOpacity="0.5"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

function MonthlyTrendCard({ monthlyTrend }: { monthlyTrend: RevenuePeriodPoint[] }) {
  const maxTrend = Math.max(...monthlyTrend.map((point) => point.revenueCents), 1);

  return (
    <section className={riseStretchCardClassName}>
      <WidgetHeader icon={TrendingUp} title="Monthly Revenue Trend" />
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-slate-500">Paid customer payments by month</p>
        {monthlyTrend.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No paid payments yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
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
                    className="h-full rounded-full bg-[#5a8dee]"
                    style={{
                      width: `${Math.max(4, (point.revenueCents / maxTrend) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PaymentHealthCard({ metrics }: { metrics: RevenueMetrics }) {
  return (
    <section className={riseStretchCardClassName}>
      <WidgetHeader icon={Receipt} title="Payment Health" />
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-slate-500">All payment attempts</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Successful
            </p>
            <p className="mt-2 text-2xl font-normal text-emerald-900">
              {metrics.paymentsSuccessful}
            </p>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50/60 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700">
              Failed
            </p>
            <p className="mt-2 text-2xl font-normal text-red-900">{metrics.paymentsFailed}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Refunded
            </p>
            <p className="mt-2 text-2xl font-normal text-slate-900">
              {metrics.paymentsRefunded}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
          <div className="grid gap-2 sm:grid-cols-2">
            <p>
              Quotes sent:{" "}
              <span className="font-semibold text-slate-900">{metrics.quotesSent}</span>
            </p>
            <p>
              Accepted:{" "}
              <span className="font-semibold text-slate-900">{metrics.quotesAccepted}</span>
            </p>
            <p>
              Rejected:{" "}
              <span className="font-semibold text-slate-900">{metrics.quotesRejected}</span>
            </p>
            <p>
              Conversion:{" "}
              <span className="font-semibold text-[#5a8dee]">
                {metrics.quoteConversionRate}%
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentPaymentsCard({
  slug,
  payments,
}: {
  slug: string;
  payments: PaymentWithRelations[];
}) {
  return (
    <section className={riseCardClassName}>
      <WidgetHeader
        icon={ShoppingCart}
        title="Recent Payments"
        action={
          <div className="flex shrink-0 items-center gap-2">
            <Link href={companyInvoicesPath(slug)} className={riseOutlineButtonClassName}>
              Invoices
            </Link>
            <Link href={companyPaymentsPath(slug)} className={riseOutlineButtonClassName}>
              All payments
            </Link>
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="hidden px-4 py-3 md:table-cell">Invoice</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No payments yet.{" "}
                  <Link
                    href={companyInvoicesPath(slug)}
                    className="font-medium text-[#5a8dee] hover:text-[#4a6fd8]"
                  >
                    Issue an invoice
                  </Link>{" "}
                  to start collecting revenue.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-slate-600">
                    {formatRiseDate(payment.paid_at ?? payment.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={companyCustomerPath(slug, payment.customer_id)}
                      className="font-medium text-[#5a8dee] hover:text-[#4a6fd8]"
                    >
                      {payment.customers?.name ?? "—"}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <Link
                      href={companyInvoicePath(slug, payment.invoice_id)}
                      className="text-slate-700 hover:text-[#5a8dee]"
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
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset",
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
      </div>
    </section>
  );
}

export function RiseRevenueDashboard({
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
  const growthPercent = growthFromTrend(monthlyTrend);
  const revenueTrendFooter =
    growthPercent > 0
      ? { text: `↑ ${growthPercent}% vs prior month`, tone: "positive" as const }
      : growthPercent < 0
        ? { text: `↓ ${Math.abs(growthPercent)}% vs prior month`, tone: "warning" as const }
        : { text: "Flat vs prior month", tone: "neutral" as const };

  const metricCards = [
    {
      title: "Revenue Today",
      value: formatRevenue(metrics.revenueTodayCents),
      footer: "Collected today",
      footerTone: "neutral" as const,
      href: companyPaymentsPath(slug),
      icon: TrendingUp,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "Revenue (This Month)",
      value: formatRevenue(metrics.revenueMonthCents),
      footer: revenueTrendFooter.text,
      footerTone: revenueTrendFooter.tone,
      href: companyPaymentsPath(slug),
      icon: TrendingUp,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Revenue (This Year)",
      value: formatRevenue(metrics.revenueYearCents),
      footer: formatRevenue(metrics.totalPaidCents) + " all time",
      footerTone: "neutral" as const,
      href: companyPaymentsPath(slug),
      icon: ShoppingCart,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      title: "Outstanding",
      value: formatRevenue(metrics.outstandingInvoicesCents),
      footer:
        metrics.overdueInvoicesCents > 0
          ? `${formatRevenue(metrics.overdueInvoicesCents)} overdue`
          : "All current",
      footerTone: metrics.overdueInvoicesCents > 0 ? ("warning" as const) : ("positive" as const),
      href: companyInvoicesPath(slug),
      icon: FileText,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      title: "Avg Booking Value",
      value: formatRevenue(metrics.averageBookingValueCents),
      footer: "Completed bookings",
      footerTone: "neutral" as const,
      href: companyPaymentsPath(slug),
      icon: Receipt,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
    },
    {
      title: "Quote Conversion",
      value: `${metrics.quoteConversionRate}%`,
      footer: `${metrics.quotesAccepted} of ${metrics.quotesSent} accepted`,
      footerTone: metrics.quoteConversionRate >= 50 ? ("positive" as const) : ("neutral" as const),
      href: companyQuotesPath(slug),
      icon: AlertCircle,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  const incomeCents =
    incomeExpense.incomeThisYearCents > 0
      ? incomeExpense.incomeThisYearCents
      : metrics.revenueYearCents;

  return (
    <div className="bg-[#f0f2f5] px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-nowrap gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {metricCards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="flex h-full min-h-0 flex-col lg:col-span-8">
          <InvoiceOverviewCard
            breakdown={invoiceBreakdown}
            monthlyTotals={invoiceMonthlyCents}
          />
        </div>
        <div className="flex h-full min-h-0 flex-col lg:col-span-4">
          <IncomeVsExpensesCard
            incomeThisYearCents={incomeCents}
            expenseThisYearCents={incomeExpense.expenseThisYearCents}
            incomeLastYearCents={incomeExpense.incomeLastYearCents}
            expenseLastYearCents={incomeExpense.expenseLastYearCents}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="flex h-full min-h-0 flex-col lg:col-span-6">
          <MonthlyTrendCard monthlyTrend={monthlyTrend} />
        </div>
        <div className="flex h-full min-h-0 flex-col lg:col-span-6">
          <PaymentHealthCard metrics={metrics} />
        </div>
      </div>

      <div className="mt-4">
        <RecentPaymentsCard slug={slug} payments={recentPayments} />
      </div>
    </div>
  );
}
