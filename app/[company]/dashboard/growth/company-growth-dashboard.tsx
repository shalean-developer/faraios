"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FileText,
  LineChart,
  Mail,
  Megaphone,
  PenLine,
  Search,
  Star,
} from "lucide-react";

import {
  companyAnalyticsPath,
  companyCampaignsPath,
  companyContentPath,
  companyMarketingPath,
  companyReviewsPath,
  companySeoPath,
} from "@/lib/paths/company";
import type { GrowthOverviewData } from "@/lib/operations/metrics";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  overview: GrowthOverviewData;
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
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

const QUICK_LINKS = [
  { label: "SEO", href: (slug: string) => companySeoPath(slug), icon: Search },
  {
    label: "Marketing",
    href: (slug: string) => companyMarketingPath(slug),
    icon: Megaphone,
  },
  {
    label: "Reviews",
    href: (slug: string) => companyReviewsPath(slug),
    icon: Star,
  },
  {
    label: "Campaigns",
    href: (slug: string) => companyCampaignsPath(slug),
    icon: Mail,
  },
  {
    label: "Content",
    href: (slug: string) => companyContentPath(slug),
    icon: PenLine,
  },
  {
    label: "Analytics",
    href: (slug: string) => companyAnalyticsPath(slug),
    icon: LineChart,
  },
] as const;

export function CompanyGrowthDashboard({
  slug,
  overview,
}: Props) {
  const { metrics, topSeoAction } = overview;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="space-y-8"
    >
      <motion.header variants={fadeUp}>
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Growth
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Growth overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          SEO health, leads, campaigns, and content performance in one place.
        </p>
      </motion.header>

      <motion.div
        variants={fadeUp}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard label="SEO score" value={`${metrics.seoScore}/100`} />
        <MetricCard label="Leads (30d)" value={String(metrics.leads30d)} />
        <MetricCard
          label="Conversion rate"
          value={`${metrics.conversionRate}%`}
        />
        <MetricCard
          label="Website visits (30d)"
          value={String(metrics.websiteVisits30d)}
        />
        <MetricCard
          label="Review requests (30d)"
          value={String(metrics.reviewRequestsSent30d)}
        />
        <MetricCard
          label="Campaigns sent"
          value={String(metrics.campaignsSent)}
        />
        <MetricCard
          label="Published posts"
          value={String(metrics.publishedPosts)}
          hint={
            metrics.draftPosts > 0
              ? `${metrics.draftPosts} draft${metrics.draftPosts === 1 ? "" : "s"}`
              : undefined
          }
        />
      </motion.div>

      {topSeoAction ? (
        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <Search className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-violet-900">
                Top SEO recommendation
              </p>
              <p className="mt-1 text-sm text-violet-800">{topSeoAction}</p>
              <Link
                href={companySeoPath(slug)}
                className="mt-3 inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Open SEO
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      ) : null}

      <motion.section variants={fadeUp}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Growth tools
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

      <motion.section variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Content pipeline</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {metrics.publishedPosts === 0 && metrics.draftPosts === 0
            ? "No content yet. Publish blog posts and service articles to improve organic visibility."
            : `${metrics.publishedPosts} published and ${metrics.draftPosts} draft post${metrics.draftPosts === 1 ? "" : "s"}.`}
        </p>
        <Link
          href={companyContentPath(slug)}
          className="mt-4 inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Manage content
        </Link>
      </motion.section>
    </motion.div>
  );
}
