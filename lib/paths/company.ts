export function companyDashboardPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard`;
}

export function companyWebsitesPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/websites`;
}

export function companyWebsiteCreatePath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/websites/create`;
}

export function companyWebsiteEditPath(slug: string, websiteId: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/websites/${encodeURIComponent(websiteId)}/edit`;
}

export type CompanyBillingTab = "subscription" | "plans" | "payments" | "hosting";

type CompanyBillingPathOptions = {
  tab?: CompanyBillingTab;
  plan?: string;
  payment?: string;
  reference?: string;
};

export function companyBillingPath(
  slug: string,
  options?: CompanyBillingTab | CompanyBillingPathOptions
): string {
  const normalized =
    typeof options === "string" ? { tab: options } : (options ?? {});

  const base = `/${encodeURIComponent(slug)}/dashboard/billing`;
  const params = new URLSearchParams();

  if (normalized.tab && normalized.tab !== "subscription") {
    params.set("tab", normalized.tab);
  }
  if (normalized.plan) {
    params.set("plan", normalized.plan);
  }
  if (normalized.payment) {
    params.set("payment", normalized.payment);
  }
  if (normalized.reference) {
    params.set("reference", normalized.reference);
  }

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function companyHostingPath(
  slug: string,
  options?: { plan?: string; payment?: string; reference?: string }
): string {
  return companyBillingPath(slug, { tab: "hosting", ...options });
}

export function companyHostingOrderPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/hosting/order`;
}

export function companyHostingServicesPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/hosting/services`;
}

export function companyHostingInvoicesPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/hosting/invoices`;
}

export function companyHostingSupportPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/hosting/support`;
}

export function companyHostingDomainsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/hosting/domains`;
}

export function companyHostingMailboxesPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/hosting/mailboxes`;
}

export function companyHostingFtpPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/hosting/ftp`;
}

export function companyHostingDatabasesPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/hosting/databases`;
}

export function companyBookingsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/bookings`;
}

export function companyCustomersPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/customers`;
}

export function companyServicesPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/services`;
}

export function companyServicePath(slug: string, serviceId: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/services/${encodeURIComponent(serviceId)}`;
}

export function publicBookPath(companyId: string): string {
  return `/book/${encodeURIComponent(companyId)}`;
}

/** Public booking page by company slug (preferred share link). */
export function publicBookSlugPath(companySlug: string): string {
  return `/book/${encodeURIComponent(companySlug)}`;
}

export function companySettingsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/settings`;
}

export function companySubscriptionPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/subscription`;
}

export function companyRetentionCampaignsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/campaigns/retention`;
}

export function companySupportPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/support`;
}

export function companySupportTicketPath(slug: string, ticketId: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/support/${encodeURIComponent(ticketId)}`;
}

export function companyFeatureRequestsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/feature-requests`;
}

export function companyTeamPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/team`;
}

export function companyTeamStaffPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/team/staff`;
}

export function companyTeamRolesPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/team/roles`;
}

export function companyBookingPath(slug: string, bookingId: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/bookings/${encodeURIComponent(bookingId)}`;
}

export function companyCalendarPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/calendar`;
}

export function companyBookingFormPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/booking-form`;
}

export function companyCustomerPath(slug: string, customerId: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/customers/${encodeURIComponent(customerId)}`;
}

export function companyCustomerSegmentsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/customers/segments`;
}

export function companyQuotesPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/quotes`;
}

export function companyQuoteRequestsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/bookings/quote-requests`;
}

export function companyQuotePath(slug: string, quoteId: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/quotes/${encodeURIComponent(quoteId)}`;
}

export function companyInvoicesPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/invoices`;
}

export function companyInvoicePath(slug: string, invoiceId: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/invoices/${encodeURIComponent(invoiceId)}`;
}

export function companyPaymentsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/payments`;
}

export function companyRevenuePath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/revenue`;
}

export function companyPaymentSettingsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/revenue/payment-settings`;
}

export function companyReportsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/reports`;
}

export function companyMarketingPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/marketing`;
}

export function companyGrowthPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/growth`;
}

export function companySeoPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/seo`;
}

export function companyReviewsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/reviews`;
}

export function companyCampaignsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/campaigns`;
}

export function companyContentPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/content`;
}

export function companyAnalyticsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/analytics`;
}

export function companyLeadsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/leads`;
}

export function companyIntelligencePath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/intelligence`;
}

export function companyInsightsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/insights`;
}

export function companyAiInsightsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/ai-insights`;
}

export function companyBusinessHealthPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/business-health`;
}

export function companyTasksPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/tasks`;
}

export function companyAutomationsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/automations`;
}

export function companyNotificationsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/notifications`;
}

export function companyProjectPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/project`;
}

export function companyWebsiteDomainsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/websites/domains`;
}

export function companyWebsiteConnectionPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/websites/connection`;
}

export function companyWebsiteApiKeysPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/websites/api-keys`;
}

export function companyWebsiteTrackingPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/websites/tracking`;
}

export function companyWebsiteHostingPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/websites/hosting`;
}

export function companyWebsiteBuilderPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/websites/builder`;
}

export function companyWebsiteBuilderSectionPath(
  slug: string,
  section:
    | "pages"
    | "page-builder"
    | "templates"
    | "components"
    | "theme"
    | "media"
    | "navigation"
    | "service-pages"
    | "contact"
    | "booking"
    | "seo"
    | "blog"
    | "analytics"
    | "publish"
    | "domains"
    | "enquiries"
    | "preview"
    | "settings"
): string {
  return `/${encodeURIComponent(slug)}/dashboard/websites/builder/${section}`;
}

export function publicSitePath(companySlug: string): string {
  return `/site/${encodeURIComponent(companySlug)}`;
}

export function publicSiteServicePath(
  companySlug: string,
  serviceSlug: string
): string {
  return `/site/${encodeURIComponent(companySlug)}/services/${encodeURIComponent(serviceSlug)}`;
}

export function publicSiteBlogPath(companySlug: string): string {
  return `/site/${encodeURIComponent(companySlug)}/blog`;
}

export function publicSiteBlogPostPath(companySlug: string, postSlug: string): string {
  return `/site/${encodeURIComponent(companySlug)}/blog/${encodeURIComponent(postSlug)}`;
}
