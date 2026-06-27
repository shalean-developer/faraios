"use client";

import { Check, Circle } from "lucide-react";
import Link from "next/link";

import type { WebsiteSetupChecklist } from "@/lib/services/website-checklist";
import { cn } from "@/lib/utils";

export function WebsiteSetupChecklistPanel({
  checklist,
  layout = "vertical",
  className,
}: {
  checklist: WebsiteSetupChecklist;
  layout?: "vertical" | "horizontal";
  className?: string;
}) {
  if (layout === "horizontal") {
    return (
      <div
        className={cn(
          "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5",
          className
        )}
      >
        <ul className="flex w-full flex-wrap items-stretch gap-2">
          {checklist.items.map((item) => (
            <li key={item.key} className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:basis-[calc(33.333%-0.375rem)] md:basis-[calc(25%-0.375rem)] lg:basis-[calc(20%-0.4rem)] xl:basis-0">
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex h-full flex-col items-start gap-1.5 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs leading-snug transition hover:border-slate-200 hover:bg-white"
                >
                  <ChecklistIcon done={item.done} />
                  <span
                    className={cn(
                      "w-full line-clamp-2",
                      item.done ? "text-slate-600" : "text-slate-900"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              ) : (
                <div className="flex h-full flex-col items-start gap-1.5 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs leading-snug">
                  <ChecklistIcon done={item.done} />
                  <span
                    className={cn(
                      "w-full line-clamp-2",
                      item.done ? "text-slate-600" : "text-slate-900"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex w-full flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="shrink-0">
            <h3 className="text-sm font-medium text-slate-700">Setup checklist</h3>
            <p className="mt-1 text-sm text-slate-500">
              {checklist.completedCount} of {checklist.totalCount} complete (
              {checklist.percentComplete}%)
            </p>
          </div>
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#5a8dee] transition-all"
              style={{ width: `${checklist.percentComplete}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-slate-700">Setup checklist</h3>
          <p className="mt-1 text-sm text-slate-500">
            {checklist.completedCount} of {checklist.totalCount} complete (
            {checklist.percentComplete}%)
          </p>
        </div>
        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#5a8dee] transition-all"
            style={{ width: `${checklist.percentComplete}%` }}
          />
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {checklist.items.map((item) => (
          <li key={item.key}>
            {item.href ? (
              <Link
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <ChecklistIcon done={item.done} />
                <span className={cn(item.done ? "text-slate-600" : "text-slate-900")}>
                  {item.label}
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                <ChecklistIcon done={item.done} />
                <span className={cn(item.done ? "text-slate-600" : "text-slate-900")}>
                  {item.label}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChecklistIcon({ done, className }: { done: boolean; className?: string }) {
  if (done) {
    return (
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700",
          className
        )}
      >
        <Check className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400",
        className
      )}
    >
      <Circle className="h-3 w-3" />
    </span>
  );
}
