"use client";

import { Mail } from "lucide-react";

import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import {
  riseStatCardClassName,
  riseTableClassName,
  riseTableHeadRowClassName,
} from "@/lib/ui/rise-dashboard-styles";
import type { AdminEmailsData } from "@/types/admin";

export function FaraiAdminEmails({ data }: { data: AdminEmailsData }) {
  return (
    <AdminPageShell
      title="Emails"
      description="Platform email delivery monitoring"
      actions={<AdminActivityBellLink />}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Emails Sent", value: data.totalSent },
          { label: "Delivery Rate", value: `${data.deliveryRate}%` },
          { label: "Failed Emails", value: data.failedCount },
          { label: "Sent Today", value: data.sentToday },
        ].map((stat) => (
          <div key={stat.label} className={riseStatCardClassName}>
            <Mail className="mb-2 h-4 w-4 text-sky-500" />
            <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
            <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className={riseTableClassName}>
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">Recent delivery logs</h2>
          <p className="mt-0.5 text-xs text-slate-500">Provider: Resend (primary)</p>
        </div>
        {data.recentLogs.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-400">
            Email logs appear as platform emails are sent
          </div>
        ) : (
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className={riseTableHeadRowClassName}>
                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  To
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Template
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
                  <td className="px-6 py-3.5 text-xs text-slate-900">{log.to}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{log.subject ?? "—"}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{log.template ?? "—"}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`rounded-lg px-2 py-1 text-[10px] font-bold capitalize ${
                        log.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {log.status}
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
