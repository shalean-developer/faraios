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
  LifeBuoy,
  Lightbulb,
  Mail,
  Server,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import {
  ADMIN_BUSINESSES_PATH,
  ADMIN_PIPELINE_PATH,
  ADMIN_SYSTEM_NAV,
} from "@/lib/constants/admin-nav";
import { formatTicketNumber } from "@/lib/format/admin-tickets";
import type {
  AdminHealthStatus,
  AdminPlatformOverviewMetrics,
} from "@/types/admin";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

const HEALTH_STYLES: Record<
  AdminHealthStatus,
  { label: string; dot: string; text: string }
> = {
  healthy: { label: "Healthy", dot: "bg-emerald-500", text: "text-emerald-700" },
  warning: { label: "Warning", dot: "bg-amber-500", text: "text-amber-700" },
  critical: { label: "Critical", dot: "bg-red-500", text: "text-red-700" },
  unknown: { label: "Pending", dot: "bg-slate-300", text: "text-slate-500" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}

function MetricCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  accent,
  suffix,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accent: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <Sparkles className="h-3.5 w-3.5 text-gray-200" />
      </div>
      <p className="text-xl font-extrabold text-gray-900">
        {value}
        {suffix ? (
          <span className="ml-1 text-sm font-semibold text-gray-400">{suffix}</span>
        ) : null}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-gray-500">{label}</p>
      <div className={`mt-3 h-0.5 rounded-full bg-gradient-to-r ${accent} opacity-50`} />
    </div>
  );
}

function HealthPill({
  label,
  status,
}: {
  label: string;
  status: AdminHealthStatus;
}) {
  const style = HEALTH_STYLES[status];
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <span className="text-xs font-semibold text-gray-600">{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${style.text}`}>
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        {style.label}
      </span>
    </div>
  );
}

export function FaraiAdminOverview({
  metrics,
}: {
  metrics: AdminPlatformOverviewMetrics;
}) {
  const settingsHref =
    ADMIN_SYSTEM_NAV.find((item) => item.key === "settings")?.href ?? "/admin/settings";

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">
            Platform Overview
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">
            Platform growth, revenue, activity, and system health
          </p>
        </div>
        <AdminActivityBellLink />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mx-auto max-w-7xl space-y-5"
        >
          <motion.section variants={fadeUp} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              System Health
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <HealthPill label="API" status={metrics.systemHealth.api} />
              <HealthPill label="Cron" status={metrics.systemHealth.cron} />
              <HealthPill label="Email" status={metrics.systemHealth.email} />
              <HealthPill label="Websites" status={metrics.systemHealth.websites} />
              <HealthPill label="Domains" status={metrics.systemHealth.domains} />
            </div>
          </motion.section>

          <motion.section variants={fadeUp} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Platform Metrics
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              <MetricCard
                label="Total Businesses"
                value={metrics.businesses.total}
                icon={Building2}
                iconBg="bg-indigo-50"
                iconColor="text-indigo-600"
                accent="from-indigo-500 to-violet-500"
              />
              <MetricCard
                label="Active Businesses"
                value={metrics.businesses.active}
                icon={CheckCircle2}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                accent="from-emerald-400 to-teal-400"
              />
              <MetricCard
                label="Trial Businesses"
                value={metrics.businesses.trial}
                icon={Clock4}
                iconBg="bg-sky-50"
                iconColor="text-sky-600"
                accent="from-sky-400 to-blue-400"
              />
              <MetricCard
                label="Suspended"
                value={metrics.businesses.suspended}
                icon={AlertCircle}
                iconBg="bg-red-50"
                iconColor="text-red-600"
                accent="from-red-400 to-rose-400"
              />
              <MetricCard
                label="New This Month"
                value={metrics.businesses.newThisMonth}
                icon={TrendingUp}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                accent="from-violet-400 to-purple-400"
              />
            </div>
          </motion.section>

          <div className="grid gap-5 xl:grid-cols-2">
            <motion.section variants={fadeUp} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                User Metrics
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="Total Users"
                  value={metrics.users.total}
                  icon={Users}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                  accent="from-blue-400 to-indigo-400"
                />
                <MetricCard
                  label="Active Users"
                  value={metrics.users.active}
                  icon={Users}
                  iconBg="bg-cyan-50"
                  iconColor="text-cyan-600"
                  accent="from-cyan-400 to-teal-400"
                />
                <MetricCard
                  label="New This Month"
                  value={metrics.users.newThisMonth}
                  icon={Calendar}
                  iconBg="bg-indigo-50"
                  iconColor="text-indigo-600"
                  accent="from-indigo-400 to-violet-400"
                />
                <MetricCard
                  label="Growth Rate"
                  value={metrics.users.growthRatePercent}
                  suffix="%"
                  icon={TrendingUp}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  accent="from-emerald-400 to-green-400"
                />
              </div>
            </motion.section>

            <motion.section variants={fadeUp} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Revenue Metrics
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="MRR"
                  value={formatCurrency(metrics.revenue.mrr)}
                  icon={CreditCard}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  accent="from-emerald-400 to-teal-400"
                />
                <MetricCard
                  label="ARR"
                  value={formatCurrency(metrics.revenue.arr)}
                  icon={TrendingUp}
                  iconBg="bg-green-50"
                  iconColor="text-green-600"
                  accent="from-green-400 to-emerald-400"
                />
                <MetricCard
                  label="Total Revenue"
                  value={formatCurrency(metrics.revenue.totalRevenue)}
                  icon={CreditCard}
                  iconBg="bg-violet-50"
                  iconColor="text-violet-600"
                  accent="from-violet-400 to-purple-400"
                />
                <MetricCard
                  label="Active Subscriptions"
                  value={metrics.revenue.activeSubscriptions}
                  icon={CheckCircle2}
                  iconBg="bg-indigo-50"
                  iconColor="text-indigo-600"
                  accent="from-indigo-400 to-blue-400"
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
            </motion.section>
          </div>

          <motion.section variants={fadeUp} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Platform Activity
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              <MetricCard
                label="Total Bookings"
                value={metrics.activity.totalBookings}
                icon={Calendar}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                accent="from-blue-400 to-indigo-400"
              />
              <MetricCard
                label="Total Leads"
                value={metrics.activity.totalLeads}
                icon={Zap}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
                accent="from-amber-400 to-orange-400"
              />
              <MetricCard
                label="Total Invoices"
                value={metrics.activity.totalInvoices}
                icon={CreditCard}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                accent="from-violet-400 to-purple-400"
              />
              <MetricCard
                label="Total Payments"
                value={metrics.activity.totalPayments}
                icon={Activity}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                accent="from-emerald-400 to-teal-400"
              />
              <MetricCard
                label="Emails Sent"
                value={metrics.activity.totalEmailsSent}
                icon={Mail}
                iconBg="bg-sky-50"
                iconColor="text-sky-600"
                accent="from-sky-400 to-blue-400"
              />
            </div>
          </motion.section>

          <motion.section variants={fadeUp} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Operations
              </h2>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <Link href="/admin/support" className="text-indigo-600 hover:text-indigo-800">
                  Support
                </Link>
                <Link href="/admin/feature-requests" className="text-indigo-600 hover:text-indigo-800">
                  Feature requests
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <MetricCard
                label="Open Tickets"
                value={metrics.operations.openTickets}
                icon={LifeBuoy}
                iconBg="bg-sky-50"
                iconColor="text-sky-600"
                accent="from-sky-400 to-blue-400"
              />
              <MetricCard
                label="Urgent / High Priority"
                value={metrics.operations.urgentTickets}
                icon={AlertCircle}
                iconBg="bg-red-50"
                iconColor="text-red-600"
                accent="from-red-400 to-rose-400"
              />
              <MetricCard
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
          </motion.section>

          <div className="grid gap-5 xl:grid-cols-2">
            <motion.section
              variants={fadeUp}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Recent businesses</h2>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Latest companies on the platform
                  </p>
                </div>
                <Link
                  href={ADMIN_BUSINESSES_PATH}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  View all
                </Link>
              </div>
              {metrics.recentBusinesses.length === 0 ? (
                <div className="py-14 text-center">
                  <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                  <p className="text-sm text-gray-400">No businesses yet</p>
                </div>
              ) : (
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
              )}
            </motion.section>

            <motion.section
              variants={fadeUp}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Open support tickets</h2>
                  <p className="mt-0.5 text-xs text-gray-400">Needs platform attention</p>
                </div>
                <Link href="/admin/support" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                  View all
                </Link>
              </div>
              {metrics.recentOpenTickets.length === 0 ? (
                <div className="py-14 text-center">
                  <LifeBuoy className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                  <p className="text-sm text-gray-400">No open tickets</p>
                </div>
              ) : (
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
              )}
            </motion.section>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <motion.section
              variants={fadeUp}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Top feature requests</h2>
                  <p className="mt-0.5 text-xs text-gray-400">Highest vote count in backlog</p>
                </div>
                <Link href="/admin/feature-requests" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                  View roadmap
                </Link>
              </div>
              {metrics.topFeatureRequests.length === 0 ? (
                <div className="py-14 text-center">
                  <Lightbulb className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                  <p className="text-sm text-gray-400">No feature requests yet</p>
                </div>
              ) : (
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
              )}
            </motion.section>

            <motion.section
              variants={fadeUp}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-sm font-bold text-gray-900">Quick actions</h2>
                <p className="mt-0.5 text-xs text-gray-400">Common platform tasks</p>
              </div>
              <div className="space-y-1 p-3">
                {[
                  {
                    href: ADMIN_BUSINESSES_PATH,
                    label: "Manage businesses",
                    icon: Building2,
                  },
                  {
                    href: ADMIN_PIPELINE_PATH,
                    label: "Build pipeline",
                    icon: GitBranch,
                  },
                  {
                    href: "/admin/websites",
                    label: "Websites",
                    icon: Globe,
                  },
                  {
                    href: "/admin/revenue",
                    label: "Revenue",
                    icon: CreditCard,
                  },
                  {
                    href: "/admin/support",
                    label: "Support",
                    icon: LifeBuoy,
                  },
                  {
                    href: "/admin/feature-requests",
                    label: "Feature requests",
                    icon: Lightbulb,
                  },
                  {
                    href: "/admin/activity",
                    label: "Activity feed",
                    icon: Activity,
                  },
                  {
                    href: settingsHref,
                    label: "Platform settings",
                    icon: Server,
                  },
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
            </motion.section>
          </div>
        </motion.div>
      </main>
    </>
  );
}
