"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import type { SeoV10DashboardData } from "@/types/seo-v10";

export function SeoV10Overview({
  auditScore,
  v10,
}: {
  auditScore: number;
  v10: SeoV10DashboardData;
}) {
  const chartData = v10.healthHistory.map((h) => ({
    date: h.recorded_at,
    score: h.seo_score,
    health: h.health_score,
  }));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">SEO Platform V10</h2>
          <p className="text-sm text-slate-500">
            Enterprise SEO health, crawl history, and issue tracking.
          </p>
        </div>
        {v10.latestCrawl ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Last crawl: {new Date(v10.latestCrawl.completed_at ?? v10.latestCrawl.started_at).toLocaleDateString()}
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            No crawl yet — run your first scan
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <V10Card label="SEO score" value={`${auditScore}/100`} highlight />
        <V10Card label="Website health" value={`${v10.healthScore}/100`} />
        <V10Card label="Pages scanned" value={String(v10.pagesScanned)} />
        <V10Card label="Critical issues" value={String(v10.criticalIssues)} warn={v10.criticalIssues > 0} />
        <V10Card label="Warnings" value={String(v10.warnings)} />
        <V10Card label="Passed checks" value={String(v10.passedChecks)} good />
        <V10Card label="Sitemap" value={v10.sitemap?.status ?? "pending"} capitalize />
        <V10Card label="Robots.txt" value={v10.robotsStatus} capitalize />
        <V10Card label="Schema" value={v10.schemas.length > 0 ? "ok" : "partial"} capitalize />
        <V10Card label="Redirect issues" value={String(v10.redirectIssues)} />
        <V10Card label="404 errors" value={String(v10.notFoundIssues)} />
        <V10Card label="Image SEO issues" value={String(v10.imageSeoIssues)} />
      </div>

      {chartData.length > 1 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">SEO trend history</h3>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2} dot={false} name="SEO score" />
                <Line type="monotone" dataKey="health" stroke="#10b981" strokeWidth={2} dot={false} name="Health" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function V10Card({
  label,
  value,
  highlight,
  capitalize,
  warn,
  good,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  capitalize?: boolean;
  warn?: boolean;
  good?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/70 to-white p-4 shadow-sm"
          : warn
            ? "rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-sm"
            : good
              ? "rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm"
              : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      }
    >
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold text-slate-900 ${capitalize ? "capitalize" : ""}`}>
        {value}
      </p>
    </div>
  );
}
