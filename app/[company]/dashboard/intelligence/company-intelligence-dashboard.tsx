"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  LineChart,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import {
  companyAiInsightsPath,
  companyAnalyticsPath,
  companyBusinessHealthPath,
  companyInsightsPath,
  companyReportsPath,
} from "@/lib/paths/company";
import {
  formatRevenue,
  type IntelligenceOverviewData,
} from "@/lib/operations/metrics";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  overview: IntelligenceOverviewData;
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

function MetricCard({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      {trend !== undefined ? (
        <p
          className={cn(
            "mt-1 text-xs font-semibold",
            trend >= 0 ? "text-emerald-600" : "text-red-600"
          )}
        >
          {trend >= 0 ? "+" : ""}
          {trend}% vs last month
        </p>
      ) : null}
    </div>
  );
}

function healthScoreClass(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

const QUICK_LINKS = [
  {
    label: "Business insights",
    href: (slug: string) => companyInsightsPath(slug),
    icon: TrendingUp,
  },
  {
    label: "Business health",
    href: (slug: string) => companyBusinessHealthPath(slug),
    icon: Activity,
  },
  {
    label: "AI assistant",
    href: (slug: string) => companyAiInsightsPath(slug),
    icon: Sparkles,
  },
  {
    label: "Reports",
    href: (slug: string) => companyReportsPath(slug),
    icon: BarChart3,
  },
  {
    label: "Analytics",
    href: (slug: string) => companyAnalyticsPath(slug),
    icon: LineChart,
  },
] as const;

export function CompanyIntelligenceDashboard({
  slug,
  overview,
}: Props) {
  const { metrics, topInsight, healthRecommendations } = overview;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="space-y-8"
    >
      <motion.header variants={fadeUp}>
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Intelligence
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Intelligence overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Business health, revenue trends, AI recommendations, and reporting at a glance.
        </p>
      </motion.header>

      <motion.div
        variants={fadeUp}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <MetricCard
          label="Business health"
          value={`${metrics.businessHealthScore}/100`}
          hint="Composite score across revenue, bookings, and retention"
        />
        <MetricCard
          label="Revenue MTD"
          value={formatRevenue(metrics.revenueMonthCents)}
          trend={metrics.revenueGrowthPercent}
        />
        <MetricCard
          label="Booking conversion"
          value={`${metrics.bookingConversionRate}%`}
        />
        <MetricCard
          label="New customers (30d)"
          value={String(metrics.newCustomers30d)}
        />
        <MetricCard
          label="Active automations"
          value={String(metrics.activeWorkflows)}
        />
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Health score
        </p>
        <p
          className={cn(
            "mt-2 text-4xl font-bold",
            healthScoreClass(metrics.businessHealthScore)
          )}
        >
          {metrics.businessHealthScore}
        </p>
        {healthRecommendations.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {healthRecommendations.map((item) => (
              <li key={item} className="text-sm text-slate-600">
                • {item}
              </li>
            ))}
          </ul>
        ) : null}
        <Link
          href={companyBusinessHealthPath(slug)}
          className="mt-4 inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          View business health
        </Link>
      </motion.div>

      {topInsight ? (
        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-violet-900">
                {topInsight.title}
              </p>
              <p className="mt-1 text-sm text-violet-800">{topInsight.body}</p>
              <Link
                href={companyAiInsightsPath(slug)}
                className="mt-3 inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Open AI assistant
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      ) : null}

      <motion.section variants={fadeUp}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Intelligence tools
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href(slug)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all",
                  "hover:border-violet-300 hover:shadow-md"
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-100">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1 text-sm font-medium text-slate-900">
                  {link.label}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-violet-600" />
              </Link>
            );
          })}
        </div>
      </motion.section>
    </motion.div>
  );
}
