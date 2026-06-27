"use client";

import { Activity, AlertTriangle, Sparkles, Zap } from "lucide-react";

import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import {
  riseStatCardClassName,
  riseTableClassName,
  riseTableHeadRowClassName,
} from "@/lib/ui/rise-dashboard-styles";
import type { AdminApiUsageData } from "@/types/admin";

export function FaraiAdminApiUsage({ data }: { data: AdminApiUsageData }) {
  return (
    <AdminPageShell
      title="API Usage"
      description="Platform API requests, failures, and rate limits"
      actions={<AdminActivityBellLink />}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Requests", value: data.totalRequests, icon: Activity },
          { label: "Failed Requests", value: data.failedRequests, icon: AlertTriangle },
          { label: "Rate Limit Hits", value: data.rateLimitEvents, icon: Zap },
          { label: "Requests Today", value: data.requestsToday, icon: Sparkles },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={riseStatCardClassName}>
              <Icon className="mb-2 h-4 w-4 text-[#5a8dee]" />
              <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
              <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {data.topRoutes.length > 0 ? (
        <div className={riseStatCardClassName}>
          <h2 className="text-sm font-bold text-slate-900">Top routes</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.topRoutes.map((route) => (
              <span
                key={route.route}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {route.route} <span className="text-slate-400">({route.count})</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className={riseTableClassName}>
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">Recent API logs</h2>
          <p className="mt-0.5 text-xs text-slate-500">Failure rate: {data.failureRatePercent}%</p>
        </div>
        {data.recentLogs.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-400">
            API logs appear as instrumented routes are called
          </div>
        ) : (
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className={riseTableHeadRowClassName}>
                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Route
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Method
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Business
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recentLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-6 py-3.5 text-xs font-medium text-slate-900">{log.route}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{log.method}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                        log.statusCode >= 400 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {log.statusCode}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{log.businessName ?? "—"}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{log.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminPageShell>
  );
}
