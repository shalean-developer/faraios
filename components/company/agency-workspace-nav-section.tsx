"use client";

import Link from "next/link";
import {
  Bot,
  FileText,
  LayoutTemplate,
  Search,
  Sparkles,
  Star,
} from "lucide-react";

import { filterAgencyWorkspaceNavItems, isAgencyWorkspaceNavActive } from "@/lib/platform/agency-workspace";
import { cn } from "@/lib/utils";
import type { AgencyWorkspaceNavKey } from "@/lib/constants/agency-workspace-nav";
import type { PlatformWorkspaceSession } from "@/types/platform-workspace";

const AGENCY_ICONS: Record<AgencyWorkspaceNavKey, React.ElementType> = {
  website_design: LayoutTemplate,
  seo_tools: Search,
  content: FileText,
  automation: Bot,
  search_console: Search,
  reviews_listings: Star,
};

function navItemClass(isActive: boolean, collapsed: boolean) {
  return cn(
    "group flex w-full items-center transition-colors",
    collapsed ? "h-9 w-9 justify-center rounded-md" : "gap-3 rounded-md px-3 py-2 text-[13px]",
    isActive
      ? "bg-violet-600 font-medium text-white"
      : "text-[#717d96] hover:bg-violet-50 hover:text-violet-700"
  );
}

function iconClass(isActive: boolean) {
  return cn(
    "h-[18px] w-[18px] shrink-0",
    isActive ? "text-white" : "text-violet-500 group-hover:text-violet-600"
  );
}

export function AgencyWorkspaceNavSection({
  slug,
  session,
  pathname,
  collapsed = false,
  searchQuery = "",
  onNavigate,
}: {
  slug: string;
  session: PlatformWorkspaceSession;
  pathname: string;
  collapsed?: boolean;
  searchQuery?: string;
  onNavigate?: () => void;
}) {
  const items = filterAgencyWorkspaceNavItems(slug, session, { searchQuery });
  if (items.length === 0) return null;

  return (
    <div className={cn("mt-2", collapsed ? "px-0" : "px-0")}>
      {!collapsed ? (
        <div className="mb-2 flex items-center gap-2 px-3">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">
            Agency
          </p>
        </div>
      ) : (
        <div className="mx-auto mb-2 h-px w-7 bg-violet-100" aria-hidden="true" />
      )}
      <ul className={cn("space-y-0.5", collapsed && "flex flex-col items-center")}>
        {items.map((item) => {
          const Icon = AGENCY_ICONS[item.key] ?? Sparkles;
          const isActive = isAgencyWorkspaceNavActive(pathname, item.href);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                title={collapsed ? item.label : item.description}
                onClick={onNavigate}
                className={navItemClass(isActive, collapsed)}
              >
                <Icon className={iconClass(isActive)} strokeWidth={1.75} />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
