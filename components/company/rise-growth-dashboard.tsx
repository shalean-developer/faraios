"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileText,
  LineChart,
  Mail,
  Megaphone,
  PenLine,
  Search,
  Star,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  companyAnalyticsPath,
  companyCampaignsPath,
  companyContentPath,
  companyLeadsPath,
  companyMarketingPath,
  companyReviewsPath,
  companySeoPath,
} from "@/lib/paths/company";
import type { GrowthOverviewData } from "@/lib/operations/metrics";
import { cn } from "@/lib/utils";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseStretchCardClassName = cn(riseCardClassName, "flex h-full min-h-0 flex-col");

type FooterTone = "positive" | "warning" | "neutral";

const footerToneClass: Record<FooterTone, string> = {
  positive: "text-emerald-600",
  warning: "text-orange-600",
  neutral: "text-slate-500",
};

type Props = {
  slug: string;
  overview: GrowthOverviewData;
};

function WidgetHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
        <h2 className="truncate text-sm font-medium text-slate-700">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  title,
  value,
  footer,
  footerTone,
  href,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string;
  footer: string;
  footerTone: FooterTone;
  href: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Link
      href={href}
      className="block min-w-[10.5rem] flex-1 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:min-w-[11rem] lg:min-w-0"
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            iconBg
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", iconColor)} strokeWidth={1.75} />
        </span>
        <p className="min-w-0 line-clamp-2 text-xs font-semibold leading-tight text-slate-900">
          {title}
        </p>
      </div>
      <p className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className={cn("mt-1 truncate text-xs font-medium", footerToneClass[footerTone])}>
        {footer}
      </p>
    </Link>
  );
}

function seoScoreFooter(score: number): { text: string; tone: FooterTone } {
  if (score >= 75) return { text: "Good", tone: "positive" };
  if (score >= 50) return { text: "Fair", tone: "warning" };
  return { text: "Needs attention", tone: "warning" };
}

const QUICK_LINKS = [
  { label: "SEO dashboard", href: companySeoPath, icon: Search },
  { label: "Marketing", href: companyMarketingPath, icon: Megaphone },
  { label: "Reviews", href: companyReviewsPath, icon: Star },
  { label: "Campaigns", href: companyCampaignsPath, icon: Mail },
  { label: "Content", href: companyContentPath, icon: PenLine },
  { label: "Analytics", href: companyAnalyticsPath, icon: LineChart },
] as const;

function GrowthToolsCard({ slug }: { slug: string }) {
  return (
    <section className={riseStretchCardClassName}>
      <WidgetHeader icon={Megaphone} title="Growth tools" />
      <div className="grid gap-2 p-4 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href(slug)}
              className="group flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 transition hover:border-slate-200 hover:bg-slate-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-[#eef2ff] group-hover:text-[#5a8dee]">
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="flex-1 text-sm font-medium text-slate-700">{link.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#5a8dee]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ContentPipelineCard({
  slug,
  publishedPosts,
  draftPosts,
}: {
  slug: string;
  publishedPosts: number;
  draftPosts: number;
}) {
  const empty = publishedPosts === 0 && draftPosts === 0;

  return (
    <section className={riseStretchCardClassName}>
      <WidgetHeader
        icon={FileText}
        title="Content pipeline"
        action={
          <Link
            href={companyContentPath(slug)}
            className="text-xs text-[#5a8dee] hover:underline"
          >
            Manage
          </Link>
        }
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="grid grid-cols-2 divide-x divide-slate-100 text-center">
          <div className="px-2">
            <p className="text-3xl font-normal leading-none text-[#22c55e]">{publishedPosts}</p>
            <p className="mt-2 text-sm text-slate-500">Published</p>
          </div>
          <div className="px-2">
            <p className="text-3xl font-normal leading-none text-[#5a8dee]">{draftPosts}</p>
            <p className="mt-2 text-sm text-slate-500">Drafts</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          {empty
            ? "No content yet. Publish blog posts and service articles to improve organic visibility."
            : `${publishedPosts} published and ${draftPosts} draft post${draftPosts === 1 ? "" : "s"}.`}
        </p>
      </div>
    </section>
  );
}

function SeoRecommendationCard({
  slug,
  recommendation,
}: {
  slug: string;
  recommendation: string;
}) {
  return (
    <section className={riseStretchCardClassName}>
      <WidgetHeader icon={Search} title="Top SEO recommendation" />
      <div className="flex flex-1 flex-col p-4">
        <p className="text-sm text-slate-600">{recommendation}</p>
        <Link
          href={companySeoPath(slug)}
          className="mt-4 inline-flex h-9 w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Open SEO dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

export function RiseGrowthDashboard({ slug, overview }: Props) {
  const { metrics, topSeoAction } = overview;
  const seoFooter = seoScoreFooter(metrics.seoScore);

  const metricCards = [
    {
      title: "SEO score",
      value: `${metrics.seoScore}/100`,
      footer: seoFooter.text,
      footerTone: seoFooter.tone,
      href: companySeoPath(slug),
      icon: Search,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      title: "Leads (30d)",
      value: String(metrics.leads30d),
      footer: "Last 30 days",
      footerTone: metrics.leads30d > 0 ? ("positive" as const) : ("neutral" as const),
      href: companyLeadsPath(slug),
      icon: UserRound,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
    },
    {
      title: "Conversion rate",
      value: `${metrics.conversionRate}%`,
      footer: "Visits → bookings",
      footerTone: metrics.conversionRate >= 5 ? ("positive" as const) : ("neutral" as const),
      href: companyAnalyticsPath(slug),
      icon: TrendingUp,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "Website visits",
      value: String(metrics.websiteVisits30d),
      footer: "Last 30 days",
      footerTone: "neutral" as const,
      href: companyAnalyticsPath(slug),
      icon: LineChart,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Review requests",
      value: String(metrics.reviewRequestsSent30d),
      footer: "Sent this month",
      footerTone: metrics.reviewRequestsSent30d > 0 ? ("positive" as const) : ("neutral" as const),
      href: companyReviewsPath(slug),
      icon: Star,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      title: "Campaigns sent",
      value: String(metrics.campaignsSent),
      footer: "Email campaigns",
      footerTone: metrics.campaignsSent > 0 ? ("positive" as const) : ("neutral" as const),
      href: companyCampaignsPath(slug),
      icon: Mail,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      title: "Published posts",
      value: String(metrics.publishedPosts),
      footer:
        metrics.draftPosts > 0
          ? `${metrics.draftPosts} draft${metrics.draftPosts === 1 ? "" : "s"}`
          : "Content library",
      footerTone: metrics.publishedPosts > 0 ? ("positive" as const) : ("neutral" as const),
      href: companyContentPath(slug),
      icon: PenLine,
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
    },
  ];

  return (
    <div className="bg-[#f0f2f5] px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-nowrap gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {metricCards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:items-stretch">
        {topSeoAction ? (
          <div className="flex h-full min-h-0 flex-col lg:col-span-6">
            <SeoRecommendationCard slug={slug} recommendation={topSeoAction} />
          </div>
        ) : null}
        <div
          className={cn(
            "flex h-full min-h-0 flex-col",
            topSeoAction ? "lg:col-span-6" : "lg:col-span-12"
          )}
        >
          <GrowthToolsCard slug={slug} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="flex h-full min-h-0 flex-col lg:col-span-6">
          <ContentPipelineCard
            slug={slug}
            publishedPosts={metrics.publishedPosts}
            draftPosts={metrics.draftPosts}
          />
        </div>
      </div>
    </div>
  );
}
