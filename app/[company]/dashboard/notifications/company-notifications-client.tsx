"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
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

type ReadFilter = "all" | "unread" | "read";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  const statCards = [
    { label: "Total", value: String(summary.total) },
    { label: "Unread", value: String(summary.unread) },
    { label: "Read", value: String(summary.total - summary.unread) },
  ];

  return (
    <div>
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Bookings, payments, leads, reviews, tasks, and automations in one place.
          </p>
        </div>
        {summary.unread > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={pending}
            onClick={onMarkAll}
          >
            Mark all read
          </Button>
        ) : null}
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:w-72"
            placeholder="Search notifications..."
          />
          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {notificationTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={companyAutomationsPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Automations →
          </Link>
          <Link
            href={companyTasksPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Tasks →
          </Link>
        </div>
      </div>

      {error ? <p className="mb-3 text-sm font-medium text-red-600">{error}</p> : null}

      <ul className="space-y-2">
        {filteredRows.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            {rows.length === 0
              ? "No notifications yet. Activity from bookings, payments, and automations will appear here."
              : "No notifications match your filters."}
          </li>
        ) : (
          filteredRows.map((notification) => {
            const entityHref = notificationEntityPath(
              slug,
              notification.entityType,
              notification.entityId
            );

            return (
              <li
                key={notification.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border px-4 py-4 shadow-sm sm:flex-row sm:items-start sm:justify-between",
                  notification.readAt
                    ? "border-slate-100 bg-slate-50/80"
                    : "border-violet-200 bg-white"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-violet-700">
                      {notificationTypeLabel(notification.type)}
                    </span>
                    {!notification.readAt ? (
                      <span className="text-xs font-medium text-violet-600">Unread</span>
                    ) : null}
                  </div>
                  <p className="mt-2 font-medium text-slate-900">{notification.title}</p>
                  {notification.body ? (
                    <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-400">
                    {formatDateTime(notification.createdAt)}
                  </p>
                  {entityHref ? (
                    <Link
                      href={entityHref}
                      className="mt-2 inline-block text-sm font-medium text-violet-700 hover:text-violet-900"
                    >
                      View related record →
                    </Link>
                  ) : null}
                </div>
                {!notification.readAt ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-lg"
                    disabled={pending}
                    onClick={() => onMarkRead(notification.id)}
                  >
                    Mark read
                  </Button>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
