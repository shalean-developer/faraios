"use client";

import Link from "next/link";
import { Bell, ChevronDown, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  bookingsSubNavItems,
  bookingsViewFromPathname,
  companyNavItems,
  customersSubNavItems,
  customersSubNavKeyFromPathname,
  filterCompanyNavItems,
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
import { companyNotificationsPath } from "@/lib/paths/company";
import type { PermissionKey } from "@/lib/permissions/shared";
import {
  filterGrowthSubNavBySubscription,
  filterIntelligenceSubNavBySubscription,
  filterNavBySubscription,
  filterRevenueSubNavBySubscription,
  filterTeamSubNavBySubscription,
  filterWebsiteSubNavBySubscription,
} from "@/lib/subscriptions/nav-filter";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";
import { cn } from "@/lib/utils";

import { useCollapsibleNavSections } from "./use-collapsible-nav-sections";

const SECTION_LABELS: Record<string, string> = {
  home: "Home",
  operations: "Operations",
  revenue: "Revenue",
  website: "Website",
  growth: "Growth",
  team: "Team",
  intelligence: "Intelligence",
  settings: "Settings",
};

const SECTION_ORDER = [
  "home",
  "operations",
  "revenue",
  "website",
  "growth",
  "team",
  "intelligence",
  "settings",
] as const;

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
}: {
  slug: string;
  activeNav: CompanyNavKey;
  companyName: string;
  hasWebsiteProject?: boolean;
  userPermissions?: PermissionKey[];
  subscription?: SubscriptionCompanyFields;
}) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const permissionFiltered = filterCompanyNavItems(
    companyNavItems(slug, { hasWebsiteProject }),
    userPermissions
  );
  const items = subscription
    ? filterNavBySubscription(permissionFiltered, subscription)
    : permissionFiltered;
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

  return (
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
            href={companyNotificationsPath(slug)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="max-h-[70vh] overflow-y-auto border-t border-slate-100 px-3 py-3">
          {SECTION_ORDER.map((section) => {
            const sectionItems = items.filter((item) => item.section === section);
            if (sectionItems.length === 0) return null;

            return (
              <div key={section} className="mb-4">
                <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {SECTION_LABELS[section]}
                </p>
                <ul className="grid gap-1">
                  {sectionItems.map((item) => {
                    const isActive = activeNav === item.key;
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
                              ? (event) =>
                                  handleCollapsibleClick(event, collapsible, isActive)
                              : () => setOpen(false)
                          }
                          aria-expanded={
                            collapsible ? expanded[collapsible] : undefined
                          }
                          className={cn(
                            "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium",
                            isActive
                              ? "bg-violet-600 text-white"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <span>{item.label}</span>
                          {collapsible ? (
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
                                    href={subItem.href}
                                    onClick={() => setOpen(false)}
                                    className={cn(
                                      "block rounded-lg px-3 py-2 text-xs font-medium",
                                      isSubActive
                                        ? "bg-violet-100 text-violet-800"
                                        : "text-slate-600 hover:bg-slate-50"
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
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
