"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  DollarSign,
  LineChart,
  Megaphone,
  Search,
  Sparkles,
} from "lucide-react";

import type { MarketingAnalyticsSummary } from "@/lib/services/marketing-analytics";
import { cn } from "@/lib/utils";
import type { MarketingAnalytics } from "@/types/growth-engine";

function MetricCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm",
        highlight
          ? "border-2 border-violet-200 bg-gradient-to-br from-violet-50/70 to-white"
          : "border-slate-200 bg-white"
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function DataTable({
  title,
  description,
  emptyMessage,
  headers,
  rows,
}: {
  title: string;
  description?: string;
  emptyMessage: string;
  headers: string[];
  rows: { key: string; cells: ReactNode[] }[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              {headers.map((header) => (
                <th key={header} className="px-5 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-5 py-8 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key}>
                  {row.cells.map((cell, index) => (
                    <td key={index} className="px-5 py-3">
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
        <div className="h-full rounded-full bg-violet-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function CompanyAnalyticsClient({
  slug,
  analytics,
  summary,
}: {
  slug: string;
  analytics: MarketingAnalytics;
  summary: MarketingAnalyticsSummary;
}) {
  const funnelMax = Math.max(
    analytics.websiteVisits,
    analytics.leads,
    analytics.bookings,
    analytics.quoteRequests,
    1
  );

  const statCards = [
    { label: "Website visits", value: String(analytics.websiteVisits), hint: "Last 30 days" },
    { label: "Leads", value: String(analytics.leads), hint: "Form & contact captures" },
    { label: "Bookings", value: String(analytics.bookings), hint: "Completed in period" },
    {
      label: "Visit → booking",
      value: `${analytics.conversionRate}%`,
      hint: "Overall conversion",
      highlight: true,
    },
    { label: "Quote requests", value: String(analytics.quoteRequests), hint: "Tracking events" },
    {
      label: "Visit → lead",
      value: summary.visitToLeadRate > 0 ? `${summary.visitToLeadRate}%` : "—",
      hint: "Top-of-funnel",
    },
    {
      label: "Lead → booking",
      value: summary.leadToBookingRate > 0 ? `${summary.leadToBookingRate}%` : "—",
      hint: "Pipeline close rate",
    },
    {
      label: "Campaign revenue",
      value: `R${(analytics.campaignRevenueCents / 100).toFixed(0)}`,
      hint: `${analytics.campaignPerformance.length} sent campaign(s)`,
    },
  ];

  const quickLinks = [
    { href: `/${encodeURIComponent(slug)}/dashboard/marketing`, label: "Marketing overview", icon: Megaphone },
    { href: `/${encodeURIComponent(slug)}/dashboard/insights`, label: "Business insights", icon: Sparkles },
    { href: `/${encodeURIComponent(slug)}/dashboard/revenue`, label: "Revenue", icon: DollarSign },
    { href: `/${encodeURIComponent(slug)}/dashboard/websites/tracking`, label: "Website tracking", icon: LineChart },
    { href: `/${encodeURIComponent(slug)}/dashboard/seo`, label: "SEO dashboard", icon: Search },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <DataTable
            title="Top lead sources"
            description="Booking attribution by UTM source, referrer, or website over the last 30 days."
            emptyMessage="No attribution data yet. Add UTM parameters to booking links or connect website tracking."
            headers={["Source", "Bookings"]}
            rows={analytics.topSources.map((row) => ({
              key: row.source,
              cells: [
                <span className="font-medium text-slate-900">{row.source}</span>,
                <span className="text-right font-medium">{row.count}</span>,
              ],
            }))}
          />

          <DataTable
            title="Top service pages"
            description="Most visited paths from page views and booking form impressions."
            emptyMessage="No page data yet. Install the tracking script from Website → Tracking."
            headers={["Page", "Visits"]}
            rows={analytics.topServicePages.map((row) => ({
              key: row.page,
              cells: [
                <span className="font-mono text-xs text-slate-700">{row.page}</span>,
                <span className="text-right font-medium">{row.count}</span>,
              ],
            }))}
          />

          <DataTable
            title="Campaign performance"
            description="Email campaign delivery and attributed bookings/revenue."
            emptyMessage="No sent campaigns yet. Create and send a campaign to see ROI here."
            headers={["Campaign", "Sent", "Bookings", "Revenue"]}
            rows={analytics.campaignPerformance.map((row) => ({
              key: row.name,
              cells: [
                row.name,
                <span className="text-right">{row.sentCount}</span>,
                <span className="text-right">{row.bookingsGenerated}</span>,
                <span className="text-right font-medium">
                  R{(row.revenueCents / 100).toFixed(0)}
                </span>,
              ],
            }))}
          />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Conversion funnel</h3>
            <p className="mt-1 text-xs text-slate-500">Last 30 days</p>
            <div className="mt-4 space-y-4">
              <FunnelBar label="Website visits" value={analytics.websiteVisits} max={funnelMax} />
              <FunnelBar label="Leads" value={analytics.leads} max={funnelMax} />
              <FunnelBar label="Quote requests" value={analytics.quoteRequests} max={funnelMax} />
              <FunnelBar label="Bookings" value={analytics.bookings} max={funnelMax} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Highlights</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Top source</dt>
                <dd className="truncate font-medium text-slate-900">
                  {summary.topSource ?? "—"}
                </dd>
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

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Related dashboards</h3>
            <ul className="mt-3 space-y-1">
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-violet-800"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                    {label}
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
