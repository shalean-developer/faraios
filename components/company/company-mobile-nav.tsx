"use client";

import Link from "next/link";
import { Bell, ChevronDown, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
import { companyNotificationsPath } from "@/lib/paths/company";
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
  open: controlledOpen,
  onOpenChange,
  panelOnly = false,
}: {
  slug: string;
  activeNav: CompanyNavKey;
  companyName: string;
  hasWebsiteProject?: boolean;
  userPermissions?: PermissionKey[];
  subscription?: SubscriptionCompanyFields;
  industrySlug?: string | null;
  searchQuery?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  panelOnly?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const platformWorkspace = usePlatformWorkspace();

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
    setOpen(false);
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
              : () => setOpen(false)
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
                    onClick={() => setOpen(false)}
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
      {!panelOnly ? (
        <div className="border-b border-slate-200 bg-white lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{companyName}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">
                Workspace
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={hrefFor(companyNotificationsPath(slug))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(!open)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
                aria-label={open ? "Close menu" : "Open menu"}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {open ? (
        <>
          {panelOnly ? (
            <button
              type="button"
              className="absolute inset-0 z-10 bg-slate-900/20 lg:hidden"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
          ) : null}
          <div
            className={cn(
              "border-b border-slate-200 bg-white lg:hidden",
              panelOnly && "absolute inset-x-0 top-0 z-20 max-h-[calc(100vh-52px)] shadow-lg"
            )}
          >
            <nav
              className={cn(
                "overflow-y-auto px-3 py-3",
                panelOnly ? "max-h-[calc(100vh-52px)]" : "max-h-[70vh] border-t border-slate-100"
              )}
            >
              <ul className="grid gap-1">
                {topItems.map((item) => renderNavItem(item))}
              </ul>
              {bottomItems.length > 0 ? (
                <div className="my-3 border-t border-slate-100" />
              ) : null}
              <ul className="grid gap-1">{bottomItems.map((item) => renderNavItem(item))}</ul>
            </nav>
          </div>
        </>
      ) : null}
    </>
  );
}
