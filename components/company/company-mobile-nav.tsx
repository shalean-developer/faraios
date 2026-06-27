"use client";

import Link from "next/link";
import { ChevronDown, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { CompanySidebarSearch } from "@/components/company/company-sidebar-search";
import {
  bookingsSubNavItems,
  bookingsViewFromPathname,
  customersSubNavItems,
  customersSubNavKeyFromPathname,
  filterSubNavItems,
  growthSubNavItems,
  growthSubNavKeyFromPathname,
  intelligenceSubNavItems,
  intelligenceSubNavKeyFromPathname,
  revenueSubNavItems,
  revenueSubNavKeyFromPathname,
  teamSubNavItems,
  teamSubNavKeyFromPathname,
  websiteSubNavItems,
  websiteSubNavKeyFromPathname,
  type CollapsibleNavKey,
  type CompanyNavKey,
} from "@/lib/constants/company-nav";
import {
  getFilteredRiseSidebarItems,
  type RiseSidebarItem,
} from "@/lib/constants/company-sidebar-nav";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import { toPlatformWorkspacePath } from "@/lib/paths/workspace";
import { usePlatformWorkspace } from "@/components/platform/platform-workspace-context";
import type { PermissionKey } from "@/lib/permissions/shared";
import {
  filterGrowthSubNavBySubscription,
  filterIntelligenceSubNavBySubscription,
  filterRevenueSubNavBySubscription,
  filterTeamSubNavBySubscription,
  filterWebsiteSubNavBySubscription,
} from "@/lib/subscriptions/nav-filter";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";
import { cn } from "@/lib/utils";

import { useCollapsibleNavSections } from "./use-collapsible-nav-sections";

function isItemActive(
  item: RiseSidebarItem,
  pathname: string,
  slug: string,
  activeNav: CompanyNavKey
): boolean {
  if (item.isActive) return item.isActive(pathname, slug, activeNav);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function getSubNavItems(
  slug: string,
  collapsible: CollapsibleNavKey,
  hasWebsiteProject: boolean,
  userPermissions: PermissionKey[],
  subscription?: SubscriptionCompanyFields
) {
  switch (collapsible) {
    case "bookings":
      return bookingsSubNavItems(slug);
    case "customers":
      return customersSubNavItems(slug);
    case "revenue": {
      const items = filterSubNavItems(
        revenueSubNavItems(slug).map((item) => ({
          ...item,
          permissions: ["view_revenue"] as PermissionKey[],
        })),
        userPermissions
      );
      return subscription ? filterRevenueSubNavBySubscription(items, subscription) : items;
    }
    case "websites": {
      const items = filterSubNavItems(
        websiteSubNavItems(slug, { hasWebsiteProject }).map((item) => ({
          ...item,
          permissions: ["view_websites"] as PermissionKey[],
        })),
        userPermissions
      );
      return subscription ? filterWebsiteSubNavBySubscription(items, subscription) : items;
    }
    case "team": {
      const items = filterSubNavItems(teamSubNavItems(slug), userPermissions);
      return subscription ? filterTeamSubNavBySubscription(items, subscription) : items;
    }
    case "growth": {
      const items = filterSubNavItems(growthSubNavItems(slug), userPermissions);
      return subscription ? filterGrowthSubNavBySubscription(items, subscription) : items;
    }
    case "intelligence": {
      const items = filterSubNavItems(intelligenceSubNavItems(slug), userPermissions);
      return subscription
        ? filterIntelligenceSubNavBySubscription(items, subscription)
        : items;
    }
    default:
      return [];
  }
}

function getActiveSubNavKey(
  slug: string,
  pathname: string,
  collapsible: CollapsibleNavKey
) {
  switch (collapsible) {
    case "bookings":
      return bookingsViewFromPathname(slug, pathname);
    case "customers":
      return customersSubNavKeyFromPathname(slug, pathname);
    case "revenue":
      return revenueSubNavKeyFromPathname(slug, pathname);
    case "websites":
      return websiteSubNavKeyFromPathname(slug, pathname);
    case "team":
      return teamSubNavKeyFromPathname(slug, pathname);
    case "growth":
      return growthSubNavKeyFromPathname(slug, pathname);
    case "intelligence":
      return intelligenceSubNavKeyFromPathname(slug, pathname);
    default:
      return null;
  }
}

export function CompanyMobileNav({
  slug,
  activeNav,
  companyName,
  hasWebsiteProject = false,
  userPermissions = [],
  subscription,
  industrySlug,
  searchQuery = "",
  onSearchChange,
  open,
  onOpenChange,
}: {
  slug: string;
  activeNav: CompanyNavKey;
  companyName: string;
  hasWebsiteProject?: boolean;
  userPermissions?: PermissionKey[];
  subscription?: SubscriptionCompanyFields;
  industrySlug?: string | null;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname() ?? "";
  const platformWorkspace = usePlatformWorkspace();

  useBodyScrollLock(open);

  const hrefFor = (href: string) =>
    platformWorkspace.active ? toPlatformWorkspacePath(slug, href) : href;

  const { top: topItems, bottom: bottomItems } = getFilteredRiseSidebarItems({
    slug,
    userPermissions,
    subscription,
    industrySlug,
    searchQuery,
    workspaceMode: platformWorkspace.active,
  });

  const { expanded, toggleSection, openSection } = useCollapsibleNavSections(
    slug,
    pathname,
    activeNav
  );

  const handleCollapsibleClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    collapsible: CollapsibleNavKey,
    isActive: boolean
  ) => {
    if (isActive) {
      event.preventDefault();
      toggleSection(collapsible);
      return;
    }
    openSection(collapsible);
    onOpenChange(false);
  };

  const renderNavItem = (item: RiseSidebarItem) => {
    const isActive = isItemActive(item, pathname, slug, activeNav);
    const collapsible = item.collapsible;
    const subNavItems = collapsible
      ? getSubNavItems(
          slug,
          collapsible,
          hasWebsiteProject,
          userPermissions,
          subscription
        )
      : [];
    const activeSubNavKey = collapsible
      ? getActiveSubNavKey(slug, pathname, collapsible)
      : null;

    return (
      <li key={item.key}>
        <Link
          href={item.href}
          onClick={
            collapsible
              ? (event) => handleCollapsibleClick(event, collapsible, isActive)
              : () => onOpenChange(false)
          }
          aria-expanded={collapsible ? expanded[collapsible] : undefined}
          className={cn(
            "flex items-center rounded-md px-3 py-2.5 text-sm font-medium",
            isActive
              ? "bg-[#5a8dee] text-white"
              : "text-[#717d96] hover:bg-[#f5f7fb]"
          )}
        >
          <span>{item.label}</span>
          {item.badge != null && item.badge > 0 ? (
            <span className="ml-auto rounded bg-white/20 px-1.5 py-0.5 text-[11px] font-medium leading-none">
              {item.badge}
            </span>
          ) : collapsible ? (
            <ChevronDown
              className={cn(
                "ml-auto h-4 w-4 transition-transform duration-200",
                expanded[collapsible] && "rotate-180",
                isActive ? "text-white/80" : "text-slate-400"
              )}
            />
          ) : null}
        </Link>
        {collapsible && expanded[collapsible] ? (
          <ul className="mt-1 space-y-0.5 border-l border-slate-200 pl-3">
            {subNavItems.map((subItem) => {
              const isSubActive = activeSubNavKey === subItem.key;
              return (
                <li key={subItem.key}>
                  <Link
                    href={hrefFor(subItem.href)}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "block rounded-md px-3 py-2 text-xs font-medium",
                      isSubActive
                        ? "bg-[#eef2ff] text-[#5a8dee]"
                        : "text-[#717d96] hover:bg-[#f5f7fb]"
                    )}
                  >
                    {subItem.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/40 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(280px,88vw)] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!open}
        aria-label="Workspace navigation"
      >
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-slate-200 px-3">
          <div className="min-w-0 pr-2">
            <p className="truncate text-sm font-semibold text-slate-900">{companyName}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">
              Workspace
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close menu"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {onSearchChange ? (
          <div className="shrink-0 border-b border-slate-100 px-3 py-2">
            <CompanySidebarSearch value={searchQuery} onChange={onSearchChange} />
          </div>
        ) : null}

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label="Main">
          <ul className="grid gap-1">{topItems.map((item) => renderNavItem(item))}</ul>
          {bottomItems.length > 0 ? <div className="my-3 border-t border-slate-100" /> : null}
          <ul className="grid gap-1">{bottomItems.map((item) => renderNavItem(item))}</ul>
        </nav>
      </aside>
    </>
  );
}
