"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileText,
  History,
  LayoutGrid,
  LifeBuoy,
  List,
  Lock,
  MessageCircle,
  Mic,
  MoreHorizontal,
  PieChart,
  Search,
  Users,
} from "lucide-react";

import { DashboardOverviewMetrics } from "@/components/company/dashboard-overview-metrics";
import {
  companyCalendarPath,
  companyTasksPath,
} from "@/lib/paths/company";
import { workspaceAvatarGradient } from "@/lib/company/workspace-avatar";
import type { HomeActivityItem, HomeOverviewData, UpcomingBookingItem } from "@/lib/operations/metrics";
import { formatRevenue } from "@/lib/operations/metrics";
import type {
  RiseDashboardExtras,
  RiseInvoiceBreakdown,
  RiseOpenProject,
  RiseReminderInfo,
} from "@/lib/services/rise-dashboard-data";
import type { CompanySupportTicketRow } from "@/lib/services/company-platform-ops";
import type { CompanyTask } from "@/types/v6-engine";
import { cn } from "@/lib/utils";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseStretchCardClassName = cn(riseCardClassName, "flex h-full min-h-0 flex-col");

type Props = {
  slug: string;
  overview: HomeOverviewData;
  extras: RiseDashboardExtras;
  userDisplayName: string;
};

function WidgetHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
      <Icon className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
      <h2 className="text-sm font-medium text-slate-700">{title}</h2>
    </div>
  );
}

function ProjectsOverviewCard({
  open,
  completed,
  hold,
  progress,
  className,
}: {
  open: number;
  completed: number;
  hold: number;
  progress: number;
  className?: string;
}) {
  return (
    <section className={cn(riseStretchCardClassName, className)}>
      <WidgetHeader icon={LayoutGrid} title="Projects Overview" />
      <div className="flex flex-1 flex-col p-4">
        <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
          <div className="px-2">
            <p className="text-3xl font-normal leading-none text-[#22c55e]">{open}</p>
            <p className="mt-2 text-sm text-slate-500">Open</p>
          </div>
          <div className="px-2">
            <p className="text-3xl font-normal leading-none text-[#ef4444]">{completed}</p>
            <p className="mt-2 text-sm text-slate-500">Completed</p>
          </div>
          <div className="px-2">
            <p className="text-3xl font-normal leading-none text-[#eab308]">{hold}</p>
            <p className="mt-2 text-sm text-slate-500">Hold</p>
          </div>
        </div>
        <div className="relative mt-auto h-9 w-full overflow-hidden rounded-full border border-[#0f766e]">
          <div
            className="absolute inset-y-0 left-0 bg-[#99f6e4]/70"
            style={{ width: `${progress}%` }}
          />
          <p className="relative z-10 flex h-full items-center justify-center text-sm text-slate-600">
            Progression {progress}%
          </p>
        </div>
      </div>
    </section>
  );
}

function ReminderCard({
  reminder,
  className,
}: {
  reminder: RiseReminderInfo;
  className?: string;
}) {
  const nextText =
    reminder.nextDate && reminder.nextLabel
      ? `${reminder.nextDate} - ${reminder.nextLabel}`
      : reminder.nextDate ?? "No upcoming reminders";

  return (
    <section className={cn("shrink-0", riseCardClassName, className)}>
      <div className="grid grid-cols-2 divide-x divide-slate-100">
        <div className="flex flex-col items-center justify-center px-4 py-5 text-center">
          <p className="text-4xl font-semibold leading-none text-[#ef4444]">
            {reminder.todayCount}
          </p>
          <p className="mt-2 text-sm text-slate-500">Reminder today</p>
        </div>
        <div className="flex flex-col justify-center gap-2 px-4 py-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Bell className="h-4 w-4 text-[#ef4444]" strokeWidth={1.75} />
            <span>Next reminder</span>
          </div>
          <p className="truncate text-sm text-slate-500" title={nextText}>
            {nextText}
          </p>
        </div>
      </div>
    </section>
  );
}

function InvoiceRow({
  count,
  label,
  amountCents,
  barColor,
  trackColor,
  countColor,
  maxAmount,
}: {
  count: number;
  label: string;
  amountCents: number;
  barColor: string;
  trackColor: string;
  countColor: string;
  maxAmount: number;
}) {
  const pct = maxAmount > 0 ? Math.min(100, Math.round((amountCents / maxAmount) * 100)) : 0;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={cn("w-5 shrink-0 text-right font-medium", countColor)}>{count}</span>
      <span className="w-24 shrink-0 text-slate-600">{label}</span>
      <div className={cn("h-2 flex-1 overflow-hidden rounded-full", trackColor)}>
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right text-slate-700">
        {formatRevenue(amountCents)}
      </span>
    </div>
  );
}

function InvoiceOverviewCard({
  breakdown,
  monthlyTotals,
}: {
  breakdown: RiseInvoiceBreakdown;
  monthlyTotals: number[];
}) {
  const maxAmount = Math.max(
    breakdown.overdueCents,
    breakdown.notPaidCents,
    breakdown.partiallyPaidCents,
    breakdown.fullyPaidCents,
    breakdown.draftCents,
    1
  );

  const sparkMax = Math.max(...monthlyTotals, 1);
  const sparkHeights = monthlyTotals.map((amount) =>
    Math.max(4, Math.round((amount / sparkMax) * 52))
  );

  return (
    <section className={cn("flex h-full flex-col", riseCardClassName)}>
      <WidgetHeader icon={FileText} title="Invoice Overview" />
      <div className="flex flex-1 flex-col p-4">
        <div className="space-y-3">
          <InvoiceRow
            count={breakdown.overdue}
            label="Overdue"
            amountCents={breakdown.overdueCents}
            countColor="text-[#ef4444]"
            barColor="bg-[#ef4444]"
            trackColor="bg-red-100"
            maxAmount={maxAmount}
          />
          <InvoiceRow
            count={breakdown.notPaid}
            label="Not paid"
            amountCents={breakdown.notPaidCents}
            countColor="text-[#eab308]"
            barColor="bg-[#eab308]"
            trackColor="bg-amber-100"
            maxAmount={maxAmount}
          />
          <InvoiceRow
            count={breakdown.partiallyPaid}
            label="Partially paid"
            amountCents={breakdown.partiallyPaidCents}
            countColor="text-[#5a8dee]"
            barColor="bg-[#5a8dee]"
            trackColor="bg-blue-100"
            maxAmount={maxAmount}
          />
          <InvoiceRow
            count={breakdown.fullyPaid}
            label="Fully paid"
            amountCents={breakdown.fullyPaidCents}
            countColor="text-[#1d4ed8]"
            barColor="bg-[#1d4ed8]"
            trackColor="bg-blue-100"
            maxAmount={maxAmount}
          />
          <InvoiceRow
            count={breakdown.draft}
            label="Draft"
            amountCents={breakdown.draftCents}
            countColor="text-slate-500"
            barColor="bg-slate-400"
            trackColor="bg-slate-100"
            maxAmount={maxAmount}
          />
        </div>

        <div className="mt-auto border-t border-slate-100 pt-4">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">
                Total invoiced{" "}
                <span className="font-semibold text-slate-900">
                  {formatRevenue(breakdown.totalInvoicedCents)}
                </span>
              </p>
              <p className="text-slate-600">
                Due{" "}
                <span className="font-semibold text-[#5a8dee]">
                  {formatRevenue(breakdown.dueCents)}
                </span>
              </p>
            </div>
            <div className="text-right">
              <div className="flex h-14 items-end justify-end gap-0.5">
                {sparkHeights.map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-t bg-[#5a8dee]/80"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">Last 12 months</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IncomeVsExpensesCard({
  incomeCents,
  expenseCents,
  lastYearIncomeCents,
  lastYearExpenseCents,
}: {
  incomeCents: number;
  expenseCents: number;
  lastYearIncomeCents: number;
  lastYearExpenseCents: number;
}) {
  return (
    <section className={cn("flex h-full flex-col", riseCardClassName)}>
      <WidgetHeader icon={PieChart} title="Income vs Expenses" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-4">
          <DonutChart
            size={110}
            segments={[
              { value: incomeCents, color: "#22c55e" },
              { value: expenseCents, color: "#f472b6" },
            ]}
          />
          <div className="space-y-3 text-sm">
            <p className="font-medium text-slate-700">This Year</p>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600">{formatRevenue(incomeCents)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-pink-400" />
              <span className="text-slate-600">{formatRevenue(expenseCents)}</span>
            </div>
            <p className="pt-1 font-medium text-slate-700">Last Year</p>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span>{formatRevenue(lastYearIncomeCents)}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full bg-pink-300" />
              <span>{formatRevenue(lastYearExpenseCents)}</span>
            </div>
          </div>
        </div>
        <div className="mt-auto pt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">This Year</p>
          <div className="relative h-20 overflow-hidden rounded bg-gradient-to-t from-pink-100 via-white to-emerald-100">
            <svg viewBox="0 0 200 80" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <path
                d="M0,60 C30,55 50,40 80,45 C110,50 130,20 160,30 C180,35 190,25 200,15 L200,80 L0,80 Z"
                fill="#86efac"
                fillOpacity="0.55"
              />
              <path
                d="M0,65 C25,62 55,58 85,50 C115,42 140,55 170,48 C185,44 195,40 200,38 L200,80 L0,80 Z"
                fill="#f9a8d4"
                fillOpacity="0.5"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

function countTaskPriorities(tasks: CompanyTask[]) {
  let urgent = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const task of tasks) {
    if (task.status === "done" || task.status === "cancelled") continue;
    switch (task.priority) {
      case "urgent":
        urgent += 1;
        break;
      case "high":
        high += 1;
        break;
      case "medium":
        medium += 1;
        break;
      case "low":
        low += 1;
        break;
    }
  }

  return { urgent, high, medium, low };
}

function summarizeTicketCategories(tickets: CompanySupportTicketRow[]) {
  const map: Record<string, number> = {
    general: 0,
    technical: 0,
    billing: 0,
    account: 0,
  };

  for (const ticket of tickets) {
    const key = ticket.category?.toLowerCase() ?? "general";
    if (key in map) map[key] += 1;
    else map.general += 1;
  }

  return [
    { label: "General ...", count: map.general },
    { label: "Bug Rep...", count: map.technical },
    { label: "Sales Inq...", count: map.billing + map.account },
  ];
}

function buildTicketSparkline(tickets: CompanySupportTicketRow[]) {
  const days: { date: string; label: string; count: number }[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    const date = day.toISOString().slice(0, 10);
    days.push({
      date,
      label: String(day.getDate()).padStart(2, "0"),
      count: 0,
    });
  }

  for (const ticket of tickets) {
    const key = ticket.createdAt.slice(0, 10);
    const bucket = days.find((day) => day.date === key);
    if (bucket) bucket.count += 1;
  }

  return days;
}

function TaskLegendRow({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-slate-600">{label}</span>
      <span className="ml-auto font-medium text-slate-800">{count}</span>
    </div>
  );
}

function AllTasksOverviewCard({
  tasks,
  taskSummary,
  className,
}: {
  tasks: CompanyTask[];
  taskSummary: RiseDashboardExtras["taskSummary"];
  className?: string;
}) {
  const priorities = countTaskPriorities(tasks);
  const reviewCount = 0;

  const segments = [
    { value: taskSummary.open, color: "#f59e0b" },
    { value: taskSummary.inProgress, color: "#5a8dee" },
    { value: reviewCount, color: "#a855f7" },
    { value: taskSummary.done, color: "#22c55e" },
    { value: taskSummary.overdue, color: "#ef4444" },
  ];

  return (
    <section className={cn(riseStretchCardClassName, className)}>
      <WidgetHeader icon={List} title="All Tasks Overview" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-5">
          <DonutChart segments={segments} size={148} thickness={26} />
          <div className="min-w-0 flex-1 space-y-2.5">
            <TaskLegendRow color="#f59e0b" label="To do" count={taskSummary.open} />
            <TaskLegendRow color="#5a8dee" label="In progress" count={taskSummary.inProgress} />
            <TaskLegendRow color="#a855f7" label="Review" count={reviewCount} />
            <TaskLegendRow color="#22c55e" label="Done" count={taskSummary.done} />
            <TaskLegendRow color="#ef4444" label="Expired" count={taskSummary.overdue} />
          </div>
        </div>

        <div className="mt-auto grid grid-cols-4 gap-2 border-t border-slate-100 pt-4">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <AlertOctagon className="h-5 w-5 text-[#ef4444]" strokeWidth={1.75} />
            <span className="text-sm font-medium text-slate-800">{priorities.urgent}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <CircleAlert className="h-5 w-5 text-[#a855f7]" strokeWidth={1.75} />
            <span className="text-sm font-medium text-slate-800">{priorities.high}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <ArrowUp className="h-5 w-5 text-[#f59e0b]" strokeWidth={1.75} />
            <span className="text-sm font-medium text-slate-800">{priorities.medium}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <ArrowDown className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
            <span className="text-sm font-medium text-slate-800">{priorities.low}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TeamMembersOverviewCard({
  memberCount,
  onLeave,
  clockedIn,
  clockedOut,
  className,
}: {
  memberCount: number;
  onLeave: number;
  clockedIn: number;
  clockedOut: number;
  className?: string;
}) {
  const clockedInPct = memberCount > 0 ? Math.round((clockedIn / memberCount) * 100) : 0;
  const clockedOutPct = memberCount > 0 ? Math.round((clockedOut / memberCount) * 100) : 0;

  return (
    <section
      className={cn(
        riseCardClassName,
        className
      )}
    >
      <WidgetHeader icon={Users} title="Team Members Overview" />
      <div className="grid flex-1 grid-cols-2 divide-x divide-y divide-slate-100">
        <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
          <p className="text-4xl font-normal leading-none text-slate-800">{memberCount}</p>
          <p className="mt-2 text-sm text-slate-500">Team members</p>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
          <p className="text-4xl font-normal leading-none text-[#f59e0b]">{onLeave}</p>
          <p className="mt-2 text-sm text-slate-500">On leave today</p>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-5 text-center">
          <p className="text-4xl font-normal leading-none text-[#ef4444]">{clockedIn}</p>
          <div className="mt-2 w-full max-w-[120px]">
            <ProgressBar value={clockedInPct} max={100} color="bg-[#ef4444]" />
          </div>
          <p className="mt-2 text-sm text-slate-500">Members Clocked In</p>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-5 text-center">
          <p className="text-4xl font-normal leading-none text-[#5a8dee]">{clockedOut}</p>
          <div className="mt-2 w-full max-w-[120px]">
            <ProgressBar value={clockedOutPct} max={100} color="bg-[#5a8dee]" />
          </div>
          <p className="mt-2 text-sm text-slate-500">Members Clocked Out</p>
        </div>
      </div>
    </section>
  );
}

function LastAnnouncementCard({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <section
      className={cn("shrink-0", riseCardClassName, className)}
    >
      <WidgetHeader icon={Mic} title="Last announcement" />
      <div className="px-4 py-5">
        <p className="text-base text-slate-600">{message}</p>
      </div>
    </section>
  );
}

function TicketStatusCard({
  ticketCounts,
  tickets,
  className,
}: {
  ticketCounts: RiseDashboardExtras["ticketCounts"];
  tickets: CompanySupportTicketRow[];
  className?: string;
}) {
  const categories = summarizeTicketCategories(tickets);
  const sparkline = buildTicketSparkline(tickets);
  const maxCount = Math.max(...sparkline.map((day) => day.count), 1);

  return (
    <section
      className={cn("flex h-full min-h-0 flex-col", riseCardClassName, className)}
    >
      <WidgetHeader icon={LifeBuoy} title="Ticket Status" />
      <div className="flex flex-1 flex-col p-4">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="space-y-3 pr-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#eab308]" />
              <span className="text-slate-600">New</span>
              <span className="ml-auto font-medium text-slate-800">{ticketCounts.new}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f472b6]" />
              <span className="text-slate-600">Open</span>
              <span className="ml-auto font-medium text-slate-800">{ticketCounts.open}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#5a8dee]" />
              <span className="text-slate-600">Closed</span>
              <span className="ml-auto font-medium text-slate-800">{ticketCounts.closed}</span>
            </div>
          </div>
          <div className="space-y-3 pl-4">
            {categories.map((category) => (
              <div key={category.label} className="flex items-center gap-2 text-sm">
                <span className="truncate text-[#ef4444]">{category.label}</span>
                <span className="ml-auto font-medium text-slate-800">{category.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-5">
          <p className="mb-3 text-sm text-slate-500">New tickets in last 30 days</p>
          <div className="flex h-24 items-end gap-px">
            {sparkline.map((day) => (
              <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                <div
                  className="w-full max-w-[10px] rounded-t bg-[#2dd4bf]"
                  style={{
                    height: `${Math.max(4, Math.round((day.count / maxCount) * 100))}%`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-px">
            {sparkline.map((day, index) => (
              <div key={`${day.date}-label`} className="min-w-0 flex-1 text-center">
                {index % 2 === 0 ? (
                  <span className="inline-block origin-top-left -rotate-45 text-[9px] leading-none text-slate-400">
                    {day.label}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const EVENT_ICON_COLORS = [
  "text-[#5a8dee]",
  "text-[#22c55e]",
  "text-[#a855f7]",
  "text-[#f472b6]",
  "text-[#14b8a6]",
];

function formatTimelineTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date
    .toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
    .toLowerCase();

  if (isToday) return `Today at ${time}`;
  return date
    .toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
    .toLowerCase();
}

function activityBadge(kind: HomeActivityItem["kind"]) {
  if (kind === "booking" || kind === "lead") {
    return { label: "Added", className: "bg-[#5a8dee] text-white" };
  }
  return { label: "Updated", className: "bg-[#f59e0b] text-white" };
}

function activityActionLabel(kind: HomeActivityItem["kind"]) {
  switch (kind) {
    case "booking":
      return "Booking:";
    case "invoice":
      return "Invoice:";
    case "payment":
      return "Payment:";
    case "quote":
      return "Quote:";
    case "lead":
      return "Lead:";
    case "review":
      return "Review:";
    default:
      return "Activity:";
  }
}

function ProjectTimelineCard({
  items,
  userDisplayName,
  className,
}: {
  items: HomeActivityItem[];
  userDisplayName: string;
  className?: string;
}) {
  return (
    <section className={cn(riseStretchCardClassName, className)}>
      <WidgetHeader icon={History} title="Project Timeline" />
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No recent activity yet.</p>
        ) : (
          items.slice(0, 8).map((item) => {
            const badge = activityBadge(item.kind);
            return (
              <div key={item.id} className="border-b border-slate-100 px-4 py-4 last:border-b-0">
                <div className="flex gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-semibold text-white",
                      workspaceAvatarGradient(userDisplayName)
                    )}
                  >
                    {getInitials(userDisplayName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{userDisplayName}</p>
                      <p className="text-xs text-slate-400">{formatTimelineTimestamp(item.createdAt)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span
                        className={cn(
                          "inline-flex rounded px-2 py-0.5 text-xs font-medium",
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                      <span className="text-slate-600">{activityActionLabel(item.kind)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{item.title}</p>
                    {item.subtitle ? (
                      <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
                    ) : null}
                    {item.entityId ? (
                      <p className="mt-2 text-xs text-slate-400">Task: #{item.entityId.slice(0, 4)}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-400">Project: {item.subtitle || item.title}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function EventsCard({
  events,
  calendarHref,
  className,
}: {
  events: UpcomingBookingItem[];
  calendarHref: string;
  className?: string;
}) {
  return (
    <section
      className={cn("shrink-0", riseCardClassName, className)}
    >
      <WidgetHeader icon={CalendarDays} title="Events" />
      <div className="divide-y divide-slate-100">
        {events.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No upcoming events.</p>
        ) : (
          events.slice(0, 4).map((event, index) => (
            <div key={event.id} className="flex gap-3 px-4 py-3.5">
              <Lock
                className={cn("mt-0.5 h-4 w-4 shrink-0", EVENT_ICON_COLORS[index % EVENT_ICON_COLORS.length])}
                strokeWidth={1.75}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#5a8dee]">{event.service}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {event.dayLabel}
                  {event.timeLabel ? `, ${event.timeLabel}` : ""}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-slate-100 px-4 py-3">
        <Link
          href={calendarHref}
          className="flex w-full items-center justify-center rounded border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          View on calendar
        </Link>
      </div>
    </section>
  );
}

function OpenProjectsCard({
  projects,
  className,
}: {
  projects: RiseOpenProject[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        riseCardClassName,
        className
      )}
    >
      <WidgetHeader icon={LayoutGrid} title="Open Projects" />
      <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
        {projects.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No open projects.</p>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-800">{project.name}</p>
                <span className="shrink-0 text-sm font-medium text-[#5a8dee]">
                  {project.progress}%
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Start date: {project.startDate}
                {project.deadline ? ` | Deadline: ${project.deadline}` : " | Deadline: —"}
              </p>
              <div className="mt-3">
                <ProgressBar value={project.progress} max={100} color="bg-[#5a8dee]" />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

type PrivateTodo = { id: string; text: string; done: boolean };

function TodoPrivateCard({
  todos,
  todoInput,
  todoTab,
  todoSearch,
  sortable,
  todoPage,
  onTodoInputChange,
  onAddTodo,
  onTabChange,
  onSearchChange,
  onSortableChange,
  onToggleTodo,
  onPageChange,
  className,
}: {
  todos: PrivateTodo[];
  todoInput: string;
  todoTab: "todo" | "done";
  todoSearch: string;
  sortable: boolean;
  todoPage: number;
  onTodoInputChange: (value: string) => void;
  onAddTodo: () => void;
  onTabChange: (tab: "todo" | "done") => void;
  onSearchChange: (value: string) => void;
  onSortableChange: (value: boolean) => void;
  onToggleTodo: (id: string) => void;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const pageSize = 5;
  const filtered = todos
    .filter((todo) => (todoTab === "done" ? todo.done : !todo.done))
    .filter((todo) =>
      todoSearch.trim()
        ? todo.text.toLowerCase().includes(todoSearch.trim().toLowerCase())
        : true
    )
    .sort((a, b) => (sortable ? a.text.localeCompare(b.text) : 0));

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(todoPage, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section className={cn(riseStretchCardClassName, className)}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
          <h2 className="text-sm font-medium text-slate-700">To do (Private)</h2>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Sortable
          <button
            type="button"
            role="switch"
            aria-checked={sortable}
            onClick={() => onSortableChange(!sortable)}
            suppressHydrationWarning
            className={cn(
              "relative h-5 w-9 rounded-full transition",
              sortable ? "bg-[#5a8dee]" : "bg-slate-200"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                sortable ? "left-4" : "left-0.5"
              )}
            />
          </button>
        </label>
      </div>

      <div className="border-b border-slate-100 p-4">
        <div className="flex gap-2">
          <input
            value={todoInput}
            onChange={(e) => onTodoInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddTodo()}
            placeholder="Add a to do..."
            suppressHydrationWarning
            className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#5a8dee]"
          />
          <button
            type="button"
            onClick={onAddTodo}
            suppressHydrationWarning
            className="inline-flex items-center gap-1.5 rounded bg-[#5a8dee] px-3 py-2 text-sm font-medium text-white"
          >
            <Check className="h-4 w-4" strokeWidth={2} />
            Save
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="inline-flex rounded border border-slate-200 p-0.5 text-xs">
            {(["todo", "done"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                suppressHydrationWarning
                className={cn(
                  "rounded px-3 py-1.5",
                  todoTab === tab ? "bg-slate-100 text-slate-800" : "text-slate-500"
                )}
              >
                {tab === "todo" ? "To do" : "Done"}
              </button>
            ))}
          </div>
          <div className="relative ml-auto min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={todoSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              suppressHydrationWarning
              className="w-full rounded border border-slate-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-[#5a8dee]"
            />
          </div>
        </div>
      </div>

      <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
        {pageItems.length === 0 ? (
          <li className="p-4 text-sm text-slate-500">No items yet.</li>
        ) : (
          pageItems.map((todo) => (
            <li key={todo.id} className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => onToggleTodo(todo.id)}
                suppressHydrationWarning
                className="h-4 w-4 rounded border-slate-300"
              />
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm text-[#5a8dee]",
                  todo.done && "text-slate-400 line-through"
                )}
              >
                {todo.text}
              </span>
              <button type="button" className="text-slate-400 hover:text-slate-600" aria-label="More">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          suppressHydrationWarning
          className="rounded border border-slate-200 p-1 text-slate-500 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded border border-slate-200 px-2 text-sm text-slate-700">
          {currentPage}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          suppressHydrationWarning
          className="rounded border border-slate-200 p-1 text-slate-500 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function Widget({
  title,
  children,
  className,
  action,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        riseCardClassName,
        "min-w-0 overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-3 sm:px-4">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {action}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

function DonutChart({
  segments,
  size = 120,
  thickness = 20,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const gradient = useMemo(() => {
    if (total === 0) return "#e2e8f0";
    let cursor = 0;
    const parts = segments
      .filter((s) => s.value > 0)
      .map((s) => {
        const start = (cursor / total) * 100;
        cursor += s.value;
        const end = (cursor / total) * 100;
        return `${s.color} ${start}% ${end}%`;
      });
    return `conic-gradient(${parts.join(", ")})`;
  }, [segments, total]);

  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{ width: size, height: size, background: gradient }}
    >
      <div
        className="absolute rounded-full bg-white"
        style={{ inset: thickness }}
        aria-hidden
      />
    </div>
  );
}

function ProgressBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function taskStatusPill(status: CompanyTask["status"]) {
  switch (status) {
    case "done":
      return "bg-emerald-100 text-emerald-700";
    case "in_progress":
      return "bg-violet-100 text-violet-700";
    case "cancelled":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function formatShortDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const TODO_STORAGE_KEY = "faraios.dashboard.todos";
const NOTE_STORAGE_KEY = "faraios.dashboard.sticky-note";

export function RiseDashboard({ slug, overview, extras, userDisplayName }: Props) {
  const { metrics, upcomingBookings, revenueOverview, recentActivity } = overview;
  const {
    tasks,
    myTasks,
    taskSummary,
    members,
    supportTickets,
    bookingCounts,
    invoiceBreakdown,
    invoiceMonthlyCents,
    ticketCounts,
    openProjects,
    reminder,
    lastAnnouncement,
    teamAttendance,
    incomeExpense,
  } = extras;

  const bookingTotal = bookingCounts.open + bookingCounts.completed + bookingCounts.hold;
  const bookingProgress =
    bookingTotal > 0 ? Math.round((bookingCounts.completed / bookingTotal) * 100) : 0;

  const openTaskRows = myTasks
    .filter((t) => t.status !== "done" && t.status !== "cancelled")
    .slice(0, 8);

  const [todoInput, setTodoInput] = useState("");
  const [todos, setTodos] = useState<{ id: string; text: string; done: boolean }[]>([]);
  const [stickyNote, setStickyNote] = useState("");
  const [todoTab, setTodoTab] = useState<"todo" | "done">("todo");
  const [todoSearch, setTodoSearch] = useState("");
  const [todoSortable, setTodoSortable] = useState(false);
  const [todoPage, setTodoPage] = useState(1);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const storedTodos = localStorage.getItem(`${TODO_STORAGE_KEY}.${slug}`);
        if (storedTodos) setTodos(JSON.parse(storedTodos));
        const storedNote = localStorage.getItem(`${NOTE_STORAGE_KEY}.${slug}`);
        if (storedNote) setStickyNote(storedNote);
      } catch {
        // ignore
      }
      setStorageReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem(`${TODO_STORAGE_KEY}.${slug}`, JSON.stringify(todos));
    } catch {
      // ignore
    }
  }, [todos, slug, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem(`${NOTE_STORAGE_KEY}.${slug}`, stickyNote);
    } catch {
      // ignore
    }
  }, [stickyNote, slug, storageReady]);

  const addTodo = () => {
    const text = todoInput.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }]);
    setTodoInput("");
    setTodoPage(1);
  };

  const incomeCents = incomeExpense.incomeThisYearCents || revenueOverview.paidCents;
  const expenseCents = incomeExpense.expenseThisYearCents;

  return (
    <div className="min-w-0 bg-[#f0f2f5] px-3 py-4 sm:px-5 sm:py-5">
      <DashboardOverviewMetrics slug={slug} metrics={metrics} />

      <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="flex h-full min-h-0 flex-col gap-4 lg:col-span-4">
          <ProjectsOverviewCard
            open={bookingCounts.open}
            completed={bookingCounts.completed}
            hold={bookingCounts.hold}
            progress={bookingProgress}
            className="flex-1"
          />
          <ReminderCard reminder={reminder} />
        </div>

        <div className="flex h-full min-h-0 flex-col lg:col-span-4">
          <InvoiceOverviewCard
            breakdown={invoiceBreakdown}
            monthlyTotals={invoiceMonthlyCents}
          />
        </div>

        <div className="flex h-full min-h-0 flex-col lg:col-span-4">
          <IncomeVsExpensesCard
            incomeCents={incomeCents}
            expenseCents={expenseCents}
            lastYearIncomeCents={incomeExpense.incomeLastYearCents}
            lastYearExpenseCents={incomeExpense.expenseLastYearCents}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="flex h-full min-h-0 flex-col lg:col-span-4">
          <AllTasksOverviewCard tasks={tasks} taskSummary={taskSummary} className="flex-1" />
        </div>

        <div className="flex h-full min-h-0 flex-col gap-4 lg:col-span-4">
          <TeamMembersOverviewCard
            memberCount={members.length}
            onLeave={teamAttendance.onLeave}
            clockedIn={teamAttendance.clockedIn}
            clockedOut={teamAttendance.clockedOut}
          />
          <LastAnnouncementCard
            message={lastAnnouncement ?? "No announcements yet."}
          />
        </div>

        <div className="flex h-full min-h-0 flex-col lg:col-span-4">
          <TicketStatusCard ticketCounts={ticketCounts} tickets={supportTickets} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="flex h-full min-h-0 flex-col lg:col-span-4">
          <ProjectTimelineCard
            items={recentActivity}
            userDisplayName={userDisplayName}
            className="flex-1"
          />
        </div>

        <div className="flex h-full min-h-0 flex-col gap-4 lg:col-span-4">
          <EventsCard events={upcomingBookings} calendarHref={companyCalendarPath(slug)} />
          <OpenProjectsCard projects={openProjects} />
        </div>

        <div className="flex h-full min-h-0 flex-col lg:col-span-4">
          <TodoPrivateCard
            todos={todos}
            todoInput={todoInput}
            todoTab={todoTab}
            todoSearch={todoSearch}
            sortable={todoSortable}
            todoPage={todoPage}
            onTodoInputChange={setTodoInput}
            onAddTodo={addTodo}
            onTabChange={(tab) => {
              setTodoTab(tab);
              setTodoPage(1);
            }}
            onSearchChange={(value) => {
              setTodoSearch(value);
              setTodoPage(1);
            }}
            onSortableChange={setTodoSortable}
            onToggleTodo={(id) =>
              setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
            }
            onPageChange={setTodoPage}
            className="flex-1"
          />
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-3">
        <Widget
          title="My tasks"
          className="min-w-0 lg:col-span-2"
          action={
            <Link href={companyTasksPath(slug)} className="text-xs text-[#5a8dee] hover:underline">
              View all
            </Link>
          }
        >
          <div className="md:hidden">
            {openTaskRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No open tasks.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {openTaskRows.map((task, index) => (
                  <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          #{index + 1}
                          {task.dueDate ? ` · Due ${formatShortDate(task.dueDate)}` : null}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          taskStatusPill(task.status)
                        )}
                      >
                        {task.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Start date</th>
                  <th className="pb-2 font-medium">Deadline</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {openTaskRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No open tasks.
                    </td>
                  </tr>
                ) : (
                  openTaskRows.map((task, index) => (
                    <tr key={task.id}>
                      <td className="py-2.5 text-slate-500">#{index + 1}</td>
                      <td className="py-2.5 font-medium text-slate-800">{task.title}</td>
                      <td className="py-2.5 text-slate-500">{formatShortDate(task.createdAt)}</td>
                      <td className="py-2.5 text-slate-500">{formatShortDate(task.dueDate)}</td>
                      <td className="py-2.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            taskStatusPill(task.status)
                          )}
                        >
                          {task.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Widget>

        <Widget title="Sticky note (Private)" className="min-w-0">
          <textarea
            value={stickyNote}
            onChange={(e) => setStickyNote(e.target.value)}
            placeholder="My quick notes here..."
            suppressHydrationWarning
            className="min-h-[140px] w-full resize-none rounded border border-amber-200 bg-amber-50 p-3 text-sm text-slate-800 outline-none placeholder:text-amber-700/40 sm:min-h-[180px]"
          />
        </Widget>
      </div>

      <button
        type="button"
        suppressHydrationWarning
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-[#5a8dee] shadow-lg transition hover:shadow-xl"
        aria-label="Open chat"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
