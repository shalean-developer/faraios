"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FileText,
  Plus,
  Receipt,
  UserPlus,
} from "lucide-react";

import { DashboardCalendarPicker } from "@/components/company/dashboard-calendar-picker";
import { DashboardNotificationsPopover } from "@/components/company/dashboard-notifications-popover";
import {
  companyBookingsPath,
  companyCalendarPath,
  companyCustomersPath,
  companyInvoicesPath,
  companyQuotesPath,
  companyTasksPath,
} from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { CompanyNotification } from "@/types/v6-engine";

type NewMenuItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

function greetingName(displayName: string | null | undefined): string {
  const first = (displayName ?? "").trim().split(/\s+/)[0];
  return first || "there";
}

function dashboardTagline(companyName: string | null | undefined, selectedDate: Date): string {
  const workspaceName = companyName?.trim() || "your workspace";
  const today = new Date();
  const isToday =
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate();

  if (isToday) {
    return `Here's what's happening at ${workspaceName} today.`;
  }

  const formatted = selectedDate.toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `Viewing ${formatted} for ${workspaceName}.`;
}

export function CompanyDashboardHeader({
  slug,
  companyId,
  userDisplayName,
  companyName,
  notifications,
  unreadCount,
}: {
  slug: string;
  companyId: string;
  userDisplayName?: string | null;
  companyName?: string | null;
  notifications?: CompanyNotification[];
  unreadCount?: number;
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const safeNotifications = notifications ?? [];
  const safeUnreadCount = unreadCount ?? 0;

  const newMenuItems: NewMenuItem[] = [
    {
      label: "Booking",
      href: companyCalendarPath(slug),
      icon: <CalendarDays className="h-4 w-4" />,
    },
    {
      label: "Customer",
      href: companyCustomersPath(slug),
      icon: <UserPlus className="h-4 w-4" />,
    },
    {
      label: "Quote",
      href: companyQuotesPath(slug),
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: "Invoice",
      href: companyInvoicesPath(slug),
      icon: <Receipt className="h-4 w-4" />,
    },
    {
      label: "Task",
      href: companyTasksPath(slug),
      icon: <CheckSquare className="h-4 w-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Hi {greetingName(userDisplayName)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {dashboardTagline(companyName, selectedDate)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <details className="group relative">
            <summary
              className={cn(
                "flex cursor-pointer list-none items-center gap-1 rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors",
                "hover:bg-slate-800 [&::-webkit-details-marker]:hidden"
              )}
            >
              <Plus className="h-4 w-4" />
              New
              <ChevronDown className="h-4 w-4 opacity-80 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 z-30 mt-2 min-w-[11rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {newMenuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <span className="text-slate-500">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <Link
                href={companyBookingsPath(slug)}
                className="flex items-center gap-2.5 border-t border-slate-100 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <span className="text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                </span>
                All bookings
              </Link>
            </div>
          </details>

          <DashboardNotificationsPopover
            slug={slug}
            companyId={companyId}
            notifications={safeNotifications}
            unreadCount={safeUnreadCount}
          />

          <DashboardCalendarPicker value={selectedDate} onChange={setSelectedDate} />
        </div>
      </div>
    </header>
  );
}
