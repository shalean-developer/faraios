"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { CompanySidebarSearch } from "@/components/company/company-sidebar-search";
import { ADMIN_SEARCH_FOCUS_EVENT } from "@/lib/constants/workspace-events";
import { cn } from "@/lib/utils";

export function AdminSidebarBrand({
  collapsed = false,
  onToggle,
  searchQuery,
  onSearchChange,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}) {
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
      <div className="flex shrink-0 flex-col items-center gap-1 border-b border-slate-200 px-2 py-2 dark:border-slate-800">
        {toggleButton}
        <CompanySidebarSearch
          value={searchQuery}
          onChange={onSearchChange}
          collapsed
          focusEventName={ADMIN_SEARCH_FOCUS_EVENT}
        />
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-slate-200 dark:border-slate-800">
      {toggleButton ? (
        <div className="flex justify-end px-2 pt-2">{toggleButton}</div>
      ) : null}
      <CompanySidebarSearch
        value={searchQuery}
        onChange={onSearchChange}
        focusEventName={ADMIN_SEARCH_FOCUS_EVENT}
      />
    </div>
  );
}
