"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import {
  notificationEntityPath,
  notificationTypeLabel,
} from "@/lib/notifications/source-links";
import {
  companyAutomationsPath,
  companyTasksPath,
} from "@/lib/paths/company";
import type { NotificationListSummary } from "@/lib/services/notifications";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";
import type { CompanyNotification } from "@/types/v6-engine";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

type ReadFilter = "all" | "unread" | "read";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function formatRiseDateTime(value: string): string {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  return `${day}-${month}-${year} ${hour12}:${minutes} ${ampm}`;
}

function ToolbarButton({
  children,
  onClick,
  active,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50",
        active && "border-[#5c86f2] bg-[#eef2ff] text-[#4a6fd8]",
        className
      )}
    >
      {children}
    </button>
  );
}

function typeBadgeClass(type: string): string {
  if (type.includes("payment") || type.includes("invoice")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200/80";
  }
  if (type.includes("booking")) {
    return "bg-sky-50 text-sky-700 ring-sky-200/80";
  }
  if (type.includes("lead")) {
    return "bg-amber-50 text-amber-700 ring-amber-200/80";
  }
  if (type.includes("task")) {
    return "bg-violet-50 text-violet-700 ring-violet-200/80";
  }
  return "bg-slate-100 text-slate-600 ring-slate-200/80";
}

export function CompanyNotificationsClient({
  slug,
  company,
  notifications: initialNotifications,
  summary,
}: {
  slug: string;
  company: CompanyWithIndustry;
  notifications: CompanyNotification[];
  summary: NotificationListSummary;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialNotifications);
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initialNotifications);
  }, [initialNotifications]);

  const types = useMemo(() => {
    const values = new Set<string>();
    for (const row of rows) values.add(row.type);
    return Array.from(values).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((notification) => {
      if (readFilter === "unread" && notification.readAt) return false;
      if (readFilter === "read" && !notification.readAt) return false;
      if (typeFilter !== "all" && notification.type !== typeFilter) return false;
      if (!query) return true;

      return (
        notification.title.toLowerCase().includes(query) ||
        (notification.body ?? "").toLowerCase().includes(query) ||
        notification.type.toLowerCase().includes(query)
      );
    });
  }, [rows, search, readFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(pageStart, pageStart + pageSize);
  const pageEnd = Math.min(pageStart + pageRows.length, filteredRows.length);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const onMarkRead = (notificationId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await markNotificationReadAction({
        notificationId,
        companyId: company.id,
        companySlug: slug,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onMarkAll = () => {
    setError(null);
    startTransition(async () => {
      const result = await markAllNotificationsReadAction({
        companyId: company.id,
        companySlug: slug,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const readTabs: { id: ReadFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: summary.total },
    { id: "unread", label: "Unread", count: summary.unread },
    { id: "read", label: "Read", count: summary.total - summary.unread },
  ];

  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-medium text-slate-800">Notifications</h1>
            <p className="mt-1 text-sm text-slate-500">
              Bookings, payments, leads, reviews, tasks, and automations in one place.
            </p>
            <div className="mt-3 flex flex-wrap gap-6">
              {readTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setReadFilter(tab.id);
                    setPage(1);
                  }}
                  className={cn(
                    "border-b-2 pb-2 text-sm font-medium transition",
                    readFilter === tab.id
                      ? "border-[#5a8dee] text-[#4a6fd8]"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab.label}
                  <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={companyAutomationsPath(slug)} className={riseOutlineButtonClassName}>
              Automations
            </Link>
            <Link href={companyTasksPath(slug)} className={riseOutlineButtonClassName}>
              Tasks
            </Link>
            {summary.unread > 0 ? (
              <button
                type="button"
                className={riseOutlineButtonClassName}
                disabled={pending}
                onClick={onMarkAll}
              >
                <Bell className="h-4 w-4 text-[#5a8dee]" strokeWidth={1.75} />
                Mark all read
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-5">
          <ToolbarButton onClick={() => router.refresh()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton active={showFilters} onClick={() => setShowFilters((value) => !value)}>
            <Filter className="h-3.5 w-3.5" />
            Filters
          </ToolbarButton>
          {showFilters ? (
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
            >
              <option value="all">All types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {notificationTypeLabel(type)}
                </option>
              ))}
            </select>
          ) : null}
          <div className="ml-auto flex min-w-[180px] items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
            <input
              type="search"
              placeholder="Search"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {error ? <p className="px-5 pt-3 text-sm font-medium text-red-600">{error}</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-3 sm:px-5">Type</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Related</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 sm:pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                    {rows.length === 0
                      ? "No notifications yet. Activity from bookings, payments, and automations will appear here."
                      : "No notifications match your filters."}
                  </td>
                </tr>
              ) : (
                pageRows.map((notification) => {
                  const entityHref = notificationEntityPath(
                    slug,
                    notification.entityType,
                    notification.entityId
                  );
                  const isUnread = !notification.readAt;

                  return (
                    <tr
                      key={notification.id}
                      className={cn(
                        "transition hover:bg-slate-50/80",
                        isUnread && "border-l-4 border-l-[#5a8dee] bg-[#f8faff]/60"
                      )}
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                            typeBadgeClass(notification.type)
                          )}
                        >
                          {notificationTypeLabel(notification.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p
                          className={cn(
                            "text-slate-800",
                            isUnread ? "font-semibold" : "font-medium"
                          )}
                        >
                          {notification.title}
                        </p>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-600">
                        <p className="line-clamp-2">{notification.body ?? "—"}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatRiseDateTime(notification.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {entityHref ? (
                          <Link
                            href={entityHref}
                            className="inline-flex items-center gap-1 text-[#4a6fd8] hover:underline"
                          >
                            View record
                            <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isUnread ? (
                          <span className="inline-flex rounded-full bg-[#eef2ff] px-2 py-0.5 text-[11px] font-medium text-[#4a6fd8]">
                            Unread
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            Read
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 sm:pr-5">
                        {isUnread ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-[#4a6fd8] hover:underline disabled:opacity-50"
                            disabled={pending}
                            onClick={() => onMarkRead(notification.id)}
                          >
                            Mark read
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>
              {filteredRows.length === 0 ? "0" : `${pageStart + 1}-${pageEnd}`} /{" "}
              {filteredRows.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPage(num)}
                className={cn(
                  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm",
                  currentPage === num
                    ? "border-[#5a8dee] bg-[#5a8dee] text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
