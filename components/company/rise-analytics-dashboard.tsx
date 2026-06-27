"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  DollarSign,
  FileText,
  Globe,
  LineChart,
  Mail,
  Megaphone,
  Search,
  Sparkles,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import type { MarketingAnalyticsSummary } from "@/lib/services/marketing-analytics";
import {
  companyInsightsPath,
  companyMarketingPath,
  companyRevenuePath,
  companySeoPath,
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
import type { MarketingAnalytics } from "@/types/growth-engine";

type Props = {
  slug: string;
  analytics: MarketingAnalytics;
  summary: MarketingAnalyticsSummary;
};

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

function MetricCard({
  title,
  value,
  footer,
  footerTone,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string;
  footer: string;
  footerTone: RiseFooterTone;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="min-w-[10.5rem] flex-1 rounded-xl border border-slate-200 bg-white p-4 sm:min-w-[11rem] lg:min-w-0">
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
      <p className={cn("mt-1 truncate text-xs font-medium", riseFooterToneClass[footerTone])}>
        {footer}
      </p>
    </div>
  );
}

function DataTableCard({
  icon,
  title,
  description,
  emptyMessage,
  headers,
  rows,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  emptyMessage: string;
  headers: string[];
  rows: { key: string; cells: ReactNode[] }[];
}) {
  return (
    <section className={riseCardClassName}>
      <WidgetHeader icon={icon} title={title} />
      {description ? (
        <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">{description}</p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              {headers.map((header) => (
                <th key={header} className="px-4 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-10 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/80">
                  {row.cells.map((cell, index) => (
                    <td key={index} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FunnelBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#5a8dee]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

type QuickLink = {
  label: string;
  href: (slug: string) => string;
  icon: LucideIcon;
};

const QUICK_LINKS: QuickLink[] = [
  { label: "Marketing overview", href: companyMarketingPath, icon: Megaphone },
  { label: "Business insights", href: companyInsightsPath, icon: Sparkles },
  { label: "Revenue", href: companyRevenuePath, icon: DollarSign },
  {
    label: "Website tracking",
    href: (slug: string) => `/${encodeURIComponent(slug)}/dashboard/websites/tracking`,
    icon: LineChart,
  },
  { label: "SEO dashboard", href: companySeoPath, icon: Search },
];

function RelatedDashboardsCard({ slug }: { slug: string }) {
  return (
    <section className={riseStretchCardClassName}>
      <WidgetHeader icon={Megaphone} title="Related dashboards" />
      <div className="grid gap-2 p-4">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          const href = link.href(slug);
          return (
            <Link
              key={link.label}
              href={href}
              className="group flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 transition hover:border-slate-200 hover:bg-slate-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-[#eef2ff] group-hover:text-[#5a8dee]">
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="flex-1 text-sm font-medium text-slate-700">{link.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#5a8dee]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HighlightsCard({
  analytics,
  summary,
}: {
  analytics: MarketingAnalytics;
  summary: MarketingAnalyticsSummary;
}) {
  return (
    <section className={riseStretchCardClassName}>
      <WidgetHeader icon={Sparkles} title="Highlights" />
      <div className="flex flex-1 flex-col p-4">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Top source</dt>
            <dd className="truncate font-medium text-slate-900">{summary.topSource ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Top page</dt>
            <dd className="max-w-[140px] truncate font-mono text-xs text-slate-900">
              {summary.topPage ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Review requests</dt>
            <dd className="font-medium text-slate-900">{analytics.reviewRequestsSent}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Data status</dt>
            <dd className="font-medium text-slate-900">
              {summary.hasActivity ? "Collecting" : "No data yet"}
            </dd>
          </div>
        </dl>
        {!summary.hasActivity ? (
          <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
            Connect your website tracking script and start taking bookings to populate this
            dashboard.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function FunnelCard({
  analytics,
  funnelMax,
}: {
  analytics: MarketingAnalytics;
  funnelMax: number;
}) {
  return (
    <section className={riseStretchCardClassName}>
      <WidgetHeader icon={LineChart} title="Conversion funnel" />
      <div className="flex flex-1 flex-col p-4">
        <p className="mb-4 text-xs text-slate-500">Last 30 days</p>
        <div className="space-y-4">
          <FunnelBar label="Website visits" value={analytics.websiteVisits} max={funnelMax} />
          <FunnelBar label="Leads" value={analytics.leads} max={funnelMax} />
          <FunnelBar label="Quote requests" value={analytics.quoteRequests} max={funnelMax} />
          <FunnelBar label="Bookings" value={analytics.bookings} max={funnelMax} />
        </div>
      </div>
    </section>
  );
}

export function RiseAnalyticsDashboard({ slug, analytics, summary }: Props) {
  const funnelMax = Math.max(
    analytics.websiteVisits,
    analytics.leads,
    analytics.bookings,
    analytics.quoteRequests,
    1
  );

  const metricCards = [
    {
      title: "Website visits",
      value: String(analytics.websiteVisits),
      footer: "Last 30 days",
      footerTone: analytics.websiteVisits > 0 ? ("positive" as const) : ("neutral" as const),
      icon: Globe,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Leads",
      value: String(analytics.leads),
      footer: "Form & contact captures",
      footerTone: analytics.leads > 0 ? ("positive" as const) : ("neutral" as const),
      icon: UserRound,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
    },
    {
      title: "Bookings",
      value: String(analytics.bookings),
      footer: "Completed in period",
      footerTone: analytics.bookings > 0 ? ("positive" as const) : ("neutral" as const),
      icon: TrendingUp,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "Visit → booking",
      value: `${analytics.conversionRate}%`,
      footer: "Overall conversion",
      footerTone: analytics.conversionRate >= 5 ? ("positive" as const) : ("neutral" as const),
      icon: LineChart,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      title: "Quote requests",
      value: String(analytics.quoteRequests),
      footer: "Tracking events",
      footerTone: analytics.quoteRequests > 0 ? ("positive" as const) : ("neutral" as const),
      icon: FileText,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      title: "Visit → lead",
      value: summary.visitToLeadRate > 0 ? `${summary.visitToLeadRate}%` : "—",
      footer: "Top-of-funnel",
      footerTone: summary.visitToLeadRate > 0 ? ("positive" as const) : ("neutral" as const),
      icon: UserRound,
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
    },
    {
      title: "Lead → booking",
      value: summary.leadToBookingRate > 0 ? `${summary.leadToBookingRate}%` : "—",
      footer: "Pipeline close rate",
      footerTone: summary.leadToBookingRate > 0 ? ("positive" as const) : ("neutral" as const),
      icon: TrendingUp,
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
    },
    {
      title: "Campaign revenue",
      value: `R${(analytics.campaignRevenueCents / 100).toFixed(0)}`,
      footer: `${analytics.campaignPerformance.length} sent campaign(s)`,
      footerTone: analytics.campaignRevenueCents > 0 ? ("positive" as const) : ("neutral" as const),
      icon: Mail,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className={risePageClassName}>
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-medium text-slate-800">Marketing analytics</h1>
            <p className="mt-1 text-sm text-slate-500">
              Website visits, lead sources, conversion funnel, and campaign ROI — last 30 days.
            </p>
          </div>
          <div className="flex shrink-0 flex-row flex-nowrap items-center gap-2">
            <Link href={companyMarketingPath(slug)} className={riseOutlineButtonClassName}>
              Marketing overview
            </Link>
            <Link href={companyInsightsPath(slug)} className={risePrimaryButtonClassName}>
              Business insights
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-nowrap gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {metricCards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="flex flex-col gap-4">
          <DataTableCard
            icon={TrendingUp}
            title="Top lead sources"
            description="Booking attribution by UTM source, referrer, or website over the last 30 days."
            emptyMessage="No attribution data yet. Add UTM parameters to booking links or connect website tracking."
            headers={["Source", "Bookings"]}
            rows={analytics.topSources.map((row) => ({
              key: row.source,
              cells: [
                <span key="source" className="font-medium text-slate-900">
                  {row.source}
                </span>,
                <span key="count" className="text-right font-medium text-slate-900">
                  {row.count}
                </span>,
              ],
            }))}
          />

          <DataTableCard
            icon={Globe}
            title="Top service pages"
            description="Most visited paths from page views and booking form impressions."
            emptyMessage="No page data yet. Install the tracking script from Website → Tracking."
            headers={["Page", "Visits"]}
            rows={analytics.topServicePages.map((row) => ({
              key: row.page,
              cells: [
                <span key="page" className="font-mono text-xs text-slate-700">
                  {row.page}
                </span>,
                <span key="visits" className="text-right font-medium text-slate-900">
                  {row.count}
                </span>,
              ],
            }))}
          />

          <DataTableCard
            icon={Mail}
            title="Campaign performance"
            description="Email campaign delivery and attributed bookings/revenue."
            emptyMessage="No sent campaigns yet. Create and send a campaign to see ROI here."
            headers={["Campaign", "Sent", "Bookings", "Revenue"]}
            rows={analytics.campaignPerformance.map((row) => ({
              key: row.name,
              cells: [
                <span key="name" className="font-medium text-slate-900">
                  {row.name}
                </span>,
                <span key="sent" className="text-right text-slate-700">
                  {row.sentCount}
                </span>,
                <span key="bookings" className="text-right text-slate-700">
                  {row.bookingsGenerated}
                </span>,
                <span key="revenue" className="text-right font-medium text-slate-900">
                  R{(row.revenueCents / 100).toFixed(0)}
                </span>,
              ],
            }))}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <FunnelCard analytics={analytics} funnelMax={funnelMax} />
          <HighlightsCard analytics={analytics} summary={summary} />
          <RelatedDashboardsCard slug={slug} />
        </aside>
      </div>
    </div>
  );
}
