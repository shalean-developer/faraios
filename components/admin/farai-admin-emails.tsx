"use client";

import { Mail, Sparkles } from "lucide-react";

import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import type { AdminEmailsData } from "@/types/admin";

export function FaraiAdminEmails({ data }: { data: AdminEmailsData }) {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Emails</h1>
          <p className="mt-0.5 text-xs text-gray-400">Platform email delivery monitoring</p>
        </div>
        <AdminActivityBellLink />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Emails Sent", value: data.totalSent },
              { label: "Delivery Rate", value: `${data.deliveryRate}%` },
              { label: "Failed Emails", value: data.failedCount },
              { label: "Sent Today", value: data.sentToday },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <Mail className="mb-2 h-4 w-4 text-sky-500" />
                <p className="text-2xl font-extrabold text-gray-900">{stat.value}</p>
                <p className="text-xs font-semibold text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-50 px-6 py-4">
              <h2 className="text-sm font-bold text-gray-900">Recent delivery logs</h2>
              <p className="mt-0.5 text-xs text-gray-400">Provider: Resend (primary)</p>
            </div>
            {data.recentLogs.length === 0 ? (
              <div className="py-14 text-center text-sm text-gray-400">
                Email logs appear as platform emails are sent
              </div>
            ) : (
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/80">
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">To</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Subject</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Template</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Business</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 last:border-b-0">
                      <td className="px-6 py-3.5 text-xs text-gray-900">{log.to}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">{log.subject ?? "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">{log.template ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-lg px-2 py-1 text-[10px] font-bold capitalize ${
                          log.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}>
                          {log.status}
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
