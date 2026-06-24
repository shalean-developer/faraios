"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Bell,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  CreditCard,
  Gauge,
  Globe,
  LifeBuoy,
  Lightbulb,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Users2,
  Wrench,
  Zap,
} from "lucide-react";

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
import { workspaceAvatarGradient, workspaceInitial } from "@/lib/company/workspace-avatar";
import {
  companyNotificationsPath,
  companyReportsPath,
  companySettingsPath,
  companySubscriptionPath,
  companySupportPath,
} from "@/lib/paths/company";
import type { PermissionKey } from "@/lib/permissions/shared";
import { hasAnyPermission } from "@/lib/permissions/shared";
import {
  filterGrowthSubNavBySubscription,
  filterIntelligenceSubNavBySubscription,
  filterNavBySubscription,
  filterRevenueSubNavBySubscription,
  filterTeamSubNavBySubscription,
  filterWebsiteSubNavBySubscription,
} from "@/lib/subscriptions/nav-filter";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { useCollapsibleNavSections } from "./use-collapsible-nav-sections";

const ICONS = {
  dashboard: LayoutDashboard,
  bookings: CalendarDays,
  calendar: CalendarDays,
  customers: Users,
  services: Wrench,
  revenue: TrendingUp,
  websites: Globe,
  growth: Megaphone,
  team: Users2,
  tasks: CheckSquare,
  automations: Zap,
  intelligence: Sparkles,
  support: LifeBuoy,
  featureRequests: Lightbulb,
  settings: Settings,
  subscription: CreditCard,
  usage: Gauge,
} as const;

const PRIMARY_KEYS = new Set<CompanyNavKey>([
  "dashboard",
  "bookings",
  "calendar",
  "customers",
  "services",
  "revenue",
  "websites",
  "growth",
  "team",
  "tasks",
  "automations",
  "intelligence",
]);

const SECONDARY_KEYS = new Set<CompanyNavKey>([
  "support",
  "featureRequests",
  "settings",
  "subscription",
]);

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

function navItemClass(isActive: boolean, collapsed: boolean) {
  return cn(
    "group flex items-center text-sm transition-colors",
    collapsed
      ? "h-8 w-8 justify-center rounded-md"
      : "gap-2.5 rounded-md px-2 py-1.5",
    isActive
      ? "bg-slate-100 font-medium text-slate-900"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  );
}

function matchesSearch(label: string, query: string) {
  if (!query.trim()) return true;
  return label.toLowerCase().includes(query.trim().toLowerCase());
}

export function CompanySidebarNav({
  slug,
  activeNav,
  hasWebsiteProject = false,
  collapsed = false,
  userPermissions = [],
  subscription,
  searchQuery = "",
  displayName,
  userEmail,
}: {
  slug: string;
  activeNav: CompanyNavKey;
  hasWebsiteProject?: boolean;
  collapsed?: boolean;
  userPermissions?: PermissionKey[];
  subscription?: SubscriptionCompanyFields;
  searchQuery?: string;
  displayName: string;
  userEmail: string | null;
}) {
  const pathname = usePathname() ?? "";
  const [settingsOpen, setSettingsOpen] = useState(
    pathname.includes("/settings") ||
      pathname.includes("/subscription") ||
      pathname.includes("/feature-requests")
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const permissionFiltered = filterCompanyNavItems(
    companyNavItems(slug, { hasWebsiteProject }),
    userPermissions
  );
  const items = subscription
    ? filterNavBySubscription(permissionFiltered, subscription)
    : permissionFiltered;

  const primaryItems = items.filter((item) => PRIMARY_KEYS.has(item.key));
  const secondaryItems = items.filter((item) => SECONDARY_KEYS.has(item.key));

  const showUsage = hasAnyPermission(userPermissions, ["view_reports", "view_revenue"]);
  const settingsChildren = secondaryItems.filter((item) =>
    ["settings", "subscription", "featureRequests"].includes(item.key)
  );

  const { expanded, toggleSection, openSection } = useCollapsibleNavSections(
    slug,
    pathname,
    activeNav
  );

  const handleLogout = () => {
    startTransition(async () => {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    });
  };

  const renderNavItem = (
    item: (typeof items)[number],
    options?: { forceChevron?: boolean }
  ) => {
    const Icon = ICONS[item.key];
    const isActive = activeNav === item.key;
    const collapsible = item.collapsible;
    const showSubNav = collapsible && !collapsed && expanded[collapsible];
    const subNavItems = collapsible
      ? getSubNavItems(
          slug,
          collapsible,
          hasWebsiteProject,
          userPermissions,
          subscription
        ).filter((sub) => matchesSearch(sub.label, searchQuery))
      : [];
    const activeSubNavKey = collapsible
      ? getActiveSubNavKey(slug, pathname, collapsible)
      : null;

    if (!matchesSearch(item.label, searchQuery) && subNavItems.length === 0) {
      return null;
    }

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
          aria-expanded={
            collapsible && !collapsed ? expanded[collapsible] : undefined
          }
          className={navItemClass(isActive, collapsed)}
        >
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              isActive ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"
            )}
          />
          {!collapsed ? (
            <>
              <span className="truncate">{item.label}</span>
              {collapsible || options?.forceChevron ? (
                <ChevronRight
                  className={cn(
                    "ml-auto h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200",
                    collapsible && expanded[collapsible] && "rotate-90"
                  )}
                />
              ) : null}
            </>
          ) : null}
        </Link>
        {showSubNav && subNavItems.length > 0 ? (
          <ul className="ml-6 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
            {subNavItems.map((subItem) => {
              const isSubActive = activeSubNavKey === subItem.key;
              return (
                <li key={subItem.key}>
                  <Link
                    href={subItem.href}
                    className={cn(
                      "block rounded-md px-2 py-1 text-[13px] transition-colors",
                      isSubActive
                        ? "bg-slate-100 font-medium text-slate-900"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
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

  const userInitial = workspaceInitial(displayName);
  const userGradient = workspaceAvatarGradient(displayName || userEmail || "user");
  const notificationsActive = pathname.includes("/notifications");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav
        className={cn(
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-1",
          !collapsed && "px-2.5"
        )}
      >
        <ul className={cn("space-y-0.5", collapsed && "flex flex-col items-center")}>
          {primaryItems.map((item) => renderNavItem(item))}
        </ul>

        {!collapsed && (secondaryItems.length > 0 || showUsage) ? (
          <div className="my-3 border-t border-slate-200" />
        ) : null}

        <ul className={cn("space-y-0.5", collapsed && "flex flex-col items-center")}>
          {showUsage && matchesSearch("Usage", searchQuery) ? (
            <li>
              <Link
                href={companyReportsPath(slug)}
                title={collapsed ? "Usage" : undefined}
                className={navItemClass(pathname.includes("/reports"), collapsed)}
              >
                <Gauge className="h-4 w-4 shrink-0 text-slate-500" />
                {!collapsed ? <span className="truncate">Usage</span> : null}
              </Link>
            </li>
          ) : null}
          {secondaryItems
            .filter((item) => item.key === "support")
            .map((item) => renderNavItem(item))}
          {!collapsed && settingsChildren.length > 0 ? (
            <li>
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                className={cn(
                  navItemClass(
                    pathname.includes("/settings") ||
                      pathname.includes("/subscription") ||
                      pathname.includes("/feature-requests"),
                    false
                  ),
                  "w-full"
                )}
              >
                <Settings className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="truncate">Settings</span>
                <ChevronRight
                  className={cn(
                    "ml-auto h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200",
                    settingsOpen && "rotate-90"
                  )}
                />
              </button>
              {settingsOpen ? (
                <ul className="ml-6 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
                  {settingsChildren.map((item) => {
                      const isSubActive = activeNav === item.key;
                      return (
                        <li key={item.key}>
                          <Link
                            href={item.href}
                            className={cn(
                              "block rounded-md px-2 py-1 text-[13px] transition-colors",
                              isSubActive
                                ? "bg-slate-100 font-medium text-slate-900"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                            )}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              ) : null}
            </li>
          ) : collapsed ? (
            <>
              <li>
                <Link
                  href={companySettingsPath(slug)}
                  title="Settings"
                  className={navItemClass(pathname.includes("/settings"), true)}
                >
                  <Settings className="h-4 w-4 shrink-0 text-slate-500" />
                </Link>
              </li>
            </>
          ) : null}
        </ul>
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-slate-200 p-2",
          collapsed && "flex flex-col items-center gap-1"
        )}
      >
        {collapsed ? (
          <>
            <Link
              href={companyNotificationsPath(slug)}
              title="Notifications"
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800",
                notificationsActive && "bg-slate-100 text-slate-900"
              )}
            >
              <Bell className="h-4 w-4" />
            </Link>
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white",
                userGradient
              )}
              title={displayName}
            >
              {userInitial}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 rounded-md px-1 py-1">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white",
                userGradient
              )}
            >
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
              {userEmail ? (
                <p className="truncate text-[11px] text-slate-500">{userEmail}</p>
              ) : null}
            </div>
            <div className="relative flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label="Account menu"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              <Link
                href={companyNotificationsPath(slug)}
                className={cn(
                  "relative flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800",
                  notificationsActive && "bg-slate-100 text-slate-900"
                )}
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sky-500 ring-2 ring-white" />
              </Link>
              {userMenuOpen ? (
                <div className="absolute bottom-full right-0 z-30 mb-1 min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <Link
                    href={companySupportPath(slug)}
                    className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Support
                  </Link>
                  <Link
                    href={companySubscriptionPath(slug)}
                    className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Subscription
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isPending}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
