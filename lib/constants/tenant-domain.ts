/** Default tenant subdomain suffix for FaraiOS-hosted preview URLs. */
export const FARAIOS_TENANT_DOMAIN_SUFFIX =
  process.env.NEXT_PUBLIC_FARAIOS_TENANT_DOMAIN_SUFFIX ?? "faraios.com";

export function previewSubdomainForSlug(slug: string): string {
  return `${slug}.${FARAIOS_TENANT_DOMAIN_SUFFIX}`;
}

export function previewUrlForSlug(slug: string): string {
  return `https://${previewSubdomainForSlug(slug)}`;
}
