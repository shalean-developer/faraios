"use client";

import Link from "next/link";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import {
  AdminHostingNav,
  formatHostingAmount,
  HostingStatusBadge,
} from "@/components/hosting/hosting-shared-ui";
import {
  riseStatCardClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { formatDateTimeEnZA } from "@/lib/format/dates";
import type { AdminHostingOverviewData } from "@/lib/services/hosting-admin";

export function FaraiAdminHostingOverview({ data }: { data: AdminHostingOverviewData }) {
  const stats = [
    { label: "Hosting customers", value: data.totalCustomers },
    { label: "Domains", value: data.totalDomains },
    { label: "Active services", value: data.activeServices },
    { label: "Suspended", value: data.suspendedServices },
    { label: "Failed orders", value: data.failedOrders },
    { label: "Disk usage (MB)", value: data.diskUsageMb },
    { label: "Mailboxes used", value: data.mailboxUsage },
    { label: "Databases used", value: data.databaseUsage },
    { label: "Revenue", value: formatHostingAmount(data.totalRevenueCents) },
  ];

  return (
    <AdminPageShell
      title="Hosting"
      description="Orders, services, and provisioning"
      actions={<AdminActivityBellLink />}
    >
      <AdminHostingNav />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className={riseStatCardClassName}>
            <p className="text-xl font-extrabold text-slate-900">{stat.value}</p>
            <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {data.apiConnectionStatus && (
        <div className={riseStatCardClassName}>
          <p className="text-xs font-semibold text-slate-500">Plesk API connection</p>
          <div className="mt-1 flex items-center gap-2">
            <HostingStatusBadge status={data.apiConnectionStatus === "connected" ? "success" : "failed"} />
            <span className="text-sm text-slate-700">{data.apiConnectionStatus.replace(/_/g, " ")}</span>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={riseStatCardClassName}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Recent orders</h2>
            <Link href="/admin/hosting/orders" className="text-xs font-semibold text-[#5a8dee]">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentOrders.slice(0, 8).map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{order.domain_name}</p>
                  <p className="text-xs text-slate-500">{order.billing_cycle}</p>
                </div>
                <HostingStatusBadge status={order.status} />
              </div>
            ))}
          </div>
        </section>

        <section className={riseStatCardClassName}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Provisioning logs</h2>
            <Link href="/admin/hosting/provisioning-logs" className="text-xs font-semibold text-[#5a8dee]">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{log.action}</p>
                  <p className="text-xs text-slate-500">{formatDateTimeEnZA(log.created_at)}</p>
                </div>
                <HostingStatusBadge status={log.status} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
