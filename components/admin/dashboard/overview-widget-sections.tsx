"use client";

import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock4,
  CreditCard,
  Eye,
  GitBranch,
  Globe,
  Layers,
  LifeBuoy,
  Lightbulb,
  Server,
  ShoppingBag,
  Sparkles,
  Store,
  Timer,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";

import { BusinessGrowthChart } from "@/components/admin/dashboard/business-growth-chart";
import { PlatformHealthIssues } from "@/components/admin/dashboard/platform-health-issues";
import { PlatformHealthPill } from "@/components/admin/dashboard/platform-health-pill";
import { PlatformMetricCard } from "@/components/admin/dashboard/platform-metric-card";
import { PlatformPanel } from "@/components/admin/dashboard/platform-panel";
import { PlatformSectionHeading } from "@/components/admin/dashboard/platform-section-heading";
import {
  ADMIN_BUSINESSES_PATH,
  ADMIN_PIPELINE_PATH,
} from "@/lib/constants/admin-nav";
import { formatTicketNumber } from "@/lib/format/admin-tickets";
import type { AdminPlatformOverviewMetrics } from "@/types/admin";
import type { PlatformOverviewWidgetId } from "@/types/platform-dashboard";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAuditAction(action: string): string {
  return action.replace(/_/g, " ");
}

export function renderOverviewWidgetSection(
  widgetId: PlatformOverviewWidgetId,
  metrics: AdminPlatformOverviewMetrics,
  settingsHref: string
): ReactNode {
  switch (widgetId) {
    case "system_health":
      {
        const issues = metrics.systemHealthIssues ?? [];
        const issueDetail = (key: (typeof issues)[number]["key"]) =>
          issues.find((issue) => issue.key === key)?.summary;

        return (
        <div className="space-y-3">
          <PlatformSectionHeading
            title="System Health"
            links={[
              { href: "/admin/api-usage", label: "API" },
              { href: "/admin/cron", label: "Cron" },
              { href: "/admin/emails", label: "Email" },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <PlatformHealthPill label="API" status={metrics.systemHealth.api} detail={issueDetail("api")} />
            <PlatformHealthPill label="Cron" status={metrics.systemHealth.cron} detail={issueDetail("cron")} />
            <PlatformHealthPill label="Email" status={metrics.systemHealth.email} detail={issueDetail("email")} />
            <PlatformHealthPill label="Queue" status={metrics.systemHealth.queue} detail={issueDetail("queue")} />
            <PlatformHealthPill label="Hosting" status={metrics.systemHealth.hosting} detail={issueDetail("hosting")} />
            <PlatformHealthPill label="Websites" status={metrics.systemHealth.websites} detail={issueDetail("websites")} />
            <PlatformHealthPill label="Domains" status={metrics.systemHealth.domains} detail={issueDetail("domains")} />
            <PlatformHealthPill label="SSL" status={metrics.systemHealth.ssl} detail={issueDetail("ssl")} />
          </div>
          <PlatformHealthIssues issues={issues} />
        </div>
        );
      }

    case "platform_metrics":
      return (
        <div className="space-y-3">
          <PlatformSectionHeading title="Platform Metrics" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <PlatformMetricCard
              label="Total Businesses"
              value={metrics.businesses.total}
              icon={Building2}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              accent="from-indigo-500 to-violet-500"
            />
            <PlatformMetricCard
              label="Active Businesses"
              value={metrics.businesses.active}
              icon={CheckCircle2}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              accent="from-emerald-400 to-teal-400"
            />
            <PlatformMetricCard
              label="Trial Businesses"
              value={metrics.businesses.trial}
              icon={Clock4}
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
              accent="from-sky-400 to-blue-400"
            />
            <PlatformMetricCard
              label="Suspended"
              value={metrics.businesses.suspended}
              icon={AlertCircle}
              iconBg="bg-red-50"
              iconColor="text-red-600"
              accent="from-red-400 to-rose-400"
            />
            <PlatformMetricCard
              label="New This Month"
              value={metrics.businesses.newThisMonth}
              icon={TrendingUp}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              accent="from-violet-400 to-purple-400"
            />
          </div>
        </div>
      );

    case "user_revenue":
      return (
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-3">
            <PlatformSectionHeading title="User Metrics" />
            <div className="grid grid-cols-2 gap-3">
              <PlatformMetricCard
                label="Total Users"
                value={metrics.users.total}
                icon={Users}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                accent="from-blue-400 to-indigo-400"
              />
              <PlatformMetricCard
                label="Active Users"
                value={metrics.users.active}
                icon={Users}
                iconBg="bg-cyan-50"
                iconColor="text-cyan-600"
                accent="from-cyan-400 to-teal-400"
              />
              <PlatformMetricCard
                label="New This Month"
                value={metrics.users.newThisMonth}
                icon={Calendar}
                iconBg="bg-indigo-50"
                iconColor="text-indigo-600"
                accent="from-indigo-400 to-violet-400"
              />
              <PlatformMetricCard
                label="Growth Rate"
                value={metrics.users.growthRatePercent}
                suffix="%"
                icon={TrendingUp}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                accent="from-emerald-400 to-green-400"
              />
            </div>
          </div>
          <div className="space-y-3">
            <PlatformSectionHeading
              title="Revenue Metrics"
              links={[{ href: "/admin/revenue", label: "Full report" }]}
            />
            <div className="grid grid-cols-2 gap-3">
              <PlatformMetricCard
                label="MRR"
                value={formatCurrency(metrics.revenue.mrr)}
                icon={CreditCard}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                accent="from-emerald-400 to-teal-400"
              />
              <PlatformMetricCard
                label="ARR"
                value={formatCurrency(metrics.revenue.arr)}
                icon={TrendingUp}
                iconBg="bg-green-50"
                iconColor="text-green-600"
                accent="from-green-400 to-emerald-400"
              />
              <PlatformMetricCard
                label="Active Subscriptions"
                value={metrics.revenue.activeSubscriptions}
                icon={CheckCircle2}
                iconBg="bg-indigo-50"
                iconColor="text-indigo-600"
                accent="from-indigo-400 to-blue-400"
              />
              <PlatformMetricCard
                label="Churn Rate"
                value={metrics.revenue.churnRatePercent}
                suffix="%"
                icon={Activity}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
                accent="from-amber-400 to-orange-400"
              />
            </div>
            {metrics.revenue.failedPayments > 0 ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {metrics.revenue.failedPayments} failed payment
                {metrics.revenue.failedPayments === 1 ? "" : "s"} in the last 30 days.{" "}
                <Link href="/admin/revenue" className="font-semibold underline">
                  Review revenue
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      );

    case "business_growth":
      return (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-bold text-gray-900">Business growth</h2>
            <p className="mt-0.5 text-xs text-gray-400">New businesses over the last 6 months</p>
          </div>
          <BusinessGrowthChart data={metrics.businessGrowthTrend} />
        </div>
      );

    case "infrastructure":
      return (
        <div className="space-y-3">
          <PlatformSectionHeading
            title="Infrastructure"
            links={[
              { href: ADMIN_PIPELINE_PATH, label: "Pipeline" },
              { href: "/admin/hosting", label: "Hosting" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
            <PlatformMetricCard
              label="Pipeline In Progress"
              value={metrics.infrastructure.pipelineInProgress}
              icon={GitBranch}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              accent="from-indigo-400 to-violet-400"
            />
            <PlatformMetricCard
              label="Pipeline In Review"
              value={metrics.infrastructure.pipelineInReview}
              icon={Eye}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              accent="from-violet-400 to-purple-400"
            />
            <PlatformMetricCard
              label="Pipeline Pending"
              value={metrics.infrastructure.pipelinePending}
              icon={Clock4}
              iconBg="bg-slate-50"
              iconColor="text-slate-600"
              accent="from-slate-400 to-gray-400"
            />
            <PlatformMetricCard
              label="Pending Hosting Orders"
              value={metrics.infrastructure.pendingHostingOrders}
              icon={Server}
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
              accent="from-sky-400 to-blue-400"
            />
            <PlatformMetricCard
              label="Failed Hosting Orders"
              value={metrics.infrastructure.failedHostingOrders}
              icon={AlertCircle}
              iconBg="bg-red-50"
              iconColor="text-red-600"
              accent="from-red-400 to-rose-400"
            />
            <PlatformMetricCard
              label="Pending Automation Jobs"
              value={metrics.infrastructure.pendingAutomationJobs}
              icon={Workflow}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              accent="from-amber-400 to-orange-400"
            />
            <PlatformMetricCard
              label="Failed Automation Jobs"
              value={metrics.infrastructure.failedAutomationJobs}
              icon={Timer}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
              accent="from-rose-400 to-red-400"
            />
          </div>
        </div>
      );

    case "marketplace":
      return (
        <div className="space-y-3">
          <PlatformSectionHeading title="Marketplace" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <PlatformMetricCard
              label="Active Listings"
              value={metrics.marketplace.activeListings}
              icon={Store}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              accent="from-emerald-400 to-teal-400"
            />
            <PlatformMetricCard
              label="Featured Listings"
              value={metrics.marketplace.featuredListings}
              icon={Sparkles}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              accent="from-violet-400 to-purple-400"
            />
            <PlatformMetricCard
              label="Marketplace Bookings (30d)"
              value={metrics.marketplace.marketplaceBookings30d}
              icon={ShoppingBag}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              accent="from-indigo-400 to-blue-400"
            />
          </div>
        </div>
      );

    case "operations":
      return (
        <div className="space-y-3">
          <PlatformSectionHeading
            title="Operations"
            links={[
              { href: "/admin/support", label: "Support" },
              { href: "/admin/feature-requests", label: "Feature requests" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <PlatformMetricCard
              label="Open Tickets"
              value={metrics.operations.openTickets}
              icon={LifeBuoy}
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
              accent="from-sky-400 to-blue-400"
            />
            <PlatformMetricCard
              label="Urgent / High Priority"
              value={metrics.operations.urgentTickets}
              icon={AlertCircle}
              iconBg="bg-red-50"
              iconColor="text-red-600"
              accent="from-red-400 to-rose-400"
            />
            <PlatformMetricCard
              label="Pending Feature Requests"
              value={metrics.operations.pendingFeatureRequests}
              icon={Lightbulb}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              accent="from-amber-400 to-orange-400"
            />
          </div>
          {metrics.operations.urgentTickets > 0 ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {metrics.operations.urgentTickets} high-priority support ticket
              {metrics.operations.urgentTickets === 1 ? "" : "s"} need attention.{" "}
              <Link href="/admin/support" className="font-semibold underline">
                Review support queue
              </Link>
            </div>
          ) : null}
        </div>
      );

    case "support_panels":
      return (
        <div className="grid gap-5 xl:grid-cols-2">
          <PlatformPanel
            title="Recent businesses"
            description="Latest companies on the platform"
            viewAllHref={ADMIN_BUSINESSES_PATH}
            emptyIcon={Building2}
            emptyMessage="No businesses yet"
            isEmpty={metrics.recentBusinesses.length === 0}
          >
            <ul className="divide-y divide-gray-50">
              {metrics.recentBusinesses.map((business) => (
                <li
                  key={business.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {business.name}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {business.industry} · {business.plan} · {business.createdDate}
                    </p>
                  </div>
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600">
                    {business.status}
                  </span>
                </li>
              ))}
            </ul>
          </PlatformPanel>
          <PlatformPanel
            title="Open support tickets"
            description="Needs platform attention"
            viewAllHref="/admin/support"
            emptyIcon={LifeBuoy}
            emptyMessage="No open tickets"
            isEmpty={metrics.recentOpenTickets.length === 0}
          >
            <ul className="divide-y divide-gray-50">
              {metrics.recentOpenTickets.map((ticket) => (
                <li key={ticket.id} className="px-6 py-4">
                  <Link href={`/admin/support/${ticket.id}`} className="group block">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
                          {formatTicketNumber(ticket.ticketNumber)}
                        </p>
                        <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-700">
                          {ticket.subject}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {ticket.status} · {ticket.priority} · {ticket.updatedAt}
                        </p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-gray-300 group-hover:text-indigo-500" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </PlatformPanel>
        </div>
      );

    case "backlog_actions":
      return (
        <div className="grid gap-5 lg:grid-cols-2">
          <PlatformPanel
            title="Top feature requests"
            description="Highest vote count in backlog"
            viewAllHref="/admin/feature-requests"
            viewAllLabel="View roadmap"
            emptyIcon={Lightbulb}
            emptyMessage="No feature requests yet"
            isEmpty={metrics.topFeatureRequests.length === 0}
          >
            <ul className="divide-y divide-gray-50">
              {metrics.topFeatureRequests.map((request) => (
                <li key={request.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{request.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {request.voteCount} votes · {request.status}
                    </p>
                  </div>
                  <span className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                    #{request.voteCount}
                  </span>
                </li>
              ))}
            </ul>
          </PlatformPanel>
          <PlatformPanel title="Quick actions" description="Common platform tasks">
            <div className="space-y-1 p-3">
              {[
                { href: ADMIN_BUSINESSES_PATH, label: "Manage businesses", icon: Building2 },
                { href: ADMIN_PIPELINE_PATH, label: "Build pipeline", icon: GitBranch },
                { href: "/admin/websites", label: "Websites", icon: Globe },
                { href: "/admin/hosting", label: "Hosting", icon: Server },
                { href: "/admin/api-usage", label: "API usage", icon: Layers },
                { href: "/admin/cron", label: "Cron jobs", icon: Timer },
                { href: "/admin/revenue", label: "Revenue", icon: CreditCard },
                { href: "/admin/support", label: "Support", icon: LifeBuoy },
                { href: "/admin/feature-requests", label: "Feature requests", icon: Lightbulb },
                { href: "/admin/activity", label: "Activity feed", icon: Activity },
                { href: settingsHref, label: "Platform settings", icon: Server },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <Icon className="h-4 w-4 text-gray-400" />
                    <span className="flex-1">{item.label}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-gray-300" />
                  </Link>
                );
              })}
            </div>
            <div className="border-t border-gray-100 px-6 py-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Build pipeline
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-gray-50 px-2 py-2">
                  <p className="text-lg font-extrabold text-gray-900">
                    {metrics.pipelineStats.inProgress}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-500">In progress</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-2 py-2">
                  <p className="text-lg font-extrabold text-gray-900">
                    {metrics.pipelineStats.inReview}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-500">In review</p>
                </div>
              </div>
              <Link
                href={ADMIN_PIPELINE_PATH}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Open pipeline
                <Eye className="h-3.5 w-3.5" />
              </Link>
            </div>
          </PlatformPanel>
        </div>
      );

    case "audit_activity":
      return (
        <PlatformPanel
          title="Recent platform activity"
          description="Latest audit log events"
          viewAllHref="/admin/activity"
          emptyIcon={Activity}
          emptyMessage="No audit events yet"
          isEmpty={metrics.recentAuditEvents.length === 0}
        >
          <ul className="divide-y divide-gray-50">
            {metrics.recentAuditEvents.map((event) => (
              <li key={event.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold capitalize text-gray-900">
                      {formatAuditAction(event.action)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {event.targetLabel ?? event.targetType}
                      {event.actorEmail ? ` · ${event.actorEmail}` : ""}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-400">{event.createdAt}</span>
                </div>
              </li>
            ))}
          </ul>
        </PlatformPanel>
      );

    default:
      return null;
  }
}
