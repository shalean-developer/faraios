"use client";

import { Clock } from "lucide-react";

import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import type { AdminCronData } from "@/types/admin";

export function FaraiAdminCron({ data }: { data: AdminCronData }) {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Cron Jobs</h1>
          <p className="mt-0.5 text-xs text-gray-400">Scheduled platform jobs and run history</p>
        </div>
        <AdminActivityBellLink />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-2xl font-extrabold text-gray-900">{data.jobs.length}</p>
              <p className="text-xs font-semibold text-gray-500">Registered jobs</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-2xl font-extrabold text-gray-900">{data.overallSuccessRate}%</p>
              <p className="text-xs font-semibold text-gray-500">Recent success rate</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-2xl font-extrabold text-gray-900">{data.recentRuns.length}</p>
              <p className="text-xs font-semibold text-gray-500">Recent runs logged</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-50 px-6 py-4">
                <h2 className="text-sm font-bold text-gray-900">Job registry</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {data.jobs.map((job) => (
                  <div key={job.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{job.name}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{job.description ?? job.id}</p>
                        <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                          <Clock className="h-3 w-3" />
                          {job.schedule}
                        </p>
                      </div>
                      <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                        job.lastStatus === "failed"
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {job.successRate}% ok
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] text-gray-400">
                      Last run: {job.lastRun ?? "No runs logged yet"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-50 px-6 py-4">
                <h2 className="text-sm font-bold text-gray-900">Recent runs</h2>
              </div>
              {data.recentRuns.length === 0 ? (
                <div className="py-14 text-center text-sm text-gray-400">
                  Runs appear here once cron instrumentation records them
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {data.recentRuns.map((run) => (
                    <li key={run.id} className="flex items-center justify-between gap-3 px-6 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-gray-900">{run.jobName}</p>
                        <p className="text-[10px] text-gray-400">{run.startedAt} · {run.durationMs}ms</p>
                      </div>
                      <span className={`rounded-lg px-2 py-1 text-[10px] font-bold capitalize ${
                        run.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}>
                        {run.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
