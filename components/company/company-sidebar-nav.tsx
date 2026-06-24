"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  CreditCard,
  Globe,
  LifeBuoy,
  Lightbulb,
  LayoutDashboard,
  Megaphone,
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
import { companyNotificationsPath } from "@/lib/paths/company";
import type { PermissionKey } from "@/lib/permissions/shared";
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
} as const;

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
  userPermissions: PermissionKey[]
) {
  switch (collapsible) {
    case "bookings":
      return bookingsSubNavItems(slug);
    case "customers":
      return customersSubNavItems(slug);
    case "revenue":
      return filterSubNavItems(
        revenueSubNavItems(slug).map((item) => ({
          ...item,
          permissions: ["view_revenue"] as PermissionKey[],
        })),
        userPermissions
      );
    case "websites":
      return filterSubNavItems(
        websiteSubNavItems(slug, { hasWebsiteProject }).map((item) => ({
          ...item,
          permissions: ["view_websites"] as PermissionKey[],
        })),
        userPermissions
      );
    case "team":
      return filterSubNavItems(teamSubNavItems(slug), userPermissions);
    case "growth":
      return filterSubNavItems(growthSubNavItems(slug), userPermissions);
    case "intelligence":
      return filterSubNavItems(intelligenceSubNavItems(slug), userPermissions);
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
}: {
  slug: string;
  activeNav: CompanyNavKey;
  hasWebsiteProject?: boolean;
  collapsed?: boolean;
  userPermissions?: PermissionKey[];
}) {
  const pathname = usePathname() ?? "";
  const items = filterCompanyNavItems(
    companyNavItems(slug, { hasWebsiteProject }),
    userPermissions
  );
  const { expanded, toggleSection, openSection } = useCollapsibleNavSections(
    slug,
    pathname,
    activeNav
  );

  return (
    <nav
      className={cn(
        "min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-2",
        !collapsed && "py-3"
      )}
    >
      {SECTION_ORDER.map((section) => {
        const sectionItems = items.filter((item) => item.section === section);
        if (sectionItems.length === 0) return null;

        return (
          <div key={section} className={collapsed ? "mb-1" : "mb-3"}>
            {!collapsed ? (
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {SECTION_LABELS[section]}
              </p>
            ) : null}
            <ul className={cn(collapsed && "flex flex-col items-center gap-0.5")}>
              {sectionItems.map((item) => {
                const Icon = ICONS[item.key];
                const isActive = activeNav === item.key;
                const collapsible = item.collapsible;
                const showSubNav =
                  collapsible && !collapsed && expanded[collapsible];
                const subNavItems = collapsible
                  ? getSubNavItems(slug, collapsible, hasWebsiteProject, userPermissions)
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
                      aria-expanded={
                        collapsible && !collapsed ? expanded[collapsible] : undefined
                      }
                      className={cn(
                        "flex items-center text-sm font-medium transition-all",
                        collapsed
                          ? "h-9 w-9 justify-center rounded-lg"
                          : "mb-0.5 gap-2.5 rounded-lg px-2.5 py-2",
                        isActive
                          ? "bg-violet-600 text-white shadow-md shadow-violet-900/30"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-white" : "text-slate-500"
                        )}
                      />
                      {!collapsed ? (
                        <>
                          <span className="truncate">{item.label}</span>
                          {collapsible ? (
                            <ChevronDown
                              className={cn(
                                "ml-auto h-4 w-4 shrink-0 transition-transform duration-200",
                                expanded[collapsible] && "rotate-180",
                                isActive ? "text-white/80" : "text-slate-500"
                              )}
                            />
                          ) : null}
                        </>
                      ) : null}
                    </Link>
                    {showSubNav ? (
                      <ul className="mb-1 ml-3 space-y-0.5 border-l border-slate-700 pl-2.5">
                        {subNavItems.map((subItem) => {
                          const isSubActive = activeSubNavKey === subItem.key;
                          return (
                            <li key={subItem.key}>
                              <Link
                                href={subItem.href}
                                className={cn(
                                  "block rounded-md px-2 py-1.5 text-xs font-medium transition-all",
                                  isSubActive
                                    ? "bg-violet-600/90 text-white"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
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

      {!collapsed ? (
        <div className="mt-2 border-t border-slate-800 pt-2">
          <Link
            href={companyNotificationsPath(slug)}
            className={cn(
              "mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all",
              pathname.includes("/notifications")
                ? "bg-violet-600 text-white shadow-md shadow-violet-900/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Bell className="h-4 w-4 shrink-0" />
            <span className="truncate">Notifications</span>
          </Link>
        </div>
      ) : (
        <div className="mt-2 flex justify-center border-t border-slate-800 pt-2">
          <Link
            href={companyNotificationsPath(slug)}
            title="Notifications"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
              pathname.includes("/notifications")
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Bell className="h-4 w-4" />
          </Link>
        </div>
      )}
    </nav>
  );
}
