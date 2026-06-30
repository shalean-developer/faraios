import { complementaryHostingDomain } from "@/lib/hosting/plesk/pleskSiteAliases";
import { getFaraiosVercelConfig } from "@/lib/hosting/constants";
import { vercelHostingProvider } from "@/lib/hosting/providers/vercel";
import { normalizeDomain } from "@/lib/utils/normalize-domain";

export type EnsureVercelCustomDomainResult =
  | { ok: true; domains: string[] }
  | { ok: true; skipped: true; reason: "vercel_not_configured" | "invalid_domain" }
  | { ok: false; error: string };

function isDuplicateDomainError(message: string): boolean {
  return /already|exist|configured|duplicate/i.test(message);
}

/**
 * Register a customer apex/www domain on the FaraiOS Vercel project so proxied
 * Plesk traffic (Host: customer domain → faraios.com) is accepted by Vercel.
 */
export async function ensureCustomDomainOnVercel(
  domain: string
): Promise<EnsureVercelCustomDomainResult> {
  const normalized = normalizeDomain(domain);
  if (!normalized || !normalized.includes(".")) {
    return { ok: true, skipped: true, reason: "invalid_domain" };
  }

  const config = getFaraiosVercelConfig();
  if (!config) {
    return { ok: true, skipped: true, reason: "vercel_not_configured" };
  }

  const candidates = new Set<string>([normalized]);
  const complement = complementaryHostingDomain(normalized);
  if (complement) candidates.add(complement);

  const registered: string[] = [];
  const errors: string[] = [];

  for (const candidate of candidates) {
    const result = await vercelHostingProvider.connectDomain({
      providerProjectId: config.projectId,
      domain: candidate,
    });

    if (result.ok) {
      registered.push(candidate);
      continue;
    }

    if (isDuplicateDomainError(result.error)) {
      registered.push(candidate);
      continue;
    }

    errors.push(`${candidate}: ${result.error}`);
  }

  if (registered.length > 0) {
    return { ok: true, domains: registered };
  }

  return {
    ok: false,
    error: errors.join("; ") || "Could not register domain on Vercel.",
  };
}
