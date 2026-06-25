"use client";

import Link from "next/link";
import {
  CalendarDays,
  FileText,
  HeartPulse,
  TrendingUp,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  companyBookingsPath,
  companyBusinessHealthPath,
  companyCustomersPath,
  companyInvoicesPath,
  companyLeadsPath,
  companyRevenuePath,
} from "@/lib/paths/company";
import { formatRevenue, type HomeOverviewMetrics } from "@/lib/operations/metrics";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  metrics: HomeOverviewMetrics;
};

type FooterTone = "positive" | "warning" | "neutral";

type MetricCardConfig = {
  key: string;
  title: string;
  value: string;
  footer: string;
  footerTone: FooterTone;
  href: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
};

function healthLabel(score: number): { label: string; tone: FooterTone } {
  if (score >= 75) return { label: "Good", tone: "positive" };
  if (score >= 50) return { label: "Fair", tone: "warning" };
  return { label: "Needs attention", tone: "warning" };
}

function bookingFooter(today: number, yesterday: number): {
  text: string;
  tone: FooterTone;
} {
  const diff = today - yesterday;
  if (diff > 0) {
    return {
      text: `↑ ${diff} from yesterday`,
      tone: "positive",
    };
  }
  if (diff < 0) {
    return {
      text: `↓ ${Math.abs(diff)} from yesterday`,
      tone: "warning",
    };
  }
  return { text: "Same as yesterday", tone: "neutral" };
}

function revenueFooter(growthPercent: number): { text: string; tone: FooterTone } {
  if (growthPercent > 0) {
    return { text: `↑ ${growthPercent}% vs last month`, tone: "positive" };
  }
  if (growthPercent < 0) {
    return {
      text: `↓ ${Math.abs(growthPercent)}% vs last month`,
      tone: "warning",
    };
  }
  return { text: "Flat vs last month", tone: "neutral" };
}

function buildCards(slug: string, metrics: HomeOverviewMetrics): MetricCardConfig[] {
  const bookingTrend = bookingFooter(metrics.bookingsToday, metrics.bookingsYesterday);
  const revenueTrend = revenueFooter(metrics.revenueGrowthPercent);
  const health = healthLabel(metrics.businessHealthScore);

  return [
    {
      key: "bookings-today",
      title: "Today's Bookings",
      value: String(metrics.bookingsToday),
      footer: bookingTrend.text,
      footerTone: bookingTrend.tone,
      href: companyBookingsPath(slug),
      icon: CalendarDays,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      key: "revenue-month",
      title: "Revenue (This Month)",
      value: formatRevenue(metrics.revenueMonthCents),
      footer: revenueTrend.text,
      footerTone: revenueTrend.tone,
      href: companyRevenuePath(slug),
      icon: TrendingUp,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      key: "new-leads",
      title: "New Leads",
      value: String(metrics.newLeads7d),
      footer:
        metrics.qualifiedLeads7d > 0
          ? `${metrics.qualifiedLeads7d} qualified`
          : "Last 7 days",
      footerTone: metrics.qualifiedLeads7d > 0 ? "positive" : "neutral",
      href: companyLeadsPath(slug),
      icon: UserRound,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
    },
    {
      key: "outstanding-invoices",
      title: "Outstanding Invoices",
      value: String(metrics.outstandingInvoices),
      footer:
        metrics.outstandingInvoicesCents > 0
          ? `${formatRevenue(metrics.outstandingInvoicesCents)} total`
          : "All caught up",
      footerTone:
        metrics.outstandingInvoicesCents > 0 ? "warning" : "positive",
      href: companyInvoicesPath(slug),
      icon: FileText,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      key: "customers",
      title: "Customers",
      value: String(metrics.customers),
      footer:
        metrics.newCustomersThisMonth > 0
          ? `↑ ${metrics.newCustomersThisMonth} this month`
          : "Total customers",
      footerTone: metrics.newCustomersThisMonth > 0 ? "positive" : "neutral",
      href: companyCustomersPath(slug),
      icon: Users,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      key: "business-health",
      title: "Business Health",
      value: `${metrics.businessHealthScore}%`,
      footer: health.label,
      footerTone: health.tone,
      href: companyBusinessHealthPath(slug),
      icon: HeartPulse,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
  ];
}

const footerToneClass: Record<FooterTone, string> = {
  positive: "text-emerald-600",
  warning: "text-orange-600",
  neutral: "text-slate-500",
};

export function DashboardOverviewMetrics({ slug, metrics }: Props) {
  const cards = buildCards(slug, metrics);

  return (
    <div className="flex flex-nowrap gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {cards.map((card) => (
        <OverviewMetricCard key={card.key} card={card} />
      ))}
    </div>
  );
}

function OverviewMetricCard({ card }: { card: MetricCardConfig }) {
  const Icon = card.icon;

  return (
    <Link
      href={card.href}
      className="block min-w-[10.5rem] flex-1 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:min-w-[11rem] lg:min-w-0"
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            card.iconBg
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", card.iconColor)} />
        </span>
        <p className="min-w-0 line-clamp-2 text-xs font-semibold leading-tight text-slate-900">
          {card.title}
        </p>
      </div>

      <p className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-900">
        {card.value}
      </p>

      <p
        className={cn(
          "mt-1 truncate text-xs font-medium",
          footerToneClass[card.footerTone]
        )}
      >
        {card.footer}
      </p>
    </Link>
  );
}
