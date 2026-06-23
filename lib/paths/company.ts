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
