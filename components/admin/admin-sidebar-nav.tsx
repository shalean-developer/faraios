"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  Clock,
  CreditCard,
  GitBranch,
  Globe,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  Lightbulb,
  Mail,
  Search,
  Server,
  Settings,
  Users,
  Zap,
} from "lucide-react";

import {
  ADMIN_INFRASTRUCTURE_NAV,
  ADMIN_INTERNAL_NAV,
  ADMIN_OPERATIONS_NAV,
  ADMIN_PLATFORM_NAV,
  ADMIN_SYSTEM_NAV,
  type AdminNavKey,
} from "@/lib/constants/admin-nav";
import { cn } from "@/lib/utils";

const ICONS: Partial<Record<AdminNavKey, React.ElementType>> = {
  overview: LayoutDashboard,
  dashboard: LayoutDashboard,
  businesses: Building2,
  clients: Building2,
  users: Users,
  revenue: CreditCard,
  websites: Globe,
  seo: Search,
  domains: Globe2,
  hosting: Server,
  apiUsage: Zap,
  emails: Mail,
  cron: Clock,
  support: LifeBuoy,
  featureRequests: Lightbulb,
  pipeline: GitBranch,
  team: Users,
  analytics: BarChart3,
  activity: Bell,
  settings: Settings,
};

const MAIN_NAV_GROUPS = [
  ADMIN_PLATFORM_NAV,
  ADMIN_INFRASTRUCTURE_NAV,
  ADMIN_OPERATIONS_NAV,
  ADMIN_INTERNAL_NAV,
] as const;

type AdminNavItem = {
  key: AdminNavKey;
  label: string;
  href: string;
};

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

function isNavItemActive(itemKey: AdminNavKey, activeNav: AdminNavKey) {
  return (
    activeNav === itemKey ||
    (itemKey === "businesses" && activeNav === "clients") ||
    (itemKey === "overview" && activeNav === "dashboard")
  );
}

function filterNavItems(items: AdminNavItem[], searchQuery: string): AdminNavItem[] {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return items;
  return items.filter((item) => item.label.toLowerCase().includes(query));
}

function NavItem({
  item,
  activeNav,
  collapsed,
  onNavigate,
}: {
  item: AdminNavItem;
  activeNav: AdminNavKey;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.key] ?? Server;
  const isActive = isNavItemActive(item.key, activeNav);

  return (
    <li>
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        onClick={onNavigate}
        className={navItemClass(isActive, collapsed)}
      >
        <Icon className={iconClass(isActive)} strokeWidth={1.75} />
        {!collapsed ? <span className="truncate">{item.label}</span> : null}
      </Link>
    </li>
  );
}

export function AdminSidebarNav({
  activeNav,
  collapsed = false,
  searchQuery = "",
  onNavigate,
}: {
  activeNav: AdminNavKey;
  collapsed?: boolean;
  searchQuery?: string;
  onNavigate?: () => void;
}) {
  const filteredGroups = MAIN_NAV_GROUPS.map((group) =>
    filterNavItems([...group], searchQuery)
  ).filter((group) => group.length > 0);
  const bottomItems = filterNavItems([...ADMIN_SYSTEM_NAV], searchQuery);
  const hasMainItems = filteredGroups.some((group) => group.length > 0);

  return (
    <nav
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-white py-2",
        collapsed ? "px-1.5" : "px-2"
      )}
    >
      {hasMainItems ? (
        <ul className={cn("space-y-0.5", collapsed && "flex flex-col items-center")}>
          {filteredGroups.map((group, groupIndex) => (
            <li key={groupIndex} className="list-none">
              {groupIndex > 0 ? (
                <div
                  className={cn(
                    "my-2 border-t border-slate-100",
                    collapsed && "mx-1 w-7"
                  )}
                />
              ) : null}
              <ul className={cn("space-y-0.5", collapsed && "flex flex-col items-center")}>
                {group.map((item) => (
                  <NavItem
                    key={item.key}
                    item={item}
                    activeNav={activeNav}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : searchQuery.trim() ? (
        <p className="px-3 py-2 text-xs text-slate-400">No matching navigation items.</p>
      ) : null}

      {!collapsed && bottomItems.length > 0 && hasMainItems ? (
        <div className="my-3 border-t border-slate-100" />
      ) : null}

      {bottomItems.length > 0 ? (
        <ul
          className={cn(
            "mt-auto space-y-0.5",
            collapsed && "flex flex-col items-center"
          )}
        >
          {bottomItems.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              activeNav={activeNav}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      ) : null}
    </nav>
  );
}
