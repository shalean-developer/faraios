"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { companyNotificationsPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";

export function CompanyWorkspaceHeader({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-end border-b border-slate-200 bg-white px-4 py-2.5 lg:px-6",
        className
      )}
    >
      <Link
        href={companyNotificationsPath(slug)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
      </Link>
    </header>
  );
}
