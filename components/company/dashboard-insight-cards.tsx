"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  CalendarDays,
  ChevronDown,
  FileText,
  Star,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import {
  companyBookingsPath,
  companyBookingPath,
  companyCalendarPath,
  companyInvoicesPath,
  companyLeadsPath,
  companyQuotesPath,
  companyRevenuePath,
  companyReviewsPath,
} from "@/lib/paths/company";
import {
  formatRevenue,
  type HomeActivityItem,
  type RevenueOverview,
  type UpcomingBookingItem,
} from "@/lib/operations/metrics";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  upcomingBookings: UpcomingBookingItem[];
  revenueOverview: RevenueOverview;
  recentActivity: HomeActivityItem[];
};

function bookingStatusClass(status: string): string {
  switch (status) {
    case "confirmed":
    case "completed":
      return "bg-emerald-50 text-emerald-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "Just now";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function activityMeta(kind: HomeActivityItem["kind"]): {
  icon: LucideIcon;
  bg: string;
  color: string;
} {
  switch (kind) {
    case "booking":
      return { icon: CalendarDays, bg: "bg-violet-100", color: "text-violet-600" };
    case "payment":
      return { icon: Wallet, bg: "bg-emerald-100", color: "text-emerald-600" };
    case "invoice":
      return { icon: FileText, bg: "bg-orange-100", color: "text-orange-600" };
    case "lead":
      return { icon: UserRound, bg: "bg-rose-100", color: "text-rose-600" };
    case "quote":
      return { icon: FileText, bg: "bg-blue-100", color: "text-blue-600" };
    case "review":
      return { icon: Star, bg: "bg-amber-100", color: "text-amber-600" };
    default:
      return { icon: Star, bg: "bg-blue-100", color: "text-blue-600" };
  }
}

function activityHref(slug: string, item: HomeActivityItem): string | null {
  switch (item.kind) {
    case "booking":
      return item.entityId
        ? companyBookingPath(slug, item.entityId)
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
    case "review":
      return companyReviewsPath(slug);
    default:
      return null;
  }
}

export function DashboardInsightCards({
  slug,
  upcomingBookings,
  revenueOverview,
  recentActivity,
}: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <UpcomingBookingsCard slug={slug} bookings={upcomingBookings} />
      <RevenueOverviewCard revenue={revenueOverview} slug={slug} />
      <RecentActivityCard slug={slug} items={recentActivity.slice(0, 5)} />
    </div>
  );
}

function CardShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function UpcomingBookingsCard({
  slug,
  bookings,
}: {
  slug: string;
  bookings: UpcomingBookingItem[];
}) {
  return (
    <CardShell
      title="Upcoming Bookings"
      action={
        <Link
          href={companyCalendarPath(slug)}
          className="text-xs font-medium text-violet-600 hover:text-violet-800"
        >
          View calendar
        </Link>
      }
    >
      {bookings.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No upcoming bookings.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link
                href={companyBookingPath(slug, booking.id)}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-slate-50"
              >
                <div className="w-12 shrink-0 text-center">
                  <p className="text-xs font-semibold text-violet-600">{booking.timeLabel}</p>
                  <p className="text-[11px] text-slate-500">{booking.dayLabel}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {booking.customerName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{booking.service}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                    bookingStatusClass(booking.status)
                  )}
                >
                  {booking.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

function RevenueDonut({
  paidCents,
  outstandingCents,
  overdueCents,
}: {
  paidCents: number;
  outstandingCents: number;
  overdueCents: number;
}) {
  const total = paidCents + outstandingCents + overdueCents;
  const gradient = useMemo(() => {
    if (total <= 0) return "conic-gradient(#e2e8f0 0% 100%)";

    const segments = [
      { value: paidCents, color: "#7c3aed" },
      { value: outstandingCents, color: "#f97316" },
      { value: overdueCents, color: "#ec4899" },
    ].filter((segment) => segment.value > 0);

    let cursor = 0;
    const stops = segments.map((segment) => {
      const start = (cursor / total) * 100;
      cursor += segment.value;
      const end = (cursor / total) * 100;
      return `${segment.color} ${start}% ${end}%`;
    });

    return `conic-gradient(${stops.join(", ")})`;
  }, [paidCents, outstandingCents, overdueCents, total]);

  return (
    <div
      className="relative h-24 w-24 shrink-0 rounded-full"
      style={{ background: gradient }}
    >
      <div className="absolute inset-[18%] rounded-full bg-white" />
    </div>
  );
}

function RevenueOverviewCard({
  revenue,
  slug,
}: {
  revenue: RevenueOverview;
  slug: string;
}) {
  const legend = [
    { label: "Paid", cents: revenue.paidCents, dot: "bg-violet-500" },
    {
      label: "Outstanding",
      cents: revenue.outstandingCents,
      dot: "bg-orange-500",
    },
    { label: "Overdue", cents: revenue.overdueCents, dot: "bg-pink-500" },
  ];

  const growthText =
    revenue.growthPercent > 0
      ? `↑ ${revenue.growthPercent}% vs last month`
      : revenue.growthPercent < 0
        ? `↓ ${Math.abs(revenue.growthPercent)}% vs last month`
        : "Flat vs last month";

  const growthClass =
    revenue.growthPercent > 0
      ? "text-emerald-600"
      : revenue.growthPercent < 0
        ? "text-orange-600"
        : "text-slate-500";

  return (
    <CardShell
      title="Revenue Overview"
      action={
        <Link
          href={companyRevenuePath(slug)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600"
        >
          This Month
          <ChevronDown className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <Link href={companyRevenuePath(slug)} className="block">
        <p className="text-2xl font-bold tracking-tight text-slate-900">
          {formatRevenue(revenue.totalCents)}
        </p>
        <p className={cn("mt-1 text-xs font-medium", growthClass)}>{growthText}</p>

        <div className="mt-5 flex items-center gap-4">
          <RevenueDonut
            paidCents={revenue.paidCents}
            outstandingCents={revenue.outstandingCents}
            overdueCents={revenue.overdueCents}
          />
          <ul className="min-w-0 flex-1 space-y-2">
            {legend.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="flex min-w-0 items-center gap-2 text-slate-600">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", item.dot)} />
                  {item.label}
                </span>
                <span className="shrink-0 font-medium text-slate-900">
                  {formatRevenue(item.cents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Link>
    </CardShell>
  );
}

function RecentActivityCard({
  slug,
  items,
}: {
  slug: string;
  items: HomeActivityItem[];
}) {
  return (
    <CardShell
      title="Recent Activity"
      action={
        <Link
          href={companyBookingsPath(slug)}
          className="text-xs font-medium text-violet-600 hover:text-violet-800"
        >
          View all
        </Link>
      }
    >
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No recent activity.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const meta = activityMeta(item.kind);
            const Icon = meta.icon;
            const href = activityHref(slug, item);
            const row = (
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    meta.bg
                  )}
                >
                  <Icon className={cn("h-4 w-4", meta.color)} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {item.subtitle}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-slate-400">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>
            );

            return (
              <li key={item.id}>
                {href ? (
                  <Link href={href} className="block rounded-lg p-1 transition-colors hover:bg-slate-50">
                    {row}
                  </Link>
                ) : (
                  <div className="p-1">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}
