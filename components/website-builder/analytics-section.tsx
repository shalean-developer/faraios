"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Gauge, LineChart, MousePointerClick, Search, Smartphone } from "lucide-react";

import { companyAnalyticsPath, companyWebsiteBuilderSectionPath } from "@/lib/paths/company";
import { formatWebVitalValue } from "@/lib/website-builder/analytics";
import { cn } from "@/lib/utils";
import type { BuilderAnalytics, WebVitalRating } from "@/types/website-builder-analytics";
import type { BuilderWebsite } from "@/types/website-builder";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";

import { ScoreRing } from "./seo/seo-ui";

type Props = {
  slug: string;
  company: SubscriptionCompanyFields;
  website: BuilderWebsite;
  analytics: BuilderAnalytics;
};

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

function ratingClass(rating: WebVitalRating): string {
  if (rating === "good") return "text-emerald-600 bg-emerald-50";
  if (rating === "poor") return "text-red-600 bg-red-50";
  return "text-amber-600 bg-amber-50";
}

function seoScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
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

export function AnalyticsSection({ slug, analytics }: Props) {
  const periodLabel = `Last ${analytics.periodDays} days`;
  const avgSeoScore =
    analytics.pages.length > 0
      ? Math.round(
          analytics.pages.reduce((sum, page) => sum + page.seoScore, 0) / analytics.pages.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Page views" value={String(analytics.totalViews)} hint={periodLabel} highlight />
        <MetricCard
          label="Clicks"
          value={String(analytics.totalClicks)}
          hint="Links and buttons"
        />
        <MetricCard
          label="Conversions"
          value={String(analytics.totalConversions)}
          hint="Contact, booking, quote"
        />
        <MetricCard
          label="Conversion rate"
          value={`${analytics.conversionRate}%`}
          hint="Views → conversions"
        />
        <MetricCard label="Avg SEO score" value={`${avgSeoScore}`} hint="Across site pages" />
      </div>

      {!analytics.hasData ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <LineChart className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-800">No analytics data yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Publish your site and share the public URL. Page views, clicks, conversions, and Core
            Web Vitals will appear here automatically.
          </p>
        </section>
      ) : null}

      <DataTable
        title="Per-page performance"
        description="Views, conversions, and SEO score by page"
        emptyMessage="No pages tracked yet."
        headers={["Page", "Views", "Clicks", "Conversions", "Rate", "SEO"]}
        rows={analytics.pages.map((page) => ({
          key: page.path,
          cells: [
            <div key="label">
              <p className="font-medium text-slate-900">{page.label}</p>
              <p className="text-xs text-slate-400">{page.path}</p>
            </div>,
            page.views,
            page.clicks,
            page.conversions,
            page.views > 0 ? `${page.conversionRate}%` : "—",
            <span key="seo" className={cn("font-semibold", seoScoreColor(page.seoScore))}>
              {page.seoScore}
            </span>,
          ],
        }))}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-violet-600" />
              <h2 className="text-sm font-semibold text-slate-900">Core Web Vitals</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">75th percentile from real visitors ({periodLabel})</p>
          </div>
          <div className="p-5">
            {analytics.webVitals.length === 0 ? (
              <p className="text-sm text-slate-500">
                Web Vitals will populate after visitors load your published site.
              </p>
            ) : (
              <ul className="space-y-3">
                {analytics.webVitals.map((vital) => (
                  <li
                    key={vital.name}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{vital.name}</p>
                      <p className="text-xs text-slate-400">{vital.sampleCount} samples</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatWebVitalValue(vital.name, vital.p75)}
                      </p>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          ratingClass(vital.rating)
                        )}
                      >
                        {vital.rating.replace("-", " ")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-violet-600" />
                <h2 className="text-sm font-semibold text-slate-900">Top clicks</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">Most clicked links and buttons ({periodLabel})</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {analytics.topClicks.length === 0 ? (
                <li className="px-5 py-6 text-sm text-slate-500">No click data yet.</li>
              ) : (
                analytics.topClicks.map((row) => (
                  <li key={`${row.label}-${row.href ?? ""}`} className="px-5 py-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{row.label}</p>
                        {row.href ? (
                          <p className="truncate text-xs text-slate-400">{row.href}</p>
                        ) : (
                          <p className="text-xs capitalize text-slate-400">{row.element}</p>
                        )}
                      </div>
                      <span className="shrink-0 font-medium text-slate-900">{row.count}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Traffic sources</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {analytics.topReferrers.length === 0 ? (
                <li className="px-5 py-6 text-sm text-slate-500">No referrer data yet.</li>
              ) : (
                analytics.topReferrers.map((row) => (
                  <li key={row.source} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-slate-700">{row.source}</span>
                    <span className="font-medium text-slate-900">{row.count}</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-violet-600" />
                <h2 className="text-sm font-semibold text-slate-900">Devices</h2>
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {analytics.deviceBreakdown.length === 0 ? (
                <li className="px-5 py-6 text-sm text-slate-500">No device data yet.</li>
              ) : (
                analytics.deviceBreakdown.map((row) => (
                  <li key={row.device} className="flex items-center justify-between px-5 py-3 text-sm capitalize">
                    <span className="text-slate-700">{row.device}</span>
                    <span className="font-medium text-slate-900">{row.count}</span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <ScoreRing score={avgSeoScore} label="SEO" size={96} />
            <div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-violet-600" />
                <h3 className="text-sm font-semibold text-slate-900">SEO health</h3>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Per-page SEO scores are based on title, description, and length best practices.
              </p>
              <Link
                href={companyWebsiteBuilderSectionPath(slug, "seo")}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
              >
                Open SEO editor
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Marketing analytics</h3>
          <p className="mt-2 text-sm text-slate-500">
            Campaign performance, lead funnels, and revenue attribution live in the growth dashboard.
          </p>
          <Link
            href={companyAnalyticsPath(slug)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
          >
            Full analytics dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>
    </div>
  );
}
