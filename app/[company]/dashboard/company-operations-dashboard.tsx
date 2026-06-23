"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  DollarSign,
  Users,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  companyBookingsPath,
  companyBookingFormPath,
  companyCustomersPath,
  companyServicesPath,
  companyWebsitesPath,
} from "@/lib/paths/company";
import {
  formatRevenue,
  type OperationsMetrics,
  type RecentActivityItem,
} from "@/lib/operations/metrics";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";

type Props = {
  slug: string;
  company: CompanyWithIndustry;
  metrics: OperationsMetrics;
  recentActivity: RecentActivityItem[];
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

function statusBadgeClass(status: string | null): string {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700";
    case "confirmed":
      return "bg-blue-50 text-blue-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export function CompanyOperationsDashboard({
  slug,
  company,
  metrics,
  recentActivity,
}: Props) {
  const isEmpty =
    metrics.totalBookings === 0 &&
    metrics.customers === 0 &&
    recentActivity.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        <motion.header variants={fadeUp} className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Overview
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {company.name} — bookings, customers, and revenue at a glance.
          </p>
        </motion.header>

        <motion.div
          variants={fadeUp}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            icon={<CalendarDays className="h-5 w-5 text-violet-600" />}
            label="Total bookings"
            value={String(metrics.totalBookings)}
          />
          <MetricCard
            icon={<CalendarDays className="h-5 w-5 text-amber-600" />}
            label="Pending bookings"
            value={String(metrics.pendingBookings)}
          />
          <MetricCard
            icon={<Users className="h-5 w-5 text-indigo-600" />}
            label="Customers"
            value={String(metrics.customers)}
          />
          <MetricCard
            icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
            label="Revenue"
            value={formatRevenue(metrics.revenueCents)}
            hint="Completed bookings"
          />
        </motion.div>

        {isEmpty ? (
          <motion.section
            variants={fadeUp}
            className="mb-10 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white p-6 shadow-sm sm:p-8"
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
        ) : null}

        {!isEmpty ? (
          <motion.section variants={fadeUp} className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Quick actions
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickLink
                href={companyBookingsPath(slug)}
                icon={<CalendarDays className="h-5 w-5" />}
                title="Manage bookings"
                subtitle="Create and update status"
              />
              <QuickLink
                href={companyCustomersPath(slug)}
                icon={<Users className="h-5 w-5" />}
                title="Customers"
                subtitle="View and add customers"
              />
              <QuickLink
                href={companyServicesPath(slug)}
                icon={<Wrench className="h-5 w-5" />}
                title="Services"
                subtitle="Catalog and pricing"
              />
              <QuickLink
                href={companyWebsitesPath(slug)}
                icon={<ArrowRight className="h-5 w-5" />}
                title="Websites"
                subtitle="Hosted or connected"
              />
            </div>
          </motion.section>
        ) : null}

        <motion.section variants={fadeUp} className={isEmpty ? "mt-0" : "mt-10"}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Recent activity</h2>
            <Link
              href={companyBookingsPath(slug)}
              className="text-sm font-medium text-violet-700 hover:text-violet-900"
            >
              View all
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
                {recentActivity.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-500">{item.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                          statusBadgeClass(item.status)
                        )}
                      >
                        {item.status ?? "pending"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString("en-ZA")
                          : "—"}
                      </span>
                    </div>
                  </li>
                ))}
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

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
        {icon}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
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
