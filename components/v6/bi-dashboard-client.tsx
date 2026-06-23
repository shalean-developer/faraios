"use client";

import { formatRevenue } from "@/lib/operations/metrics";
import type { BiMetrics } from "@/types/v6-engine";

import { MetricCard } from "@/app/[company]/dashboard/insights/company-insights-client";

/** @deprecated Use CompanyInsightsClient with health score on the insights page. */
export function BiDashboardClient({ metrics }: { metrics: BiMetrics }) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Revenue</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Today" value={formatRevenue(metrics.revenue.todayCents)} />
          <MetricCard label="This week" value={formatRevenue(metrics.revenue.weekCents)} />
          <MetricCard
            label="This month"
            value={formatRevenue(metrics.revenue.monthCents)}
            trend={metrics.revenue.growthPercent}
          />
          <MetricCard label="This year" value={formatRevenue(metrics.revenue.yearCents)} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Bookings</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total bookings" value={String(metrics.bookings.total)} />
          <MetricCard label="Completed" value={String(metrics.bookings.completed)} />
          <MetricCard label="Cancelled" value={String(metrics.bookings.cancelled)} />
          <MetricCard
            label="Conversion rate"
            value={`${metrics.bookings.conversionRate}%`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Customers</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="New customers" value={String(metrics.customers.new)} />
          <MetricCard label="Returning" value={String(metrics.customers.returning)} />
          <MetricCard label="Active" value={String(metrics.customers.active)} />
          <MetricCard label="Churn risk" value={String(metrics.customers.churnRisk)} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Operations</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Staff utilization"
            value={`${metrics.operations.staffUtilization}%`}
          />
          <MetricCard
            label="Average job value"
            value={formatRevenue(metrics.operations.averageJobValueCents)}
          />
          <MetricCard
            label="Avg response time"
            value={`${metrics.operations.averageResponseHours}h`}
          />
          <MetricCard
            label="Completion rate"
            value={`${metrics.operations.completionRate}%`}
          />
        </div>
      </section>
    </div>
  );
}

export { MetricCard };
