import type { BookingsView } from "@/lib/bookings/request-type";

export type CompanyNavKey =
  | "dashboard"
  | "insights"
  | "bookings"
  | "calendar"
  | "customers"
  | "services"
  | "invoices"
  | "payments"
  | "revenue"
  | "reports"
  | "websites"
  | "seo"
  | "marketing"
  | "reviews"
  | "campaigns"
  | "content"
  | "analytics"
  | "settings"
  | "team"
  | "tasks"
  | "automations"
  | "ai-insights"
  | "business-health"
  | "notifications"
  | "project"
  | "booking-form";

export function companyNavItems(
  slug: string,
  options?: { hasWebsiteProject?: boolean }
): {
  key: CompanyNavKey;
  label: string;
  href: string;
  section?: "operations" | "websites" | "growth" | "intelligence" | "settings";
}[] {
  const base = `/${encodeURIComponent(slug)}/dashboard`;
  const items: {
    key: CompanyNavKey;
    label: string;
    href: string;
    section?: "operations" | "websites" | "growth" | "intelligence" | "settings";
  }[] = [
    { key: "dashboard" as const, label: "Dashboard", href: base, section: "operations" as const },
    { key: "insights" as const, label: "Business Insights", href: `${base}/insights`, section: "intelligence" as const },
    { key: "business-health" as const, label: "Business Health", href: `${base}/business-health`, section: "intelligence" as const },
    { key: "ai-insights" as const, label: "AI Assistant", href: `${base}/ai-insights`, section: "intelligence" as const },
    { key: "reports" as const, label: "Reports", href: `${base}/reports`, section: "intelligence" as const },
    { key: "bookings" as const, label: "Bookings", href: `${base}/bookings`, section: "operations" as const },
    { key: "calendar" as const, label: "Calendar", href: `${base}/calendar`, section: "operations" as const },
    { key: "customers" as const, label: "Customers", href: `${base}/customers`, section: "operations" as const },
    { key: "services" as const, label: "Services", href: `${base}/services`, section: "operations" as const },
    { key: "invoices" as const, label: "Invoices", href: `${base}/invoices`, section: "operations" as const },
    { key: "payments" as const, label: "Payments", href: `${base}/payments`, section: "operations" as const },
    { key: "revenue" as const, label: "Revenue", href: `${base}/revenue`, section: "operations" as const },
    { key: "tasks" as const, label: "Tasks", href: `${base}/tasks`, section: "operations" as const },
    { key: "automations" as const, label: "Automations", href: `${base}/automations`, section: "operations" as const },
    { key: "notifications" as const, label: "Notifications", href: `${base}/notifications`, section: "operations" as const },
    { key: "websites" as const, label: "Websites", href: `${base}/websites`, section: "websites" as const },
    { key: "seo" as const, label: "SEO", href: `${base}/seo`, section: "growth" as const },
    { key: "marketing" as const, label: "Marketing", href: `${base}/marketing`, section: "growth" as const },
    { key: "reviews" as const, label: "Reviews", href: `${base}/reviews`, section: "growth" as const },
    { key: "campaigns" as const, label: "Campaigns", href: `${base}/campaigns`, section: "growth" as const },
    { key: "content" as const, label: "Content", href: `${base}/content`, section: "growth" as const },
    { key: "analytics" as const, label: "Analytics", href: `${base}/analytics`, section: "growth" as const },
  ];

  if (options?.hasWebsiteProject) {
    items.push({
      key: "project",
      label: "Website build",
      href: `${base}/project`,
      section: "websites",
    });
  }

  items.push(
    {
      key: "booking-form",
      label: "Booking form",
      href: `${base}/booking-form`,
      section: "operations",
    },
    { key: "settings", label: "Business", href: `${base}/settings`, section: "settings" },
    { key: "team", label: "Team", href: `${base}/team`, section: "settings" }
  );

  return items;
}

export function companyNavKeyFromPathname(
  slug: string,
  pathname: string
): CompanyNavKey {
  const base = `/${encodeURIComponent(slug)}/dashboard`;
  if (pathname === base || pathname === `${base}/`) return "dashboard";
  if (pathname.startsWith(`${base}/insights`)) return "insights";
  if (pathname.startsWith(`${base}/business-health`)) return "business-health";
  if (pathname.startsWith(`${base}/ai-insights`)) return "ai-insights";
  if (pathname.startsWith(`${base}/tasks`)) return "tasks";
  if (pathname.startsWith(`${base}/automations`)) return "automations";
  if (pathname.startsWith(`${base}/notifications`)) return "notifications";
  if (pathname.startsWith(`${base}/bookings`)) return "bookings";
  if (pathname.startsWith(`${base}/quotes`)) return "bookings";
  if (pathname.startsWith(`${base}/calendar`)) return "calendar";
  if (pathname.startsWith(`${base}/booking-form`)) return "booking-form";
  if (pathname.startsWith(`${base}/customers`)) return "customers";
  if (pathname.startsWith(`${base}/services`)) return "services";
  if (pathname.startsWith(`${base}/invoices`)) return "invoices";
  if (pathname.startsWith(`${base}/payments`)) return "payments";
  if (pathname.startsWith(`${base}/revenue`)) return "revenue";
  if (pathname.startsWith(`${base}/reports`)) return "reports";
  if (pathname.startsWith(`${base}/project`)) return "project";
  if (
    pathname.startsWith(`${base}/websites`) ||
    pathname.startsWith(`${base}/hosting`)
  ) {
    return "websites";
  }
  if (pathname.startsWith(`${base}/seo`)) return "seo";
  if (pathname.startsWith(`${base}/marketing`)) return "marketing";
  if (pathname.startsWith(`${base}/reviews`)) return "reviews";
  if (pathname.startsWith(`${base}/campaigns`)) return "campaigns";
  if (pathname.startsWith(`${base}/content`)) return "content";
  if (pathname.startsWith(`${base}/analytics`)) return "analytics";
  if (pathname.startsWith(`${base}/settings`)) return "settings";
  if (pathname.startsWith(`${base}/team`)) return "team";
  return "dashboard";
}

export type BookingsSubNavItem = {
  key: BookingsView;
  label: string;
  href: string;
};

export function bookingsSubNavItems(slug: string): BookingsSubNavItem[] {
  const base = `/${encodeURIComponent(slug)}/dashboard/bookings`;
  return [
    { key: "all", label: "All", href: base },
    { key: "booking-requests", label: "Booking Request", href: `${base}/booking-requests` },
    { key: "quote-requests", label: "Quote Request", href: `${base}/quote-requests` },
  ];
}

export function bookingsViewFromPathname(
  slug: string,
  pathname: string
): BookingsView {
  const base = `/${encodeURIComponent(slug)}/dashboard/bookings`;
  if (pathname === `${base}/booking-requests`) return "booking-requests";
  if (
    pathname === `${base}/quote-requests` ||
    pathname.startsWith(`/${encodeURIComponent(slug)}/dashboard/quotes`)
  ) {
    return "quote-requests";
  }
  return "all";
}