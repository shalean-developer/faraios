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

export function companyHostingPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/hosting`;
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

export function companySettingsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/settings`;
}

export function companyTeamPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/team`;
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
  return companyQuoteRequestsPath(slug);
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

export function companyReportsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/reports`;
}

export function companyInsightsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/insights`;
}

export function companyAiInsightsPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/ai-insights`;
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

export function companyWebsiteApiKeysPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/websites/api-keys`;
}

export function companyWebsiteTrackingPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/websites/tracking`;
}

export function companyWebsiteHostingPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/dashboard/websites/hosting`;
}
