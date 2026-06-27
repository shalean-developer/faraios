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
import {
  riseCardClassName,
  riseOutlineButtonClassName,
  risePageClassName,
  risePrimaryButtonClassName,
} from "@/lib/ui/rise-dashboard-styles";
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
    <div className={cn(riseCardClassName, "p-4")}>
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
      className={risePageClassName}
    >
      <motion.div variants={fadeUp} className={riseCardClassName}>
        <div className="px-4 py-4 sm:px-5">
          <h1 className="text-lg font-medium text-slate-800">Intelligence overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Business health, revenue trends, AI recommendations, and reporting at a glance.
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
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

      <motion.div variants={fadeUp} className={cn(riseCardClassName, "mt-4 p-5")}>
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
          className={cn(riseOutlineButtonClassName, "mt-4")}
        >
          View business health
        </Link>
      </motion.div>

      {topInsight ? (
        <motion.div
          variants={fadeUp}
          className={cn(riseCardClassName, "mt-4 border-[#c7d7f7] bg-gradient-to-br from-[#eef2ff] to-white p-5")}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#5a8dee]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{topInsight.title}</p>
              <p className="mt-1 text-sm text-slate-600">{topInsight.body}</p>
              <Link
                href={companyAiInsightsPath(slug)}
                className={cn(risePrimaryButtonClassName, "mt-3")}
              >
                Open AI assistant
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      ) : null}

      <motion.section variants={fadeUp} className="mt-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Intelligence tools</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href(slug)}
                className={cn(
                  riseCardClassName,
                  "group flex items-center gap-3 p-4 transition-all hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-[#eef2ff] group-hover:text-[#5a8dee]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1 text-sm font-medium text-slate-900">
                  {link.label}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#5a8dee]" />
              </Link>
            );
          })}
        </div>
      </motion.section>
    </motion.div>
  );
}
