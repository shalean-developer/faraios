"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { adminClearFailedEmailLogs } from "@/app/actions/admin";
import {
  adminRemoveHostingOrderAction,
  adminRetryFailedHostingOrdersAction,
} from "@/app/actions/hosting-admin";
import type { AdminHealthFixAction, AdminHealthIssue, AdminHealthStatus } from "@/types/admin";

const STATUS_STYLES: Record<
  AdminHealthStatus,
  { border: string; bg: string; text: string; dot: string }
> = {
  healthy: {
    border: "border-emerald-100",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
  },
  warning: {
    border: "border-amber-100",
    bg: "bg-amber-50",
    text: "text-amber-900",
    dot: "bg-amber-500",
  },
  critical: {
    border: "border-red-100",
    bg: "bg-red-50",
    text: "text-red-800",
    dot: "bg-red-500",
  },
  unknown: {
    border: "border-slate-100",
    bg: "bg-slate-50",
    text: "text-slate-700",
    dot: "bg-slate-300",
  },
};

function FixActionButton({
  action,
  onMessage,
}: {
  action: AdminHealthFixAction;
  onMessage: (message: string | null, error: string | null) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (action.kind === "link") {
    return (
      <Link
        href={action.href}
        className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
      >
        {action.label}
      </Link>
    );
  }

  const label =
    action.label ??
    (action.kind === "clear_failed_emails" ? "Clear failed logs" : "Fix issue");

  const handleClick = () => {
    onMessage(null, null);
    startTransition(async () => {
      if (action.kind === "clear_failed_emails") {
        const result = await adminClearFailedEmailLogs();
        if (!result.ok) {
          onMessage(null, result.error);
          return;
        }
        onMessage(
          result.deletedCount === 1
            ? "Cleared 1 failed email log."
            : `Cleared ${result.deletedCount ?? 0} failed email logs.`,
          null
        );
        router.refresh();
        return;
      }

      if (action.kind === "retry_hosting_orders") {
        const result = await adminRetryFailedHostingOrdersAction(action.orderIds);
        if (!result.ok) {
          onMessage(null, result.error);
          return;
        }
        onMessage(
          result.retriedCount === 1
            ? "Retried 1 hosting order."
            : `Retried ${result.retriedCount ?? 0} hosting orders.`,
          null
        );
        router.refresh();
        return;
      }

      if (action.kind === "remove_hosting_orders") {
        let removedCount = 0;
        let lastError: string | undefined;
        for (const orderId of action.orderIds) {
          const result = await adminRemoveHostingOrderAction(orderId);
          if (result.ok) {
            removedCount += 1;
          } else {
            lastError = result.error;
          }
        }
        if (removedCount === 0) {
          onMessage(null, lastError ?? "Failed to remove hosting order.");
          return;
        }
        onMessage(
          removedCount === 1
            ? "Removed 1 hosting order."
            : `Removed ${removedCount} hosting orders.`,
          null
        );
        router.refresh();
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
    >
      {isPending ? "Working…" : label}
    </button>
  );
}

function HealthIssueCard({ issue }: { issue: AdminHealthIssue }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const style = STATUS_STYLES[issue.status];

  return (
    <div className={`rounded-xl border px-4 py-3 ${style.border} ${style.bg}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`inline-flex items-center gap-2 text-sm font-semibold ${style.text}`}>
            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
            {issue.label}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-700">{issue.summary}</p>
          {message ? <p className="mt-2 text-xs font-medium text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-2 text-xs font-medium text-red-700">{error}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {issue.fixActions?.map((action, index) => (
            <FixActionButton
              key={`${issue.key}-fix-${index}`}
              action={action}
              onMessage={(nextMessage, nextError) => {
                setMessage(nextMessage);
                setError(nextError);
              }}
            />
          ))}
          {issue.actionHref ? (
            <Link
              href={issue.actionHref}
              className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              {issue.actionLabel ?? "Review"}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PlatformHealthIssues({ issues }: { issues: AdminHealthIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <HealthIssueCard key={issue.key} issue={issue} />
      ))}
    </div>
  );
}
