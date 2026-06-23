export type CompanyNavKey =
  | "dashboard"
  | "bookings"
  | "calendar"
  | "customers"
  | "services"
  | "quotes"
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
  | "project"
  | "booking-form";

export function companyNavItems(
  slug: string,
  options?: { hasWebsiteProject?: boolean }
): {
  key: CompanyNavKey;
  label: string;
  href: string;
  section?: "operations" | "websites" | "growth" | "settings";
}[] {
  const base = `/${encodeURIComponent(slug)}/dashboard`;
  const items: {
    key: CompanyNavKey;
    label: string;
    href: string;
    section?: "operations" | "websites" | "growth" | "settings";
  }[] = [
    { key: "dashboard" as const, label: "Dashboard", href: base, section: "operations" as const },
    { key: "bookings" as const, label: "Bookings", href: `${base}/bookings`, section: "operations" as const },
    { key: "calendar" as const, label: "Calendar", href: `${base}/calendar`, section: "operations" as const },
    { key: "customers" as const, label: "Customers", href: `${base}/customers`, section: "operations" as const },
    { key: "services" as const, label: "Services", href: `${base}/services`, section: "operations" as const },
    { key: "quotes" as const, label: "Quotes", href: `${base}/quotes`, section: "operations" as const },
    { key: "invoices" as const, label: "Invoices", href: `${base}/invoices`, section: "operations" as const },
    { key: "payments" as const, label: "Payments", href: `${base}/payments`, section: "operations" as const },
    { key: "revenue" as const, label: "Revenue", href: `${base}/revenue`, section: "operations" as const },
    { key: "reports" as const, label: "Reports", href: `${base}/reports`, section: "operations" as const },
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
  if (pathname.startsWith(`${base}/bookings`)) return "bookings";
  if (pathname.startsWith(`${base}/calendar`)) return "calendar";
  if (pathname.startsWith(`${base}/booking-form`)) return "booking-form";
  if (pathname.startsWith(`${base}/customers`)) return "customers";
  if (pathname.startsWith(`${base}/services`)) return "services";
  if (pathname.startsWith(`${base}/quotes`)) return "quotes";
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