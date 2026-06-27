"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  CalendarCheck,
  DollarSign,
  Lightbulb,
  LineChart,
  Mail,
  Megaphone,
  TrendingUp,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { formatRevenue } from "@/lib/operations/metrics";
import {
  companyAiInsightsPath,
  companyCustomerSegmentsPath,
  companyReportsPath,
  companyRevenuePath,
} from "@/lib/paths/company";
import {
  riseCardClassName,
  riseFooterToneClass,
  riseOutlineButtonClassName,
  risePageClassName,
  risePrimaryButtonClassName,
  riseStretchCardClassName,
  type RiseFooterTone,
} from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";
import type { BiMetrics, BusinessHealthScore } from "@/types/v6-engine";

function WidgetHeader({
  icon: Icon,
  title,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
        ) : null}
        <h2 className="truncate text-sm font-medium text-slate-700">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  title,
  value,
  footer,
  footerTone,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
}: {
  title: string;
  value: string;
  footer?: string;
  footerTone?: RiseFooterTone;
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  trend?: number;
}) {
  return (
    <div className="min-w-[10.5rem] flex-1 rounded-xl border border-slate-200 bg-white p-4 sm:min-w-[11rem] lg:min-w-0">
      {Icon && iconBg && iconColor ? (
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
      ) : (
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      )}
      <p
        className={cn(
          "truncate text-2xl font-bold tracking-tight text-slate-900",
          Icon ? "mt-3" : "mt-2"
        )}
      >
        {value}
      </p>
      {footer ? (
        <p
          className={cn(
            "mt-1 truncate text-xs font-medium",
            footerTone ? riseFooterToneClass[footerTone] : "text-slate-500"
          )}
        >
          {footer}
        </p>
      ) : null}
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
          className="h-full rounded-full bg-[#5a8dee]"
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
  icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={riseCardClassName}>
      <WidgetHeader icon={icon} title={title} />
      {description ? (
        <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">{description}</p>
      ) : null}
      <div className="p-4">{children}</div>
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
    <div className={risePageClassName}>
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-medium text-slate-800">Business insights</h1>
            <p className="mt-1 text-sm text-slate-500">
              Revenue, bookings, customers, marketing, and operations at a glance.
            </p>
          </div>
          <div className="flex shrink-0 flex-row flex-wrap items-center gap-2">
            <Link href={companyRevenuePath(slug)} className={riseOutlineButtonClassName}>
              Revenue
            </Link>
            <Link href={companyReportsPath(slug)} className={riseOutlineButtonClassName}>
              Reports
            </Link>
            <Link href={companyAiInsightsPath(slug)} className={risePrimaryButtonClassName}>
              AI assistant
            </Link>
            <Link href={companyCustomerSegmentsPath(slug)} className={riseOutlineButtonClassName}>
              Segments
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className={cn(riseCardClassName, "p-4 xl:col-span-1")}>
          <WidgetHeader icon={Activity} title="Business health" />
          <div className="px-4 pb-4 pt-2">
            <p className={cn("text-5xl font-bold", healthScoreClass(health.score))}>
              {health.score}
            </p>
            <p className="mt-1 text-sm text-slate-500">Overall score out of 100</p>
          </div>
        </section>

        <section className={cn(riseStretchCardClassName, "xl:col-span-2")}>
          <WidgetHeader icon={LineChart} title="Health factors" />
          <div className="space-y-4 p-4">
            {factorLabels.map((factor) => (
              <FactorBar
                key={factor.key}
                label={factor.label}
                value={health.factors[factor.key]}
              />
            ))}
          </div>
        </section>
      </div>

      <section className={cn(riseCardClassName, "mt-4")}>
        <WidgetHeader icon={Lightbulb} title="Recommendations" />
        <ul className="space-y-2 p-4">
          {health.recommendations.map((item) => (
            <li key={item} className="text-sm text-slate-700">
              • {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4 flex flex-col gap-4">
        <Section icon={DollarSign} title="Revenue" description="Collected customer payments">
          <div className="flex flex-nowrap gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MetricCard
              title="Today"
              value={formatRevenue(metrics.revenue.todayCents)}
              icon={DollarSign}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              footerTone="neutral"
              footer="Collected today"
            />
            <MetricCard
              title="This week"
              value={formatRevenue(metrics.revenue.weekCents)}
              icon={TrendingUp}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              footerTone="neutral"
              footer="Last 7 days"
            />
            <MetricCard
              title="This month"
              value={formatRevenue(metrics.revenue.monthCents)}
              trend={metrics.revenue.growthPercent}
              icon={BarChart3}
              iconBg="bg-indigo-100"
              iconColor="text-indigo-600"
              footerTone="neutral"
              footer="Current month"
            />
            <MetricCard
              title="This year"
              value={formatRevenue(metrics.revenue.yearCents)}
              icon={CalendarCheck}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              footerTone="neutral"
              footer="Year to date"
            />
          </div>
        </Section>

        <Section icon={BookOpen} title="Bookings" description="Pipeline and completion">
          <div className="flex flex-nowrap gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MetricCard
              title="Total"
              value={String(metrics.bookings.total)}
              icon={BookOpen}
              iconBg="bg-slate-100"
              iconColor="text-slate-600"
              footerTone="neutral"
              footer="All bookings"
            />
            <MetricCard
              title="Completed"
              value={String(metrics.bookings.completed)}
              icon={CalendarCheck}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              footerTone="positive"
              footer="Finished jobs"
            />
            <MetricCard
              title="Cancelled"
              value={String(metrics.bookings.cancelled)}
              icon={BookOpen}
              iconBg="bg-red-100"
              iconColor="text-red-600"
              footerTone="neutral"
              footer="Cancelled jobs"
            />
            <MetricCard
              title="Completion rate"
              value={`${metrics.bookings.conversionRate}%`}
              icon={TrendingUp}
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
              footer="Completed vs all bookings"
              footerTone="neutral"
            />
          </div>
        </Section>

        <Section icon={Users} title="Customers" description="Growth and retention signals">
          <div className="flex flex-nowrap gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MetricCard
              title="New (30d)"
              value={String(metrics.customers.new)}
              icon={Users}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              footerTone="neutral"
              footer="Recent sign-ups"
            />
            <MetricCard
              title="Returning"
              value={String(metrics.customers.returning)}
              icon={Users}
              iconBg="bg-indigo-100"
              iconColor="text-indigo-600"
              footerTone="positive"
              footer="Repeat customers"
            />
            <MetricCard
              title="Active (30d)"
              value={String(metrics.customers.active)}
              icon={Activity}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              footerTone="neutral"
              footer="Recent activity"
            />
            <MetricCard
              title="Churn risk"
              value={String(metrics.customers.churnRisk)}
              icon={Users}
              iconBg="bg-orange-100"
              iconColor="text-orange-600"
              footer="No booking in 90+ days"
              footerTone="warning"
            />
          </div>
        </Section>

        <div className="grid gap-4 xl:grid-cols-2">
          <Section icon={Megaphone} title="Marketing" description="Leads and traffic sources">
            <div className="mb-4 flex flex-nowrap gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <MetricCard
                title="Leads (30d)"
                value={String(metrics.marketing.leads)}
                icon={Megaphone}
                iconBg="bg-rose-100"
                iconColor="text-rose-600"
                footerTone="neutral"
                footer="Captured leads"
              />
              <MetricCard
                title="Conversion rate"
                value={`${metrics.marketing.conversionRate}%`}
                icon={LineChart}
                iconBg="bg-violet-100"
                iconColor="text-violet-600"
                footerTone="neutral"
                footer="Lead conversion"
              />
            </div>
            {metrics.marketing.topSources.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Top sources</th>
                      <th className="px-4 py-3 text-right">Leads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.marketing.topSources.map((source) => (
                      <tr key={source.source} className="hover:bg-slate-50/80">
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

          <Section icon={Mail} title="Campaigns" description="Recent email campaign performance">
            {metrics.marketing.campaignPerformance.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Campaign</th>
                      <th className="px-4 py-3 text-right">Sent</th>
                      <th className="px-4 py-3 text-right">Clicks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.marketing.campaignPerformance.map((campaign) => (
                      <tr key={campaign.name} className="hover:bg-slate-50/80">
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

        <Section icon={Wrench} title="Operations" description="Team utilization and job performance">
          <div className="flex flex-nowrap gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MetricCard
              title="Staff utilization"
              value={`${metrics.operations.staffUtilization}%`}
              icon={Wrench}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              footer="Bookings with assigned staff"
              footerTone="neutral"
            />
            <MetricCard
              title="Average job value"
              value={formatRevenue(metrics.operations.averageJobValueCents)}
              icon={DollarSign}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              footerTone="neutral"
              footer="Per completed job"
            />
            <MetricCard
              title="Avg response time"
              value={`${metrics.operations.averageResponseHours}h`}
              icon={Activity}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              footerTone="neutral"
              footer="Customer response"
            />
            <MetricCard
              title="Completion rate"
              value={`${metrics.operations.completionRate}%`}
              icon={Brain}
              iconBg="bg-indigo-100"
              iconColor="text-indigo-600"
              footerTone="neutral"
              footer="Jobs completed"
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
