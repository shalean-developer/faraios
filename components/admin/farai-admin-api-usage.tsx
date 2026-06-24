"use client";

import { motion } from "framer-motion";
import { Activity, AlertTriangle, Sparkles, Zap } from "lucide-react";

import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import type { AdminApiUsageData } from "@/types/admin";

export function FaraiAdminApiUsage({ data }: { data: AdminApiUsageData }) {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">API Usage</h1>
          <p className="mt-0.5 text-xs text-gray-400">Platform API requests, failures, and rate limits</p>
        </div>
        <AdminActivityBellLink />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Requests", value: data.totalRequests, icon: Activity },
              { label: "Failed Requests", value: data.failedRequests, icon: AlertTriangle },
              { label: "Rate Limit Hits", value: data.rateLimitEvents, icon: Zap },
              { label: "Requests Today", value: data.requestsToday, icon: Sparkles },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <Icon className="mb-2 h-4 w-4 text-indigo-500" />
                  <p className="text-2xl font-extrabold text-gray-900">{stat.value}</p>
                  <p className="text-xs font-semibold text-gray-500">{stat.label}</p>
                </div>
              );
            })}
          </div>

          {data.topRoutes.length > 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">Top routes</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.topRoutes.map((route) => (
                  <span key={route.route} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
                    {route.route} <span className="text-gray-400">({route.count})</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-50 px-6 py-4">
              <h2 className="text-sm font-bold text-gray-900">Recent API logs</h2>
              <p className="mt-0.5 text-xs text-gray-400">Failure rate: {data.failureRatePercent}%</p>
            </div>
            {data.recentLogs.length === 0 ? (
              <div className="py-14 text-center text-sm text-gray-400">
                API logs appear as instrumented routes are called
              </div>
            ) : (
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/80">
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Route</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Method</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Business</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 last:border-b-0">
                      <td className="px-6 py-3.5 text-xs font-medium text-gray-900">{log.route}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">{log.method}</td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                          log.statusCode >= 400 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">{log.businessName ?? "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{log.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
