import type { WebsiteDomain } from "@/types/website-engine";

export function formatCustomDomainStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function primaryWebsiteDomain(domains: WebsiteDomain[]): WebsiteDomain | null {
  return domains.find((domain) => domain.is_primary) ?? domains[0] ?? null;
}
