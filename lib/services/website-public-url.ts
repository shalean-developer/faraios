import { FARAIOS_TENANT_DOMAIN_SUFFIX } from "@/lib/constants/tenant-domain";
import { normalizeDomain } from "@/lib/utils/normalize-domain";

export type WebsiteLiveUrlSource = "custom" | "preview" | "subdomain";

export type WebsiteLiveUrl = {
  href: string;
  hostLabel: string;
  source: WebsiteLiveUrlSource;
};

/** FaraiOS tenant subdomain, e.g. `acme.faraios.com`. Requires wildcard DNS on the platform. */
export function tenantSubdomainHost(subdomain: string | null | undefined): string | null {
  const slug = subdomain?.trim();
  if (!slug) return null;
  return `${slug}.${FARAIOS_TENANT_DOMAIN_SUFFIX}`;
}

/**
 * Resolves where "Live site" should open.
 * Custom domains use HTTPS on the client's host. Without one, use the in-app preview route
 * (works on localhost and the main app domain without extra DNS).
 */
export function resolveWebsiteLiveUrl(input: {
  websiteId: string;
  domain?: string | null;
  subdomain?: string | null;
}): WebsiteLiveUrl {
  const customDomain = normalizeDomain(input.domain ?? "");
  if (customDomain) {
    return {
      href: `https://${customDomain}`,
      hostLabel: customDomain,
      source: "custom",
    };
  }

  const tenantHost = tenantSubdomainHost(input.subdomain);
  return {
    href: `/preview/${input.websiteId}`,
    hostLabel: tenantHost ?? "Preview",
    source: "preview",
  };
}

/** Absolute preview URL when an app origin is known (emails, API responses). */
export function resolveWebsitePreviewAbsoluteUrl(
  websiteId: string,
  appOrigin?: string | null
): string {
  const path = `/preview/${websiteId}`;
  const origin = appOrigin?.replace(/\/$/, "") ?? "";
  return origin ? `${origin}${path}` : path;
}
