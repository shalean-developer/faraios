import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Command,
  CreditCard,
  Globe,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Monitor,
  PieChart,
  RefreshCw,
  Settings,
  ShoppingCart,
  Sparkles,
  Users2,
  Wrench,
  Zap,
} from "lucide-react";

import type { CollapsibleNavKey, CompanyNavKey } from "@/lib/constants/company-nav";
import type { IndustryNavLabels } from "@/lib/industry-templates/industryTemplates";
import { getIndustryNavLabels } from "@/lib/industry-templates/industryTemplates";
import type { PermissionKey } from "@/lib/permissions/shared";
import { hasAnyPermission } from "@/lib/permissions/shared";
import {
  companyAutomationsPath,
  companyBillingPath,
  companyBookingsPath,
  companyCalendarPath,
  companyContentPath,
  companyCustomersPath,
  companyDashboardPath,
  companyFeatureRequestsPath,
  companyGrowthPath,
  companyIntelligencePath,
  companyNotificationsPath,
  companyProjectPath,
  companyReportsPath,
  companyRevenuePath,
  companyServicesPath,
  companySettingsPath,
  companySubscriptionPath,
  companySupportPath,
  companyTasksPath,
  companyTeamPath,
  companyWebsitesPath,
} from "@/lib/paths/company";
import { platformWorkspaceRoot, toPlatformWorkspacePath } from "@/lib/paths/workspace";
import { filterRiseSidebarBySubscription } from "@/lib/subscriptions/nav-filter";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";

export type RiseSidebarItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  navKey: CompanyNavKey;
  collapsible?: CollapsibleNavKey;
  permissions?: PermissionKey[];
  badge?: number | null;
  isActive?: (pathname: string, slug: string, activeNav: CompanyNavKey) => boolean;
};

/** Rise CRM sidebar labels mapped to FaraiOS routes. */
export const RISE_SIDEBAR_TOP_ITEMS: RiseSidebarItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "",
    icon: Monitor,
    navKey: "dashboard",
    isActive: (pathname, slug) => {
      const base = companyDashboardPath(slug);
      const workspaceBase = platformWorkspaceRoot(slug);
      return (
        pathname === base ||
        pathname === `${base}/` ||
        pathname === workspaceBase ||
        pathname === `${workspaceBase}/`
      );
    },
  },
  {
    key: "bookings",
    label: "Bookings",
    href: "",
    icon: CalendarDays,
    navKey: "bookings",
    collapsible: "bookings",
    permissions: ["view_bookings"],
    isActive: (pathname, _slug, activeNav) =>
      activeNav === "bookings" ||
      pathname.includes("/dashboard/bookings") ||
      pathname.includes("/dashboard/booking-form"),
  },
  {
    key: "calendar",
    label: "Events",
    href: "",
    icon: CalendarDays,
    navKey: "calendar",
    permissions: ["view_bookings"],
    isActive: (pathname) => pathname.includes("/dashboard/calendar"),
  },
  {
    key: "customers",
    label: "Clients",
    href: "",
    icon: Briefcase,
    navKey: "customers",
    collapsible: "customers",
    permissions: ["view_customers"],
    isActive: (pathname, _slug, activeNav) =>
      activeNav === "customers" || pathname.includes("/dashboard/customers"),
  },
  {
    key: "services",
    label: "Services",
    href: "",
    icon: Wrench,
    navKey: "services",
    permissions: ["view_customers"],
    isActive: (pathname) => pathname.includes("/dashboard/services"),
  },
  {
    key: "projects",
    label: "Projects",
    href: "",
    icon: Command,
    navKey: "websites",
    permissions: ["view_websites"],
    isActive: (pathname) => pathname.includes("/dashboard/project"),
  },
  {
    key: "tasks",
    label: "Tasks",
    href: "",
    icon: CheckCircle2,
    navKey: "tasks",
    permissions: ["view_tasks"],
    isActive: (pathname, _slug, activeNav) =>
      activeNav === "tasks" || pathname.includes("/dashboard/tasks"),
  },
  {
    key: "subscription",
    label: "Subscriptions",
    href: "",
    icon: RefreshCw,
    navKey: "subscription",
    permissions: ["manage_settings"],
    isActive: (pathname) => pathname.includes("/dashboard/subscription"),
  },
  {
    key: "revenue",
    label: "Sales",
    href: "",
    icon: ShoppingCart,
    navKey: "revenue",
    collapsible: "revenue",
    permissions: ["view_revenue"],
    isActive: (pathname, _slug, activeNav) =>
      activeNav === "revenue" ||
      pathname.includes("/dashboard/quotes") ||
      pathname.includes("/dashboard/invoices") ||
      pathname.includes("/dashboard/payments") ||
      pathname.includes("/dashboard/revenue"),
  },
  {
    key: "content",
    label: "Content",
    href: "",
    icon: BookOpen,
    navKey: "growth",
    permissions: ["manage_marketing"],
    isActive: (pathname) => pathname.includes("/dashboard/content"),
  },
  {
    key: "messages",
    label: "Messages",
    href: "",
    icon: MessageSquare,
    navKey: "dashboard",
    isActive: (pathname) => pathname.includes("/dashboard/notifications"),
  },
  {
    key: "websites",
    label: "Website",
    href: "",
    icon: Globe,
    navKey: "websites",
    collapsible: "websites",
    permissions: ["view_websites"],
    isActive: (pathname, _slug, activeNav) => {
      if (pathname.includes("/dashboard/project")) return false;
      if (pathname.includes("/dashboard/hosting")) return false;
      return activeNav === "websites" || pathname.includes("/dashboard/websites");
    },
  },
  {
    key: "growth",
    label: "Growth",
    href: "",
    icon: Sparkles,
    navKey: "growth",
    collapsible: "growth",
    permissions: ["manage_marketing", "view_reports"],
    isActive: (pathname, _slug, activeNav) => {
      if (pathname.includes("/dashboard/content")) return false;
      return (
        activeNav === "growth" ||
        pathname.includes("/dashboard/growth") ||
        pathname.includes("/dashboard/leads") ||
        pathname.includes("/dashboard/seo") ||
        pathname.includes("/dashboard/marketing") ||
        pathname.includes("/dashboard/reviews") ||
        pathname.includes("/dashboard/campaigns") ||
        pathname.includes("/dashboard/analytics")
      );
    },
  },
  {
    key: "automations",
    label: "Automations",
    href: "",
    icon: Zap,
    navKey: "automations",
    permissions: ["manage_automations"],
    isActive: (pathname) => pathname.includes("/dashboard/automations"),
  },
  {
    key: "intelligence",
    label: "Intelligence",
    href: "",
    icon: PieChart,
    navKey: "intelligence",
    collapsible: "intelligence",
    permissions: ["view_reports", "view_ai_insights"],
    isActive: (pathname, _slug, activeNav) => {
      if (pathname.includes("/dashboard/reports")) return false;
      return (
        activeNav === "intelligence" ||
        pathname.includes("/dashboard/intelligence") ||
        pathname.includes("/dashboard/insights") ||
        pathname.includes("/dashboard/business-health") ||
        pathname.includes("/dashboard/ai-insights")
      );
    },
  },
];

export const RISE_SIDEBAR_BOTTOM_ITEMS: RiseSidebarItem[] = [
  {
    key: "team",
    label: "Team",
    href: "",
    icon: Users2,
    navKey: "team",
    collapsible: "team",
    isActive: (pathname, _slug, activeNav) =>
      activeNav === "team" || pathname.includes("/dashboard/team"),
  },
  {
    key: "support",
    label: "Tickets",
    href: "",
    icon: LifeBuoy,
    navKey: "support",
    badge: null,
    isActive: (pathname) => pathname.includes("/dashboard/support"),
  },
  {
    key: "knowledge",
    label: "Knowledge base",
    href: "",
    icon: HelpCircle,
    navKey: "featureRequests",
    isActive: (pathname) => pathname.includes("/dashboard/feature-requests"),
  },
  {
    key: "billing",
    label: "Billing",
    href: "",
    icon: CreditCard,
    navKey: "billing",
    permissions: ["manage_settings"],
    isActive: (pathname) =>
      pathname.includes("/dashboard/billing") ||
      pathname.includes("/dashboard/hosting"),
  },
  {
    key: "settings",
    label: "Settings",
    href: "",
    icon: Settings,
    navKey: "settings",
    permissions: ["manage_settings"],
    isActive: (pathname) => pathname.includes("/dashboard/settings"),
  },
];

const HREF_BY_KEY: Record<string, (slug: string) => string> = {
  dashboard: companyDashboardPath,
  bookings: companyBookingsPath,
  calendar: companyCalendarPath,
  customers: companyCustomersPath,
  services: companyServicesPath,
  projects: companyProjectPath,
  tasks: companyTasksPath,
  subscription: companySubscriptionPath,
  revenue: companyRevenuePath,
  content: companyContentPath,
  messages: companyNotificationsPath,
  websites: companyWebsitesPath,
  growth: companyGrowthPath,
  automations: companyAutomationsPath,
  intelligence: companyIntelligencePath,
  team: companyTeamPath,
  support: companySupportPath,
  knowledge: companyFeatureRequestsPath,
  reports: companyReportsPath,
  billing: companyBillingPath,
  settings: companySettingsPath,
};

const INDUSTRY_LABEL_KEYS: Partial<
  Record<string, keyof IndustryNavLabels>
> = {
  bookings: "bookings",
  services: "services",
};

export function resolveRiseSidebarItems(
  slug: string,
  items: RiseSidebarItem[],
  navLabels?: Partial<IndustryNavLabels>,
  options?: { workspaceMode?: boolean }
): RiseSidebarItem[] {
  return items.map((item) => {
    const industryKey = INDUSTRY_LABEL_KEYS[item.key];
    const label =
      industryKey && navLabels?.[industryKey]
        ? navLabels[industryKey]!
        : item.label;

    const companyHref = HREF_BY_KEY[item.key]?.(slug) ?? item.href;

    return {
      ...item,
      label,
      href: options?.workspaceMode
        ? toPlatformWorkspacePath(slug, companyHref)
        : companyHref,
    };
  });
}

function filterRiseSidebarBySearch(
  items: RiseSidebarItem[],
  searchQuery: string
): RiseSidebarItem[] {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return items;
  return items.filter((item) => item.label.toLowerCase().includes(query));
}

export function getFilteredRiseSidebarItems({
  slug,
  userPermissions,
  subscription,
  industrySlug,
  searchQuery = "",
  supportTicketCount,
  workspaceMode = false,
}: {
  slug: string;
  userPermissions: PermissionKey[];
  subscription?: SubscriptionCompanyFields;
  industrySlug?: string | null;
  searchQuery?: string;
  supportTicketCount?: number | null;
  workspaceMode?: boolean;
}): { top: RiseSidebarItem[]; bottom: RiseSidebarItem[] } {
  const navLabels = getIndustryNavLabels(industrySlug);

  const resolveAndFilter = (items: RiseSidebarItem[]) => {
    const resolved = resolveRiseSidebarItems(slug, items, navLabels, {
      workspaceMode,
    }).filter((item) => hasAnyPermission(userPermissions, item.permissions));
    const subscriptionFiltered = subscription
      ? filterRiseSidebarBySubscription(resolved, subscription)
      : resolved;
    return filterRiseSidebarBySearch(subscriptionFiltered, searchQuery);
  };

  const top = resolveAndFilter(RISE_SIDEBAR_TOP_ITEMS);
  const bottom = resolveAndFilter(RISE_SIDEBAR_BOTTOM_ITEMS).map((item) =>
    item.key === "support" && supportTicketCount != null && supportTicketCount > 0
      ? { ...item, badge: supportTicketCount }
      : item
  );

  return { top, bottom };
}
