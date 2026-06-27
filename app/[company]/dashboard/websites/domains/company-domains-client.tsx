"use client";

import {
  WebsiteDomainsPanel,
  type WebsiteDomainDnsHelp,
} from "@/components/websites/website-domains-panel";
import type { WebsiteDnsRecord, WebsiteDomain } from "@/types/website-engine";

export function WebsiteDomainsClient({
  companyId,
  slug,
  domains,
  dnsByDomain,
  dnsHelp,
}: {
  companyId: string;
  slug: string;
  domains: WebsiteDomain[];
  dnsByDomain: Record<string, WebsiteDnsRecord[]>;
  dnsHelp?: WebsiteDomainDnsHelp | null;
}) {
  return (
    <WebsiteDomainsPanel
      companyId={companyId}
      slug={slug}
      domains={domains}
      dnsByDomain={dnsByDomain}
      dnsHelp={dnsHelp}
      variant="page"
    />
  );
}
