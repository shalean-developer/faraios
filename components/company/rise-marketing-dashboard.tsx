"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Globe,
  LineChart,
  Mail,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  Star,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  companyAnalyticsPath,
  companyCampaignsPath,
  companyContentPath,
  companyReviewsPath,
  companySeoPath,
} from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { MarketingAnalytics } from "@/types/growth-engine";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseStretchCardClassName = cn(riseCardClassName, "flex h-full min-h-0 flex-col");
const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";
const risePrimaryButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md bg-[#5a8dee] px-3 text-sm font-medium text-white transition hover:bg-[#4a6fd8]";

type FooterTone = "positive" | "warning" | "neutral";

const footerToneClass: Record<FooterTone, string> = {
  positive: "text-emerald-600",
  warning: "text-orange-600",
  neutral: "text-slate-500",
};

type Props = {
  slug: string;
  analytics: MarketingAnalytics;
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

function DataTableCard({
  icon,
  title,
  emptyMessage,
  headers,
  rows,
}: {
  icon: LucideIcon;
  title: string;
  emptyMessage: string;
  headers: string[];
  rows: { key: string; cells: ReactNode[] }[];
}) {
  return (
    <section className={riseCardClassName}>
      <WidgetHeader icon={icon} title={title} />
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

const QUICK_LINKS = [
  { label: "Email campaigns", href: companyCampaignsPath, icon: Mail },
  { label: "Content library", href: companyContentPath, icon: FileText },
  { label: "Review requests", href: companyReviewsPath, icon: MessageSquare },
  { label: "SEO dashboard", href: companySeoPath, icon: Search },
  { label: "Full analytics", href: companyAnalyticsPath, icon: BarChart3 },
] as const;

function GrowthToolsCard({ slug }: { slug: string }) {
  return (
    <section className={riseStretchCardClassName}>
      <WidgetHeader icon={Megaphone} title="Growth toolkit" />
      <div className="grid gap-2 p-4">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href(slug)}
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

function AtAGlanceCard({ analytics, hasActivity }: { analytics: MarketingAnalytics; hasActivity: boolean }) {
  const leadToBooking =
    analytics.leads > 0 ? `${Math.round((analytics.bookings / analytics.leads) * 100)}%` : "—";

  return (
    <section className={riseStretchCardClassName}>
      <WidgetHeader icon={LineChart} title="At a glance" />
      <div className="flex flex-1 flex-col p-4">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Pipeline health</dt>
            <dd className="font-medium text-slate-900">
              {hasActivity ? "Active" : "Getting started"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Lead → booking</dt>
            <dd className="font-medium text-slate-900">{leadToBooking}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Active campaigns</dt>
            <dd className="font-medium text-slate-900">{analytics.campaignPerformance.length}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Review requests</dt>
            <dd className="font-medium text-slate-900">{analytics.reviewRequestsSent}</dd>
          </div>
        </dl>
        {!hasActivity ? (
          <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
            Install website tracking, publish content, and send your first campaign to populate this
            dashboard.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function RiseMarketingDashboard({ slug, analytics }: Props) {
  const hasActivity =
    analytics.websiteVisits > 0 ||
    analytics.leads > 0 ||
    analytics.bookings > 0 ||
    analytics.campaignPerformance.length > 0;

  const metricCards = [
    {
      title: "Website visits",
      value: String(analytics.websiteVisits),
      footer: "Last 30 days",
      footerTone: analytics.websiteVisits > 0 ? ("positive" as const) : ("neutral" as const),
      href: companyAnalyticsPath(slug),
      icon: Globe,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Leads",
      value: String(analytics.leads),
      footer: "Captured this month",
      footerTone: analytics.leads > 0 ? ("positive" as const) : ("neutral" as const),
      href: companyAnalyticsPath(slug),
      icon: UserRound,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
    },
    {
      title: "Bookings",
      value: String(analytics.bookings),
      footer: "Attributed bookings",
      footerTone: analytics.bookings > 0 ? ("positive" as const) : ("neutral" as const),
      href: companyAnalyticsPath(slug),
      icon: TrendingUp,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "Conversion rate",
      value: `${analytics.conversionRate}%`,
      footer: "Visits → bookings",
      footerTone: analytics.conversionRate >= 5 ? ("positive" as const) : ("neutral" as const),
      href: companyAnalyticsPath(slug),
      icon: LineChart,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      title: "Quote requests",
      value: String(analytics.quoteRequests),
      footer: "From tracking events",
      footerTone: analytics.quoteRequests > 0 ? ("positive" as const) : ("neutral" as const),
      href: companyAnalyticsPath(slug),
      icon: FileText,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      title: "Review requests",
      value: String(analytics.reviewRequestsSent),
      footer: "Sent this month",
      footerTone: analytics.reviewRequestsSent > 0 ? ("positive" as const) : ("neutral" as const),
      href: companyReviewsPath(slug),
      icon: Star,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      title: "Campaign revenue",
      value: `R${(analytics.campaignRevenueCents / 100).toFixed(0)}`,
      footer: "From sent campaigns",
      footerTone: analytics.campaignRevenueCents > 0 ? ("positive" as const) : ("neutral" as const),
      href: companyCampaignsPath(slug),
      icon: Mail,
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
    },
  ];

  return (
    <div className="bg-[#f0f2f5] px-4 py-4 sm:px-5 sm:py-5">
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-medium text-slate-800">Marketing</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track leads, conversions, campaign performance, and where your bookings come from.
            </p>
          </div>
          <div className="flex shrink-0 flex-row flex-nowrap items-center gap-2">
            <Link href={companyAnalyticsPath(slug)} className={riseOutlineButtonClassName}>
              Full analytics
            </Link>
            <Link href={companyCampaignsPath(slug)} className={risePrimaryButtonClassName}>
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              New campaign
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
            emptyMessage="No attribution data yet. Connect tracking or add UTM tags to booking links."
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
            emptyMessage="No page visit data yet. Install the tracking script on your site."
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
            emptyMessage="No campaigns sent yet. Create one in Email campaigns."
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
          <GrowthToolsCard slug={slug} />
          <AtAGlanceCard analytics={analytics} hasActivity={hasActivity} />
        </aside>
      </div>
    </div>
  );
}
