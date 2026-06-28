import type { HostingProviderSlug } from "./providers/types";

export const FARAIOS_CNAME_TARGET =
  process.env.FARAIOS_VERCEL_CNAME_TARGET ?? "cname.vercel-dns.com";

export type FaraiosVercelConfig = {
  token: string;
  projectId: string;
  teamId?: string;
};

/** Vercel API credentials for tenant subdomain SSL (optional). */
export function getFaraiosVercelConfig(): FaraiosVercelConfig | null {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.FARAIOS_VERCEL_PROJECT_ID?.trim();
  if (!token || !projectId) return null;

  const teamId = process.env.FARAIOS_VERCEL_TEAM_ID?.trim();
  return teamId ? { token, projectId, teamId } : { token, projectId };
}

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
