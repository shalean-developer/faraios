/** Absolute Shalean marketplace booking URL (works from tenant custom domains). */
export function buildMarketplaceBookingUrl(companySlug: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://faraios.com";
  return `${base.replace(/\/$/, "")}/marketplace/${encodeURIComponent(companySlug)}`;
}
