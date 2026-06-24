"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, FileText, Mail, MessageSquare, Search } from "lucide-react";

import type { MarketingAnalytics } from "@/types/growth-engine";
import { cn } from "@/lib/utils";

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

export function CompanyMarketingClient({
  slug,
  analytics,
}: {
  slug: string;
  analytics: MarketingAnalytics;
}) {
  const base = `/${encodeURIComponent(slug)}/dashboard`;

  const statCards = [
    {
      label: "Website visits",
      value: String(analytics.websiteVisits),
      hint: "Last 30 days",
    },
    {
      label: "Leads",
      value: String(analytics.leads),
      hint: "Captured this month",
    },
    {
      label: "Bookings",
      value: String(analytics.bookings),
      hint: "Attributed bookings",
    },
    {
      label: "Conversion rate",
      value: `${analytics.conversionRate}%`,
      hint: "Visits → bookings",
      highlight: true,
    },
    {
      label: "Quote requests",
      value: String(analytics.quoteRequests),
      hint: "From tracking events",
    },
    {
      label: "Review requests",
      value: String(analytics.reviewRequestsSent),
      hint: "Sent this month",
    },
    {
      label: "Campaign revenue",
      value: `R${(analytics.campaignRevenueCents / 100).toFixed(0)}`,
      hint: "From sent campaigns",
    },
  ];

  const quickLinks = [
    { href: `${base}/campaigns`, label: "Email campaigns", icon: Mail },
    { href: `${base}/content`, label: "Content library", icon: FileText },
    { href: `${base}/reviews`, label: "Review requests", icon: MessageSquare },
    { href: `${base}/seo`, label: "SEO dashboard", icon: Search },
    { href: `${base}/analytics`, label: "Full analytics", icon: BarChart3 },
  ];

  const hasActivity =
    analytics.websiteVisits > 0 ||
    analytics.leads > 0 ||
    analytics.bookings > 0 ||
    analytics.campaignPerformance.length > 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            hint={card.hint}
            highlight={card.highlight}
          />
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <DataTable
            title="Top lead sources"
            description="Where your bookings are coming from over the last 30 days."
            emptyMessage="No attribution data yet. Connect tracking or add UTM tags to booking links."
            headers={["Source", "Bookings"]}
            rows={analytics.topSources.map((row) => ({
              key: row.source,
              cells: [
                <span key="source" className="font-medium text-slate-900">{row.source}</span>,
                <span key="count" className="text-right font-medium">{row.count}</span>,
              ],
            }))}
          />

          <DataTable
            title="Top service pages"
            description="Most visited paths from website tracking."
            emptyMessage="No page visit data yet. Install the tracking script on your site."
            headers={["Page", "Visits"]}
            rows={analytics.topServicePages.map((row) => ({
              key: row.page,
              cells: [
                <span key="page" className="font-mono text-xs text-slate-700">{row.page}</span>,
                <span key="visits" className="text-right font-medium">{row.count}</span>,
              ],
            }))}
          />

          <DataTable
            title="Campaign performance"
            description="Results from email campaigns marked as sent."
            emptyMessage="No campaigns sent yet. Create one in Email campaigns."
            headers={["Campaign", "Sent", "Bookings", "Revenue"]}
            rows={analytics.campaignPerformance.map((row) => ({
              key: row.name,
              cells: [
                <span key="name">{row.name}</span>,
                <span key="sent" className="text-right">{row.sentCount}</span>,
                <span key="bookings" className="text-right">{row.bookingsGenerated}</span>,
                <span key="revenue" className="text-right font-medium">
                  R{(row.revenueCents / 100).toFixed(0)}
                </span>,
              ],
            }))}
          />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Growth toolkit</h3>
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

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">At a glance</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Pipeline health</dt>
                <dd className="font-medium text-slate-900">
                  {hasActivity ? "Active" : "Getting started"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Lead → booking</dt>
                <dd className="font-medium text-slate-900">
                  {analytics.leads > 0
                    ? `${Math.round((analytics.bookings / analytics.leads) * 100)}%`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Active campaigns</dt>
                <dd className="font-medium text-slate-900">
                  {analytics.campaignPerformance.length}
                </dd>
              </div>
            </dl>
            {!hasActivity ? (
              <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
                Install website tracking, publish content, and send your first campaign to populate
                this dashboard.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
