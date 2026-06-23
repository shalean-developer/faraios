"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { FaraiLogo } from "@/components/brand/farai-logo";
import { companyDashboardPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";

import { CompanySwitcher } from "./company-switcher";
import type { UserCompany } from "@/types/database";

export function CompanySidebarBrand({
  slug,
  companyName,
  companies = [],
  collapsed = false,
  onToggle,
}: {
  slug: string;
  companyName: string;
  companies?: UserCompany[];
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const toggleButton = onToggle ? (
    <button
      type="button"
      onClick={onToggle}
      suppressHydrationWarning
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white",
        collapsed ? "h-8 w-8" : "h-8 w-8"
      )}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? (
        <PanelLeftOpen className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      )}
    </button>
  ) : null;

  if (collapsed) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1 border-b border-slate-800 px-2 py-2">
        <div className="flex w-full items-center justify-center gap-1">
          <Link
            href={companyDashboardPath(slug)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            aria-label="Workspace home"
            title={companyName}
          >
            F
          </Link>
        </div>
        {toggleButton}
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-slate-800 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={companyDashboardPath(slug)}
          className="inline-flex min-w-0 flex-1 rounded-lg bg-white px-2 py-1.5 transition-opacity hover:opacity-90"
          aria-label="Workspace home"
        >
          <FaraiLogo size="sm" priority imageClassName="max-w-[108px]" />
        </Link>
        {toggleButton}
      </div>
      <p className="mt-2 text-xs font-semibold leading-snug text-white" title={companyName}>
        {companyName}
      </p>
      <CompanySwitcher currentSlug={slug} companies={companies} />
    </div>
  );
}
