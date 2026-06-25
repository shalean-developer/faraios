"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell } from "lucide-react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import {
  notificationEntityPath,
  notificationTypeLabel,
} from "@/lib/notifications/source-links";
import { companyNotificationsPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { CompanyNotification } from "@/types/v6-engine";

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export function DashboardNotificationsPopover({
  slug,
  companyId,
  notifications: initialNotifications,
  unreadCount: initialUnread,
}: {
  slug: string;
  companyId: string;
  notifications: CompanyNotification[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRows(initialNotifications);
    setUnreadCount(initialUnread);
  }, [initialNotifications, initialUnread]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const onMarkRead = (notificationId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await markNotificationReadAction({
        notificationId,
        companyId,
        companySlug: slug,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((current) =>
        current.map((row) =>
          row.id === notificationId
            ? { ...row, readAt: row.readAt ?? new Date().toISOString() }
            : row
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    });
  };

  const onMarkAll = () => {
    setError(null);
    startTransition(async () => {
      const result = await markAllNotificationsReadAction({
        companyId,
        companySlug: slug,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const now = new Date().toISOString();
      setRows((current) =>
        current.map((row) => ({ ...row, readAt: row.readAt ?? now }))
      );
      setUnreadCount(0);
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
          open ? "border-slate-300 bg-slate-50 text-slate-900" : "border-slate-200"
        )}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-sky-500 ring-2 ring-white" />
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={onMarkAll}
                disabled={pending}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-60"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}

          <ul className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {rows.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500">
                No notifications yet. Activity from bookings, payments, and tasks
                will appear here.
              </li>
            ) : (
              rows.map((notification) => {
                const entityHref = notificationEntityPath(
                  slug,
                  notification.entityType,
                  notification.entityId
                );
                const isUnread = !notification.readAt;

                return (
                  <li
                    key={notification.id}
                    className={cn(
                      "border-b border-slate-100 px-4 py-3 last:border-b-0",
                      isUnread ? "bg-sky-50/40" : "bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            {notificationTypeLabel(notification.type)}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {notification.title}
                        </p>
                        {notification.body ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                            {notification.body}
                          </p>
                        ) : null}
                        {entityHref ? (
                          <Link
                            href={entityHref}
                            onClick={() => setOpen(false)}
                            className="mt-1.5 inline-block text-xs font-medium text-slate-700 hover:text-slate-900"
                          >
                            View details →
                          </Link>
                        ) : null}
                      </div>
                      {isUnread ? (
                        <button
                          type="button"
                          onClick={() => onMarkRead(notification.id)}
                          disabled={pending}
                          className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <Link
              href={companyNotificationsPath(slug)}
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-slate-700 hover:text-slate-900"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
