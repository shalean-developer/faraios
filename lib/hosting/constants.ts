import type { HostingProviderSlug } from "./providers/types";

export const FARAIOS_CNAME_TARGET =
  process.env.FARAIOS_VERCEL_CNAME_TARGET ?? "cname.vercel-dns.com";

const VALID_HOSTING_PROVIDERS = new Set<HostingProviderSlug>([
  "plesk",
  "vercel",
  "cloudflare_pages",
  "netlify",
  "aws",
]);

/** Default website domain provider for FaraiOS (Plesk-first). */
export function getDefaultHostingProviderSlug(): HostingProviderSlug {
  const configured = process.env.FARAIOS_HOSTING_PROVIDER?.trim().toLowerCase();
  if (configured && VALID_HOSTING_PROVIDERS.has(configured as HostingProviderSlug)) {
    return configured as HostingProviderSlug;
  }
  return "plesk";
}
