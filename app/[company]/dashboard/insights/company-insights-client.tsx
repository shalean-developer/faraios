"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { formatRevenue } from "@/lib/operations/metrics";
import {
  companyAiInsightsPath,
  companyCustomerSegmentsPath,
  companyReportsPath,
  companyRevenuePath,
} from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { BiMetrics, BusinessHealthScore } from "@/types/v6-engine";

export function MetricCard({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      {trend !== undefined ? (
        <p
          className={cn(
            "mt-1 text-xs font-semibold",
            trend >= 0 ? "text-emerald-600" : "text-red-600"
          )}
        >
          {trend >= 0 ? "+" : ""}
          {trend}% vs last month
        </p>
      ) : null}
    </div>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-500"
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function healthScoreClass(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function CompanyInsightsClient({
  slug,
  metrics,
  health,
}: {
  slug: string;
  metrics: BiMetrics;
  health: BusinessHealthScore;
}) {
  const factorLabels: { key: keyof BusinessHealthScore["factors"]; label: string }[] = [
    { key: "revenueTrend", label: "Revenue trend" },
    { key: "bookingGrowth", label: "Booking growth" },
    { key: "customerRetention", label: "Customer retention" },
    { key: "leadConversion", label: "Lead conversion" },
    { key: "reviewActivity", label: "Review activity" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Intelligence
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Business insights</h1>
          <p className="mt-2 text-sm text-slate-500">
            Revenue, bookings, customers, marketing, and operations at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={companyRevenuePath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Revenue →
          </Link>
          <Link
            href={companyReportsPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Reports →
          </Link>
          <Link
            href={companyAiInsightsPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            AI assistant →
          </Link>
          <Link
            href={companyCustomerSegmentsPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Segments →
          </Link>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Business health
          </p>
          <p className={cn("mt-3 text-5xl font-bold", healthScoreClass(health.score))}>
            {health.score}
          </p>
          <p className="mt-1 text-sm text-slate-500">Overall score out of 100</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Health factors
          </p>
          <div className="mt-4 space-y-4">
            {factorLabels.map((factor) => (
              <FactorBar
                key={factor.key}
                label={factor.label}
                value={health.factors[factor.key]}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          Recommendations
        </p>
        <ul className="mt-3 space-y-2">
          {health.recommendations.map((item) => (
            <li key={item} className="text-sm text-slate-700">
              • {item}
            </li>
          ))}
        </ul>
      </div>

      <Section title="Revenue" description="Collected customer payments">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Today" value={formatRevenue(metrics.revenue.todayCents)} />
          <MetricCard label="This week" value={formatRevenue(metrics.revenue.weekCents)} />
          <MetricCard
            label="This month"
            value={formatRevenue(metrics.revenue.monthCents)}
            trend={metrics.revenue.growthPercent}
          />
          <MetricCard label="This year" value={formatRevenue(metrics.revenue.yearCents)} />
        </div>
      </Section>

      <Section title="Bookings" description="Pipeline and completion">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total" value={String(metrics.bookings.total)} />
          <MetricCard label="Completed" value={String(metrics.bookings.completed)} />
          <MetricCard label="Cancelled" value={String(metrics.bookings.cancelled)} />
          <MetricCard
            label="Completion rate"
            value={`${metrics.bookings.conversionRate}%`}
            hint="Completed vs all bookings"
          />
        </div>
      </Section>

      <Section title="Customers" description="Growth and retention signals">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="New (30d)" value={String(metrics.customers.new)} />
          <MetricCard label="Returning" value={String(metrics.customers.returning)} />
          <MetricCard label="Active (30d)" value={String(metrics.customers.active)} />
          <MetricCard
            label="Churn risk"
            value={String(metrics.customers.churnRisk)}
            hint="No booking in 90+ days"
          />
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Marketing" description="Leads and traffic sources">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <MetricCard label="Leads (30d)" value={String(metrics.marketing.leads)} />
            <MetricCard
              label="Conversion rate"
              value={`${metrics.marketing.conversionRate}%`}
            />
          </div>
          {metrics.marketing.topSources.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Top sources</th>
                    <th className="px-4 py-3 text-right">Leads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.marketing.topSources.map((source) => (
                    <tr key={source.source}>
                      <td className="px-4 py-3 text-slate-700">
                        {source.source || "Direct"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {source.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No lead source data yet.</p>
          )}
        </Section>

        <Section title="Campaigns" description="Recent email campaign performance">
          {metrics.marketing.campaignPerformance.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3 text-right">Sent</th>
                    <th className="px-4 py-3 text-right">Clicks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.marketing.campaignPerformance.map((campaign) => (
                    <tr key={campaign.name}>
                      <td className="px-4 py-3 text-slate-700">{campaign.name}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{campaign.sent}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {campaign.clicks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No sent campaigns yet.</p>
          )}
        </Section>
      </div>

      <Section title="Operations" description="Team utilization and job performance">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Staff utilization"
            value={`${metrics.operations.staffUtilization}%`}
            hint="Bookings with assigned staff"
          />
          <MetricCard
            label="Average job value"
            value={formatRevenue(metrics.operations.averageJobValueCents)}
          />
          <MetricCard
            label="Avg response time"
            value={`${metrics.operations.averageResponseHours}h`}
          />
          <MetricCard
            label="Completion rate"
            value={`${metrics.operations.completionRate}%`}
          />
        </div>
      </Section>
    </div>
  );
}
