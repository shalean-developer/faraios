"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  Receipt,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CompanyDashboardHeader } from "@/components/company/company-dashboard-header";
import { DashboardInsightCards } from "@/components/company/dashboard-insight-cards";
import { DashboardOverviewMetrics } from "@/components/company/dashboard-overview-metrics";
import { WorkspaceSetupWidget } from "@/components/company/workspace-setup-widget";
import {
  companyAiInsightsPath,
  companyBookingsPath,
  companyBookingFormPath,
  companyCustomersPath,
  companyInvoicesPath,
  companyQuotesPath,
  companyServicesPath,
  companyWebsitesPath,
} from "@/lib/paths/company";
import {
  type HomeOverviewData,
} from "@/lib/operations/metrics";
import type { CompanyWithIndustry } from "@/types/database";
import type { CompanyNotification } from "@/types/v6-engine";
import type { WorkspaceSetupChecklist } from "@/lib/services/workspace-setup";

type Props = {
  slug: string;
  company: CompanyWithIndustry;
  overview: HomeOverviewData;
  userDisplayName: string;
  notifications: CompanyNotification[];
  unreadCount: number;
  workspaceSetup: WorkspaceSetupChecklist;
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

export function CompanyOperationsDashboard({
  slug,
  company,
  overview,
  userDisplayName,
  notifications,
  unreadCount,
  workspaceSetup,
}: Props) {
  const { metrics, upcomingBookings, revenueOverview, recentActivity, topInsight } =
    overview;

  const isEmpty =
    metrics.totalBookings === 0 &&
    metrics.customers === 0 &&
    metrics.revenueMonthCents === 0 &&
    recentActivity.length === 0;

  return (
    <>
      <CompanyDashboardHeader
        slug={slug}
        companyId={company.id}
        userDisplayName={userDisplayName}
        companyName={company.name}
        notifications={notifications}
        unreadCount={unreadCount}
      />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        <motion.div variants={fadeUp} className="mb-8">
          <WorkspaceSetupWidget checklist={workspaceSetup} />
        </motion.div>

        <motion.div variants={fadeUp} className="mb-8">
          <DashboardOverviewMetrics slug={slug} metrics={metrics} />
        </motion.div>

        <motion.div variants={fadeUp} className="mb-8">
          <DashboardInsightCards
            slug={slug}
            upcomingBookings={upcomingBookings}
            revenueOverview={revenueOverview}
            recentActivity={recentActivity}
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
    </>
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
