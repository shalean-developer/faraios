import type { BookingsView } from "@/lib/bookings/request-type";
import type { PermissionKey } from "@/lib/permissions/shared";
import { hasAnyPermission } from "@/lib/permissions/shared";
import {
  dashboardBaseFromPathname,
} from "@/lib/paths/workspace";
import {
  companyAutomationsPath,
  companyAnalyticsPath,
  companyAiInsightsPath,
  companyBookingFormPath,
  companyBookingsPath,
  companyBusinessHealthPath,
  companyCalendarPath,
  companyCampaignsPath,
  companyCustomerSegmentsPath,
  companyCustomersPath,
  companyDashboardPath,
  companyGrowthPath,
  companyHostingPath,
  companyInsightsPath,
  companyIntelligencePath,
  companyInvoicesPath,
  companyLeadsPath,
  companyMarketingPath,
  companyPaymentSettingsPath,
  companyPaymentsPath,
  companyProjectPath,
  companyQuotesPath,
  companyReportsPath,
  companyRevenuePath,
  companyReviewsPath,
  companySeoPath,
  companyServicesPath,
  companySettingsPath,
  companyBillingPath,
  companySubscriptionPath,
  companyRetentionCampaignsPath,
  companySupportPath,
  companyFeatureRequestsPath,
  companyTasksPath,
  companyTeamPath,
  companyTeamRolesPath,
  companyTeamStaffPath,
  companyWebsiteApiKeysPath,
  companyWebsiteConnectionPath,
  companyWebsiteDomainsPath,
  companyWebsiteHostingPath,
  companyWebsiteTrackingPath,
  companyWebsiteBuilderPath,
  companyWebsiteBuilderSectionPath,
  companyWebsitesPath,
} from "@/lib/paths/company";

export type CompanyNavSection =
  | "home"
  | "operations"
  | "revenue"
  | "website"
  | "growth"
  | "team"
  | "intelligence"
  | "settings";

export type CompanyNavKey =
  | "dashboard"
  | "bookings"
  | "calendar"
  | "customers"
  | "services"
  | "revenue"
  | "websites"
  | "growth"
  | "team"
  | "tasks"
  | "automations"
  | "intelligence"
  | "support"
  | "featureRequests"
  | "settings"
  | "subscription"
  | "billing";

export type CollapsibleNavKey =
  | "bookings"
  | "customers"
  | "revenue"
  | "websites"
  | "growth"
  | "team"
  | "intelligence";

export const COLLAPSIBLE_NAV_KEYS: CollapsibleNavKey[] = [
  "bookings",
  "customers",
  "revenue",
  "websites",
  "growth",
  "team",
  "intelligence",
];

import type { IndustryNavLabels } from "@/lib/industry-templates/industryTemplates";

export function companyNavItems(
  slug: string,
  options?: {
    hasWebsiteProject?: boolean;
    navLabels?: Partial<IndustryNavLabels>;
  }
): {
  key: CompanyNavKey;
  label: string;
  href: string;
  section: CompanyNavSection;
  collapsible?: CollapsibleNavKey;
  permissions?: PermissionKey[];
}[] {
  const labels = options?.navLabels;
  const items: {
    key: CompanyNavKey;
    label: string;
    href: string;
    section: CompanyNavSection;
    collapsible?: CollapsibleNavKey;
    permissions?: PermissionKey[];
  }[] = [
    {
      key: "dashboard",
      label: "Overview",
      href: companyDashboardPath(slug),
      section: "home",
    },
    {
      key: "bookings",
      label: labels?.bookings ?? "Bookings",
      href: companyBookingsPath(slug),
      section: "operations",
      collapsible: "bookings",
      permissions: ["view_bookings"],
    },
    {
      key: "calendar",
      label: labels?.calendar ?? "Calendar",
      href: companyCalendarPath(slug),
      section: "operations",
      permissions: ["view_bookings"],
    },
    {
      key: "customers",
      label: labels?.customers ?? "Customers",
      href: companyCustomersPath(slug),
      section: "operations",
      collapsible: "customers",
      permissions: ["view_customers"],
    },
    {
      key: "services",
      label: labels?.services ?? "Services",
      href: companyServicesPath(slug),
      section: "operations",
      permissions: ["view_customers"],
    },
    {
      key: "revenue",
      label: labels?.revenue ?? "Revenue",
      href: companyRevenuePath(slug),
      section: "revenue",
      collapsible: "revenue",
      permissions: ["view_revenue"],
    },
    {
      key: "websites",
      label: "Website",
      href: companyWebsitesPath(slug),
      section: "website",
      collapsible: "websites",
      permissions: ["view_websites"],
    },
    {
      key: "growth",
      label: "Growth",
      href: companyGrowthPath(slug),
      section: "growth",
      collapsible: "growth",
      permissions: ["manage_marketing", "view_reports"],
    },
    {
      key: "team",
      label: labels?.team ?? "Team",
      href: companyTeamPath(slug),
      section: "team",
      collapsible: "team",
    },
    {
      key: "tasks",
      label: "Tasks",
      href: companyTasksPath(slug),
      section: "team",
      permissions: ["view_tasks"],
    },
    {
      key: "automations",
      label: "Automations",
      href: companyAutomationsPath(slug),
      section: "team",
      permissions: ["manage_automations"],
    },
    {
      key: "intelligence",
      label: "Intelligence",
      href: companyIntelligencePath(slug),
      section: "intelligence",
      collapsible: "intelligence",
      permissions: ["view_reports", "view_ai_insights"],
    },
    {
      key: "support",
      label: "Support",
      href: companySupportPath(slug),
      section: "settings",
    },
    {
      key: "featureRequests",
      label: "Feature requests",
      href: companyFeatureRequestsPath(slug),
      section: "settings",
    },
    {
      key: "settings",
      label: "Business",
      href: companySettingsPath(slug),
      section: "settings",
      permissions: ["manage_settings"],
    },
    {
      key: "billing",
      label: "Billing",
      href: companyBillingPath(slug),
      section: "settings",
      permissions: ["manage_settings"],
    },
    {
      key: "subscription",
      label: "Subscription",
      href: companySubscriptionPath(slug),
      section: "settings",
      permissions: ["manage_settings"],
    },
  ];

  return items;
}

export function filterCompanyNavItems(
  items: ReturnType<typeof companyNavItems>,
  userPermissions: PermissionKey[]
) {
  return items.filter((item) => hasAnyPermission(userPermissions, item.permissions));
}

export function filterSubNavItems<T extends { permissions?: PermissionKey[] }>(
  items: T[],
  userPermissions: PermissionKey[]
): T[] {
  return items.filter((item) => hasAnyPermission(userPermissions, item.permissions));
}

export function companyNavKeyFromPathname(
  slug: string,
  pathname: string
): CompanyNavKey {
  const base = dashboardBaseFromPathname(slug, pathname);
  if (pathname === base || pathname === `${base}/`) return "dashboard";
  if (pathname.startsWith(`${base}/notifications`)) return "dashboard";
  if (pathname.startsWith(`${base}/tasks`)) return "tasks";
  if (pathname.startsWith(`${base}/automations`)) return "automations";
  if (pathname.startsWith(`${base}/calendar`)) return "calendar";
  if (
    pathname.startsWith(`${base}/bookings`) ||
    pathname.startsWith(`${base}/booking-form`)
  ) {
    return "bookings";
  }
  if (pathname.startsWith(`${base}/customers`)) return "customers";
  if (pathname.startsWith(`${base}/services`)) return "services";
  if (
    pathname.startsWith(`${base}/quotes`) ||
    pathname.startsWith(`${base}/invoices`) ||
    pathname.startsWith(`${base}/payments`) ||
    pathname.startsWith(`${base}/revenue`)
  ) {
    return "revenue";
  }
  if (
    pathname.startsWith(`${base}/websites`) ||
    pathname.startsWith(`${base}/hosting`) ||
    pathname.startsWith(`${base}/project`)
  ) {
    return "websites";
  }
  if (
    pathname.startsWith(`${base}/growth`) ||
    pathname.startsWith(`${base}/leads`) ||
    pathname.startsWith(`${base}/seo`) ||
    pathname.startsWith(`${base}/marketing`) ||
    pathname.startsWith(`${base}/reviews`) ||
    pathname.startsWith(`${base}/campaigns`) ||
    pathname.startsWith(`${base}/content`) ||
    pathname.startsWith(`${base}/analytics`)
  ) {
    return "growth";
  }
  if (
    pathname.startsWith(`${base}/intelligence`) ||
    pathname.startsWith(`${base}/insights`) ||
    pathname.startsWith(`${base}/business-health`) ||
    pathname.startsWith(`${base}/ai-insights`) ||
    pathname.startsWith(`${base}/reports`)
  ) {
    return "intelligence";
  }
  if (pathname.startsWith(`${base}/billing`)) return "billing";
  if (pathname.startsWith(`${base}/subscription`)) return "subscription";
  if (pathname.startsWith(`${base}/settings`)) return "settings";
  if (pathname.startsWith(`${base}/support`)) return "support";
  if (pathname.startsWith(`${base}/feature-requests`)) return "featureRequests";
  if (pathname.startsWith(`${base}/team`)) return "team";
  return "dashboard";
}

export type BookingsSubNavItem = {
  key: BookingsView | "booking-form";
  label: string;
  href: string;
};

export function bookingsSubNavItems(slug: string): BookingsSubNavItem[] {
  const base = companyBookingsPath(slug);
  return [
    { key: "all", label: "All bookings", href: base },
    {
      key: "booking-requests",
      label: "Booking requests",
      href: `${base}/booking-requests`,
    },
    {
      key: "quote-requests",
      label: "Quote requests",
      href: `${base}/quote-requests`,
    },
    {
      key: "booking-form",
      label: "Form builder",
      href: companyBookingFormPath(slug),
    },
  ];
}

export function bookingsViewFromPathname(
  slug: string,
  pathname: string
): BookingsView | "booking-form" {
  const base = dashboardBaseFromPathname(slug, pathname);
  if (pathname.startsWith(`${base}/booking-form`)) return "booking-form";
  if (pathname.startsWith(`${base}/bookings/booking-requests`)) return "booking-requests";
  if (pathname.startsWith(`${base}/bookings/quote-requests`)) return "quote-requests";
  return "all";
}

export type CustomersSubNavKey = "all" | "segments";

export type CustomersSubNavItem = {
  key: CustomersSubNavKey;
  label: string;
  href: string;
};

export function customersSubNavItems(slug: string): CustomersSubNavItem[] {
  return [
    { key: "all", label: "All customers", href: companyCustomersPath(slug) },
    {
      key: "segments",
      label: "Segments",
      href: companyCustomerSegmentsPath(slug),
    },
  ];
}

export function customersSubNavKeyFromPathname(
  slug: string,
  pathname: string
): CustomersSubNavKey {
  const base = dashboardBaseFromPathname(slug, pathname);
  if (pathname.startsWith(`${base}/customers/segments`)) return "segments";
  return "all";
}

export type RevenueSubNavKey =
  | "quotes"
  | "invoices"
  | "payments"
  | "overview"
  | "payment-settings";

export type RevenueSubNavItem = {
  key: RevenueSubNavKey;
  label: string;
  href: string;
};

export function revenueSubNavItems(slug: string): RevenueSubNavItem[] {
  return [
    { key: "quotes", label: "Quotes", href: companyQuotesPath(slug) },
    { key: "invoices", label: "Invoices", href: companyInvoicesPath(slug) },
    { key: "payments", label: "Payments", href: companyPaymentsPath(slug) },
    { key: "overview", label: "Revenue", href: companyRevenuePath(slug) },
    {
      key: "payment-settings",
      label: "Payment settings",
      href: companyPaymentSettingsPath(slug),
    },
  ];
}

export function revenueSubNavKeyFromPathname(
  slug: string,
  pathname: string
): RevenueSubNavKey {
  const base = dashboardBaseFromPathname(slug, pathname);
  if (pathname.startsWith(`${base}/revenue/payment-settings`)) return "payment-settings";
  if (pathname.startsWith(`${base}/quotes`)) return "quotes";
  if (pathname.startsWith(`${base}/invoices`)) return "invoices";
  if (pathname.startsWith(`${base}/payments`)) return "payments";
  return "overview";
}

export type WebsiteSubNavKey =
  | "overview"
  | "builder"
  | "builder-pages"
  | "builder-page-builder"
  | "builder-templates"
  | "builder-components"
  | "builder-theme"
  | "builder-media"
  | "builder-navigation"
  | "builder-service-pages"
  | "builder-contact"
  | "builder-booking"
  | "builder-seo"
  | "builder-blog"
  | "builder-analytics"
  | "builder-publish"
  | "builder-domains"
  | "builder-enquiries"
  | "builder-settings"
  | "connection"
  | "domains"
  | "api-keys"
  | "tracking"
  | "hosting"
  | "billing"
  | "project";

export type WebsiteSubNavItem = {
  key: WebsiteSubNavKey;
  label: string;
  href: string;
  description?: string;
};

/** Hub-level links shown on the websites overview instead of the sidebar. */
const WEBSITE_OVERVIEW_HUB_KEYS = new Set<WebsiteSubNavKey>([
  "connection",
  "domains",
  "api-keys",
  "tracking",
  "hosting",
  "billing",
]);

/** Builder sidebar keys (V2 navigation). */
const WEBSITE_BUILDER_SIDEBAR_KEYS = new Set<WebsiteSubNavKey>([
  "builder",
  "builder-pages",
  "builder-page-builder",
  "builder-templates",
  "builder-components",
  "builder-theme",
  "builder-media",
  "builder-navigation",
  "builder-contact",
  "builder-booking",
  "builder-seo",
  "builder-blog",
  "builder-analytics",
  "builder-domains",
  "builder-publish",
  "builder-settings",
]);

function websiteSubNavCatalog(
  slug: string,
  options?: { hasWebsiteProject?: boolean }
): WebsiteSubNavItem[] {
  const items: WebsiteSubNavItem[] = [
    { key: "overview", label: "Overview", href: companyWebsitesPath(slug) },
    { key: "builder", label: "Dashboard", href: companyWebsiteBuilderPath(slug) },
    { key: "builder-pages", label: "Pages", href: companyWebsiteBuilderSectionPath(slug, "pages") },
    {
      key: "builder-page-builder",
      label: "Page Builder",
      href: companyWebsiteBuilderSectionPath(slug, "page-builder"),
    },
    {
      key: "builder-templates",
      label: "Templates",
      href: companyWebsiteBuilderSectionPath(slug, "templates"),
    },
    {
      key: "builder-components",
      label: "Components",
      href: companyWebsiteBuilderSectionPath(slug, "components"),
    },
    { key: "builder-theme", label: "Theme", href: companyWebsiteBuilderSectionPath(slug, "theme") },
    {
      key: "builder-media",
      label: "Media Library",
      href: companyWebsiteBuilderSectionPath(slug, "media"),
    },
    {
      key: "builder-navigation",
      label: "Navigation",
      href: companyWebsiteBuilderSectionPath(slug, "navigation"),
    },
    {
      key: "builder-service-pages",
      label: "Service pages",
      href: companyWebsiteBuilderSectionPath(slug, "service-pages"),
    },
    { key: "builder-contact", label: "Forms", href: companyWebsiteBuilderSectionPath(slug, "contact") },
    { key: "builder-booking", label: "Booking", href: companyWebsiteBuilderSectionPath(slug, "booking") },
    { key: "builder-seo", label: "Site SEO", href: companyWebsiteBuilderSectionPath(slug, "seo") },
    { key: "builder-blog", label: "Blog", href: companyWebsiteBuilderSectionPath(slug, "blog") },
    {
      key: "builder-analytics",
      label: "Analytics",
      href: companyWebsiteBuilderSectionPath(slug, "analytics"),
    },
    { key: "builder-domains", label: "Domains", href: companyWebsiteBuilderSectionPath(slug, "domains") },
    {
      key: "builder-publish",
      label: "Publishing",
      href: companyWebsiteBuilderSectionPath(slug, "publish"),
    },
    {
      key: "builder-settings",
      label: "Settings",
      href: companyWebsiteBuilderSectionPath(slug, "settings"),
    },
    {
      key: "builder-enquiries",
      label: "Website enquiries",
      href: companyWebsiteBuilderSectionPath(slug, "enquiries"),
    },
    {
      key: "connection",
      label: "Connection",
      href: companyWebsiteConnectionPath(slug),
      description: "Connect an external site and install widgets",
    },
    {
      key: "domains",
      label: "Domains",
      href: companyWebsiteDomainsPath(slug),
      description: "Custom domain verification and SSL",
    },
    {
      key: "api-keys",
      label: "API keys",
      href: companyWebsiteApiKeysPath(slug),
      description: "Integration keys and webhook access",
    },
    {
      key: "tracking",
      label: "Tracking",
      href: companyWebsiteTrackingPath(slug),
      description: "Analytics and UTM event tracking",
    },
    {
      key: "hosting",
      label: "Deployments",
      href: companyWebsiteHostingPath(slug),
      description: "Publish history and deployment logs",
    },
    {
      key: "billing",
      label: "Hosting plan",
      href: companyHostingPath(slug),
      description: "Hosting subscription and billing",
    },
  ];

  if (options?.hasWebsiteProject) {
    items.push({
      key: "project",
      label: "Website build",
      href: companyProjectPath(slug),
    });
  }

  return items;
}

export function websiteSubNavItems(
  slug: string,
  options?: { hasWebsiteProject?: boolean }
): WebsiteSubNavItem[] {
  return websiteSubNavCatalog(slug, options).filter(
    (item) =>
      item.key === "overview" ||
      WEBSITE_BUILDER_SIDEBAR_KEYS.has(item.key) ||
      item.key === "builder-service-pages" ||
      item.key === "builder-enquiries"
  );
}

export function websiteOverviewHubItems(
  slug: string,
  options?: { hasWebsiteProject?: boolean }
): WebsiteSubNavItem[] {
  const hub = websiteSubNavCatalog(slug, options).filter((item) =>
    WEBSITE_OVERVIEW_HUB_KEYS.has(item.key)
  );
  return [
    {
      key: "builder",
      label: "Website builder",
      href: companyWebsiteBuilderPath(slug),
      description: "Visual page builder, theme, and publishing",
    },
    ...hub,
  ];
}

export function websiteSubNavKeyFromPathname(
  slug: string,
  pathname: string
): WebsiteSubNavKey {
  const base = dashboardBaseFromPathname(slug, pathname);
  if (pathname.startsWith(`${base}/project`)) return "project";
  if (pathname.startsWith(`${base}/hosting`)) return "billing";
  if (pathname.startsWith(`${base}/websites/builder/enquiries`)) return "builder-enquiries";
  if (pathname.startsWith(`${base}/websites/builder/settings`)) return "builder-settings";
  if (pathname.startsWith(`${base}/websites/builder/analytics`)) return "builder-analytics";
  if (pathname.startsWith(`${base}/websites/builder/blog`)) return "builder-blog";
  if (pathname.startsWith(`${base}/websites/builder/navigation`)) return "builder-navigation";
  if (pathname.startsWith(`${base}/websites/builder/media`)) return "builder-media";
  if (pathname.startsWith(`${base}/websites/builder/theme`)) return "builder-theme";
  if (pathname.startsWith(`${base}/websites/builder/components`)) return "builder-components";
  if (pathname.startsWith(`${base}/websites/builder/templates`)) return "builder-templates";
  if (pathname.startsWith(`${base}/websites/builder/page-builder`)) return "builder-page-builder";
  if (pathname.startsWith(`${base}/websites/builder/domains`)) return "builder-domains";
  if (pathname.startsWith(`${base}/websites/builder/publish`)) return "builder-publish";
  if (pathname.startsWith(`${base}/websites/builder/seo`)) return "builder-seo";
  if (pathname.startsWith(`${base}/websites/builder/booking`)) return "builder-booking";
  if (pathname.startsWith(`${base}/websites/builder/contact`)) return "builder-contact";
  if (pathname.startsWith(`${base}/websites/builder/service-pages`)) return "builder-service-pages";
  if (pathname.startsWith(`${base}/websites/builder/pages`)) return "builder-pages";
  if (pathname.startsWith(`${base}/websites/builder`)) return "builder";
  if (pathname.startsWith(`${base}/websites/connection`)) return "connection";
  if (pathname.startsWith(`${base}/websites/domains`)) return "domains";
  if (pathname.startsWith(`${base}/websites/api-keys`)) return "api-keys";
  if (pathname.startsWith(`${base}/websites/tracking`)) return "tracking";
  if (pathname.startsWith(`${base}/websites/hosting`)) return "hosting";
  if (pathname.startsWith(`${base}/websites`)) return "overview";
  return "overview";
}

export type TeamSubNavKey = "members" | "staff" | "roles";

export type TeamSubNavItem = {
  key: TeamSubNavKey;
  label: string;
  href: string;
  permissions?: PermissionKey[];
};

export function teamSubNavItems(slug: string): TeamSubNavItem[] {
  return [
    { key: "members", label: "Members", href: companyTeamPath(slug) },
    {
      key: "staff",
      label: "Staff",
      href: companyTeamStaffPath(slug),
    },
    {
      key: "roles",
      label: "Roles",
      href: companyTeamRolesPath(slug),
      permissions: ["manage_staff"],
    },
  ];
}

export function teamSubNavKeyFromPathname(
  slug: string,
  pathname: string
): TeamSubNavKey {
  if (pathname.startsWith(companyTeamRolesPath(slug))) return "roles";
  if (pathname.startsWith(companyTeamStaffPath(slug))) return "staff";
  return "members";
}

export type GrowthSubNavKey =
  | "overview"
  | "leads"
  | "seo"
  | "marketing"
  | "reviews"
  | "campaigns"
  | "retention"
  | "analytics";

export type GrowthSubNavItem = {
  key: GrowthSubNavKey;
  label: string;
  href: string;
  permissions?: PermissionKey[];
};

export function growthSubNavItems(slug: string): GrowthSubNavItem[] {
  return [
    { key: "overview", label: "Overview", href: companyGrowthPath(slug) },
    {
      key: "leads",
      label: "Leads",
      href: companyLeadsPath(slug),
      permissions: ["manage_marketing"],
    },
    {
      key: "seo",
      label: "SEO dashboard",
      href: companySeoPath(slug),
      permissions: ["manage_marketing"],
    },
    {
      key: "marketing",
      label: "Marketing",
      href: companyMarketingPath(slug),
      permissions: ["manage_marketing"],
    },
    {
      key: "reviews",
      label: "Reviews",
      href: companyReviewsPath(slug),
      permissions: ["manage_marketing"],
    },
    {
      key: "campaigns",
      label: "Campaigns",
      href: companyCampaignsPath(slug),
      permissions: ["manage_marketing"],
    },
    {
      key: "retention",
      label: "Retention",
      href: companyRetentionCampaignsPath(slug),
      permissions: ["manage_marketing"],
    },
    {
      key: "analytics",
      label: "Analytics",
      href: companyAnalyticsPath(slug),
      permissions: ["manage_marketing", "view_reports"],
    },
  ];
}

export function growthSubNavKeyFromPathname(
  slug: string,
  pathname: string
): GrowthSubNavKey {
  const base = dashboardBaseFromPathname(slug, pathname);
  if (pathname.startsWith(`${base}/growth`)) return "overview";
  if (pathname.startsWith(`${base}/leads`)) return "leads";
  if (pathname.startsWith(`${base}/seo`)) return "seo";
  if (pathname.startsWith(`${base}/marketing`)) return "marketing";
  if (pathname.startsWith(`${base}/reviews`)) return "reviews";
  if (pathname.startsWith(`${base}/campaigns/retention`)) return "retention";
  if (pathname.startsWith(`${base}/campaigns`)) return "campaigns";
  if (pathname.startsWith(`${base}/analytics`)) return "analytics";
  return "overview";
}

export type IntelligenceSubNavKey =
  | "overview"
  | "insights"
  | "business-health"
  | "ai-insights"
  | "reports";

export type IntelligenceSubNavItem = {
  key: IntelligenceSubNavKey;
  label: string;
  href: string;
  permissions?: PermissionKey[];
};

export function intelligenceSubNavItems(slug: string): IntelligenceSubNavItem[] {
  return [
    {
      key: "overview",
      label: "Overview",
      href: companyIntelligencePath(slug),
    },
    {
      key: "insights",
      label: "Business insights",
      href: companyInsightsPath(slug),
      permissions: ["view_reports"],
    },
    {
      key: "business-health",
      label: "Business health",
      href: companyBusinessHealthPath(slug),
      permissions: ["view_reports"],
    },
    {
      key: "ai-insights",
      label: "Smart Search",
      href: companyAiInsightsPath(slug),
      permissions: ["view_ai_insights"],
    },
    {
      key: "reports",
      label: "Reports",
      href: companyReportsPath(slug),
      permissions: ["view_reports"],
    },
  ];
}

export function intelligenceSubNavKeyFromPathname(
  slug: string,
  pathname: string
): IntelligenceSubNavKey {
  const base = dashboardBaseFromPathname(slug, pathname);
  if (pathname.startsWith(`${base}/intelligence`)) return "overview";
  if (pathname.startsWith(`${base}/insights`)) return "insights";
  if (pathname.startsWith(`${base}/business-health`)) return "business-health";
  if (pathname.startsWith(`${base}/ai-insights`)) return "ai-insights";
  if (pathname.startsWith(`${base}/reports`)) return "reports";
  return "overview";
}

export function isPathInCollapsibleSection(
  slug: string,
  pathname: string,
  section: CollapsibleNavKey
): boolean {
  const base = dashboardBaseFromPathname(slug, pathname);
  switch (section) {
    case "bookings":
      return (
        pathname.startsWith(`${base}/bookings`) ||
        pathname.startsWith(`${base}/booking-form`)
      );
    case "customers":
      return pathname.startsWith(`${base}/customers`);
    case "revenue":
      return (
        pathname.startsWith(`${base}/quotes`) ||
        pathname.startsWith(`${base}/invoices`) ||
        pathname.startsWith(`${base}/payments`) ||
        pathname.startsWith(`${base}/revenue`)
      );
    case "websites":
      return (
        pathname.startsWith(`${base}/websites`) ||
        pathname.startsWith(`${base}/hosting`) ||
        pathname.startsWith(`${base}/project`)
      );
    case "team":
      return pathname.startsWith(`${base}/team`);
    case "growth":
      return (
        pathname.startsWith(`${base}/growth`) ||
        pathname.startsWith(`${base}/seo`) ||
        pathname.startsWith(`${base}/marketing`) ||
        pathname.startsWith(`${base}/reviews`) ||
        pathname.startsWith(`${base}/campaigns`) ||
        pathname.startsWith(`${base}/analytics`)
      );
    case "intelligence":
      return (
        pathname.startsWith(`${base}/intelligence`) ||
        pathname.startsWith(`${base}/insights`) ||
        pathname.startsWith(`${base}/business-health`) ||
        pathname.startsWith(`${base}/ai-insights`) ||
        pathname.startsWith(`${base}/reports`)
      );
    default:
      return false;
  }
}
