"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { CompanySwitcher } from "@/components/company/company-switcher";
import { CompanySidebarSearch } from "@/components/company/company-sidebar-search";
import { normalizePlanSlug, planLabelForSlug } from "@/lib/data/pricing";
import { workspaceAvatarGradient, workspaceInitial } from "@/lib/company/workspace-avatar";
import { companyDashboardPath } from "@/lib/paths/company";
import type { UserCompany } from "@/types/database";
import { cn } from "@/lib/utils";

export function CompanySidebarBrand({
  slug,
  companyName,
  companies = [],
  planSlug,
  collapsed = false,
  onToggle,
  searchQuery,
  onSearchChange,
  hideBrand = false,
}: {
  slug: string;
  companyName: string;
  companies?: UserCompany[];
  planSlug?: string | null;
  collapsed?: boolean;
  onToggle?: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  hideBrand?: boolean;
}) {
  const planLabel = planLabelForSlug(normalizePlanSlug(planSlug));
  const avatarGradient = workspaceAvatarGradient(slug);
  const initial = workspaceInitial(companyName);

  const toggleButton = onToggle ? (
    <button
      type="button"
      onClick={onToggle}
      suppressHydrationWarning
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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
      <div className="flex shrink-0 flex-col items-center gap-1 border-b border-slate-200 px-2 py-2">
        {!hideBrand ? (
          <Link
            href={companyDashboardPath(slug)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white shadow-sm",
              avatarGradient
            )}
            aria-label="Workspace home"
            title={companyName}
          >
            {initial}
          </Link>
        ) : null}
        {toggleButton}
        <CompanySidebarSearch
          value={searchQuery}
          onChange={onSearchChange}
          collapsed
        />
      </div>
    );
  }

  if (hideBrand) {
    return (
      <div className="shrink-0 border-b border-slate-200">
        <CompanySidebarSearch value={searchQuery} onChange={onSearchChange} />
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-slate-200">
      <div className="flex items-center gap-2 px-3 py-3">
        <Link
          href={companyDashboardPath(slug)}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white",
            avatarGradient
          )}
          aria-label="Workspace home"
        >
          {initial}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p
              className="truncate text-sm font-medium text-slate-900"
              title={companyName}
            >
              {companyName}
            </p>
            <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              {planLabel}
            </span>
          </div>
        </div>
        <CompanySwitcher currentSlug={slug} companies={companies} />
        {toggleButton}
      </div>
      <CompanySidebarSearch
        value={searchQuery}
        onChange={onSearchChange}
      />
    </div>
  );
}
