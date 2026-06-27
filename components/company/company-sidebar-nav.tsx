"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

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
import { toPlatformWorkspacePath } from "@/lib/paths/workspace";
import { AgencyWorkspaceNavSection } from "@/components/company/agency-workspace-nav-section";
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

function navItemClass(isActive: boolean, collapsed: boolean) {
  return cn(
    "group flex w-full items-center transition-colors",
    collapsed ? "h-9 w-9 justify-center rounded-md" : "gap-3 rounded-md px-3 py-2 text-[13px]",
    isActive
      ? "bg-[#5a8dee] font-medium text-white"
      : "text-[#717d96] hover:bg-[#f5f7fb] hover:text-[#4b5563]"
  );
}

function iconClass(isActive: boolean) {
  return cn(
    "h-[18px] w-[18px] shrink-0",
    isActive ? "text-white" : "text-[#717d96] group-hover:text-[#4b5563]"
  );
}

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
        revenueSubNavItems(slug).map((sub) => ({
          ...sub,
          permissions: ["view_revenue"] as PermissionKey[],
        })),
        userPermissions
      );
      return subscription ? filterRevenueSubNavBySubscription(items, subscription) : items;
    }
    case "websites": {
      const items = filterSubNavItems(
        websiteSubNavItems(slug, { hasWebsiteProject }).map((sub) => ({
          ...sub,
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

export function CompanySidebarNav({
  slug,
  activeNav,
  hasWebsiteProject = false,
  collapsed = false,
  userPermissions = [],
  subscription,
  industrySlug,
  searchQuery = "",
  supportTicketCount = null,
  onNavigate,
}: {
  slug: string;
  activeNav: CompanyNavKey;
  hasWebsiteProject?: boolean;
  collapsed?: boolean;
  userPermissions?: PermissionKey[];
  subscription?: SubscriptionCompanyFields;
  industrySlug?: string | null;
  searchQuery?: string;
  supportTicketCount?: number | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const platformWorkspace = usePlatformWorkspace();

  const hrefFor = (href: string) =>
    platformWorkspace.active ? toPlatformWorkspacePath(slug, href) : href;

  const { top: topItems, bottom: bottomItems } = getFilteredRiseSidebarItems({
    slug,
    userPermissions,
    subscription,
    industrySlug,
    searchQuery,
    supportTicketCount,
    workspaceMode: platformWorkspace.active,
  });

  const { expanded, toggleSection, openSection } = useCollapsibleNavSections(
    slug,
    pathname,
    activeNav
  );

  const renderNavItem = (item: RiseSidebarItem) => {
    const Icon = item.icon;
    const isActive = isItemActive(item, pathname, slug, activeNav);
    const collapsible = item.collapsible;
    const showSubNav = collapsible && !collapsed && expanded[collapsible];
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
          title={collapsed ? item.label : undefined}
          onClick={
            collapsible
              ? (event) => {
                  if (isActive) {
                    event.preventDefault();
                    toggleSection(collapsible);
                    return;
                  }
                  openSection(collapsible);
                }
              : undefined
          }
          aria-expanded={collapsible && !collapsed ? expanded[collapsible] : undefined}
          className={navItemClass(isActive, collapsed)}
        >
          <Icon className={iconClass(isActive)} strokeWidth={1.75} />
          {!collapsed ? (
            <>
              <span className="truncate">{item.label}</span>
              {item.badge != null && item.badge > 0 ? (
                <span className="ml-auto rounded bg-[#5a8dee] px-1.5 py-0.5 text-[11px] font-medium leading-none text-white">
                  {item.badge}
                </span>
              ) : collapsible ? (
                <ChevronDown
                  className={cn(
                    "ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                    isActive ? "text-white/80" : "text-[#a0aec0]",
                    expanded[collapsible] && "rotate-180"
                  )}
                />
              ) : null}
            </>
          ) : null}
        </Link>
        {showSubNav && subNavItems.length > 0 ? (
          <ul className="mt-0.5 space-y-0.5 py-1 pl-9 pr-2">
            {subNavItems.map((subItem) => {
              const isSubActive = activeSubNavKey === subItem.key;
              return (
                <li key={subItem.key}>
                  <Link
                    href={hrefFor(subItem.href)}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-[12px] transition-colors",
                      isSubActive
                        ? "bg-[#eef2ff] font-medium text-[#5a8dee]"
                        : "text-[#717d96] hover:bg-[#f5f7fb] hover:text-[#4b5563]"
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
    <nav
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-white py-2",
        collapsed ? "px-1.5" : "px-2"
      )}
    >
      <ul className={cn("space-y-0.5", collapsed && "flex flex-col items-center")}>
        {topItems.map((item) => renderNavItem(item))}
      </ul>

      {platformWorkspace.active && platformWorkspace.session ? (
        <>
          {!collapsed && topItems.length > 0 ? (
            <div className="my-3 border-t border-violet-100" />
          ) : null}
          <AgencyWorkspaceNavSection
            slug={slug}
            session={platformWorkspace.session}
            pathname={pathname}
            collapsed={collapsed}
            searchQuery={searchQuery}
            onNavigate={onNavigate}
          />
        </>
      ) : null}

      {!collapsed && bottomItems.length > 0 ? (
        <div className="my-3 border-t border-slate-100" />
      ) : null}

      <ul
        className={cn(
          "mt-auto space-y-0.5",
          collapsed && "flex flex-col items-center"
        )}
      >
        {bottomItems.map((item) => renderNavItem(item))}
      </ul>
    </nav>
  );
}
