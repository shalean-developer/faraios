"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  DollarSign,
  FileText,
  Megaphone,
  Receipt,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  companyAiInsightsPath,
  companyBookingsPath,
  companyBookingFormPath,
  companyBusinessHealthPath,
  companyCalendarPath,
  companyCustomersPath,
  companyInvoicesPath,
  companyLeadsPath,
  companyMarketingPath,
  companyQuotesPath,
  companyRevenuePath,
  companyServicesPath,
  companyWebsitesPath,
} from "@/lib/paths/company";
import {
  formatRevenue,
  type HomeActivityItem,
  type HomeOverviewData,
} from "@/lib/operations/metrics";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";

type Props = {
  slug: string;
  company: CompanyWithIndustry;
  overview: HomeOverviewData;
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

function activityHref(slug: string, item: HomeActivityItem): string | null {
  switch (item.kind) {
    case "booking":
      return item.entityId
        ? `/${encodeURIComponent(slug)}/dashboard/bookings/${encodeURIComponent(item.entityId)}`
        : companyBookingsPath(slug);
    case "invoice":
      return item.entityId
        ? `/${encodeURIComponent(slug)}/dashboard/invoices/${encodeURIComponent(item.entityId)}`
        : companyInvoicesPath(slug);
    case "quote":
      return item.entityId
        ? `/${encodeURIComponent(slug)}/dashboard/quotes/${encodeURIComponent(item.entityId)}`
        : companyQuotesPath(slug);
    case "payment":
      return companyRevenuePath(slug);
    case "lead":
      return companyLeadsPath(slug);
    default:
      return null;
  }
}

function statusBadgeClass(status: string | null, kind: HomeActivityItem["kind"]): string {
  if (!status) {
    return kind === "activity"
      ? "bg-slate-100 text-slate-600"
      : "bg-slate-100 text-slate-600";
  }
  switch (status) {
    case "completed":
    case "paid":
    case "accepted":
    case "converted":
      return "bg-emerald-50 text-emerald-700";
    case "confirmed":
    case "issued":
    case "sent":
      return "bg-blue-50 text-blue-700";
    case "cancelled":
    case "failed":
    case "rejected":
    case "overdue":
      return "bg-red-50 text-red-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function healthScoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function CompanyOperationsDashboard({ slug, company, overview }: Props) {
  const { metrics, recentActivity, topInsight } = overview;

  const isEmpty =
    metrics.totalBookings === 0 &&
    metrics.customers === 0 &&
    metrics.revenueMonthCents === 0 &&
    recentActivity.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        <motion.header variants={fadeUp} className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Home
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Overview
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {company.name} — operations, revenue, growth, and intelligence at a glance.
          </p>
        </motion.header>

        <motion.div
          variants={fadeUp}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCardLink
            href={companyCalendarPath(slug)}
            icon={<CalendarDays className="h-5 w-5 text-violet-600" />}
            label="Today's bookings"
            value={String(metrics.bookingsToday)}
            hint={
              metrics.pendingBookings > 0
                ? `${metrics.pendingBookings} pending overall`
                : "Scheduled for today"
            }
          />
          <MetricCardLink
            href={companyRevenuePath(slug)}
            icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
            label="Revenue (MTD)"
            value={formatRevenue(metrics.revenueMonthCents)}
            hint={
              metrics.revenueTodayCents > 0
                ? `${formatRevenue(metrics.revenueTodayCents)} today`
                : "From paid invoices"
            }
          />
          <MetricCardLink
            href={companyQuotesPath(slug)}
            icon={<FileText className="h-5 w-5 text-indigo-600" />}
            label="Pending quotes"
            value={String(metrics.pendingQuotes)}
            hint="Draft, sent, or viewed"
          />
          <MetricCardLink
            href={companyInvoicesPath(slug)}
            icon={<Receipt className="h-5 w-5 text-amber-600" />}
            label="Outstanding invoices"
            value={String(metrics.outstandingInvoices)}
            hint={
              metrics.overdueInvoices > 0
                ? `${metrics.overdueInvoices} overdue · ${formatRevenue(metrics.outstandingInvoicesCents)} due`
                : metrics.outstandingInvoicesCents > 0
                  ? `${formatRevenue(metrics.outstandingInvoicesCents)} due`
                  : "All caught up"
            }
            highlight={metrics.overdueInvoices > 0}
          />
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-4 grid gap-4 sm:grid-cols-3"
        >
          <MetricCardLink
            href={companyMarketingPath(slug)}
            icon={<Megaphone className="h-5 w-5 text-pink-600" />}
            label="New leads"
            value={String(metrics.newLeads7d)}
            hint="Last 7 days"
          />
          <MetricCardLink
            href={companyBusinessHealthPath(slug)}
            icon={<Activity className="h-5 w-5 text-violet-600" />}
            label="Business health"
            value={`${metrics.businessHealthScore}%`}
            hint="Composite score"
            valueClassName={healthScoreColor(metrics.businessHealthScore)}
          />
          <MetricCardLink
            href={companyCustomersPath(slug)}
            icon={<Users className="h-5 w-5 text-slate-600" />}
            label="Customers"
            value={String(metrics.customers)}
            hint={`${metrics.totalBookings} total bookings`}
          />
        </motion.div>

        {topInsight ? (
          <motion.section
            variants={fadeUp}
            className="mt-8 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                    AI recommendation
                  </p>
                  <h2 className="mt-1 font-semibold text-slate-900">{topInsight.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{topInsight.body}</p>
                </div>
              </div>
              <Link
                href={companyAiInsightsPath(slug)}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
              >
                All insights
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.section>
        ) : null}

        {isEmpty ? (
          <motion.section
            variants={fadeUp}
            className="mt-8 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white p-6 shadow-sm sm:p-8"
          >
            <h2 className="text-lg font-bold text-slate-900">Get your business running</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Your workspace is ready. Add services, publish your booking form, then take
              your first booking.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={companyServicesPath(slug)}>
                <Button variant="outline" className="rounded-xl">
                  Add services
                </Button>
              </Link>
              <Link href={companyBookingFormPath(slug)}>
                <Button variant="outline" className="rounded-xl">
                  Booking form
                </Button>
              </Link>
              <Link href={companyBookingsPath(slug)}>
                <Button className="rounded-xl">Create booking</Button>
              </Link>
            </div>
          </motion.section>
        ) : (
          <motion.section variants={fadeUp} className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Quick actions
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <QuickLink
                href={companyBookingsPath(slug)}
                icon={<CalendarDays className="h-5 w-5" />}
                title="Bookings"
                subtitle="Manage schedule"
              />
              <QuickLink
                href={companyQuotesPath(slug)}
                icon={<FileText className="h-5 w-5" />}
                title="Quotes"
                subtitle="Create & send"
              />
              <QuickLink
                href={companyInvoicesPath(slug)}
                icon={<Receipt className="h-5 w-5" />}
                title="Invoices"
                subtitle="Bill customers"
              />
              <QuickLink
                href={companyCustomersPath(slug)}
                icon={<Users className="h-5 w-5" />}
                title="Customers"
                subtitle="CRM & segments"
              />
              <QuickLink
                href={companyServicesPath(slug)}
                icon={<Wrench className="h-5 w-5" />}
                title="Services"
                subtitle="Catalog & pricing"
              />
              <QuickLink
                href={companyWebsitesPath(slug)}
                icon={<TrendingUp className="h-5 w-5" />}
                title="Website"
                subtitle="Connect & grow"
              />
            </div>
          </motion.section>
        )}

        <motion.section variants={fadeUp} className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Recent activity</h2>
            <Link
              href={companyBookingsPath(slug)}
              className="text-sm font-medium text-violet-700 hover:text-violet-900"
            >
              View bookings
            </Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {recentActivity.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                No activity yet.{" "}
                <Link
                  href={companyBookingsPath(slug)}
                  className="font-medium text-violet-700 hover:text-violet-900"
                >
                  Create your first booking
                </Link>
                .
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentActivity.map((item) => {
                  const href = activityHref(slug, item);
                  const content = (
                    <>
                      <div>
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-500">{item.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                            statusBadgeClass(item.status, item.kind)
                          )}
                        >
                          {item.status?.replace(/_/g, " ") ?? item.kind}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString("en-ZA")
                            : "—"}
                        </span>
                      </div>
                    </>
                  );

                  return (
                    <li key={item.id}>
                      {href ? (
                        <Link
                          href={href}
                          className="flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </motion.section>

        {metrics.pendingBookings > 0 ? (
          <motion.div variants={fadeUp} className="mt-8">
            <Link href={companyBookingsPath(slug)}>
              <Button className="rounded-xl">
                Review {metrics.pendingBookings} pending booking
                {metrics.pendingBookings === 1 ? "" : "s"}
              </Button>
            </Link>
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  );
}

function MetricCardLink({
  href,
  icon,
  label,
  value,
  hint,
  highlight = false,
  valueClassName,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
  valueClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-2xl border bg-white p-5 shadow-sm transition-all hover:border-violet-200 hover:shadow-md",
        highlight ? "border-amber-200 ring-1 ring-amber-100" : "border-slate-200/80"
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
        {icon}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tracking-tight text-slate-900",
          valueClassName
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Link>
  );
}

function QuickLink({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </Link>
  );
}
