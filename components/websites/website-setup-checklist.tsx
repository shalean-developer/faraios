"use client";

import { Check, Circle } from "lucide-react";
import Link from "next/link";

import type { WebsiteSetupChecklist } from "@/lib/services/website-checklist";
import { cn } from "@/lib/utils";

export function WebsiteSetupChecklistPanel({
  checklist,
}: {
  checklist: WebsiteSetupChecklist;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900">Setup checklist</h3>
          <p className="mt-1 text-sm text-slate-500">
            {checklist.completedCount} of {checklist.totalCount} complete (
            {checklist.percentComplete}%)
          </p>
        </div>
        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-600 transition-all"
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

function ChecklistIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400">
      <Circle className="h-3 w-3" />
    </span>
  );
}
