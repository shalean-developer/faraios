"use client";

import { WebsiteDomainsPanelWithSearch } from "@/components/websites/website-domains-panel-with-search";
import type { WebsiteDomainDnsHelp } from "@/components/websites/website-domains-panel";
import type { HostingPlanRow } from "@/types/hosting-automation";
import type { DomainPurchaseNotice } from "@/lib/services/domain-purchase-notice";
import type { WebsiteDnsRecord, WebsiteDomain } from "@/types/website-engine";

export function WebsiteDomainsClient({
  companyId,
  slug,
  domains,
  dnsByDomain,
  dnsHelp,
  hostingPlans = [],
  billingEmail,
  domainPurchaseNotice,
}: {
  companyId: string;
  slug: string;
  domains: WebsiteDomain[];
  dnsByDomain: Record<string, WebsiteDnsRecord[]>;
  dnsHelp?: WebsiteDomainDnsHelp | null;
  hostingPlans?: HostingPlanRow[];
  billingEmail?: string | null;
  domainPurchaseNotice?: DomainPurchaseNotice | null;
}) {
  return (
    <WebsiteDomainsPanelWithSearch
      companyId={companyId}
      slug={slug}
      domains={domains}
      dnsByDomain={dnsByDomain}
      dnsHelp={dnsHelp}
      variant="page"
      hostingPlans={hostingPlans}
      billingEmail={billingEmail}
      domainPurchaseNotice={domainPurchaseNotice}
    />
  );
}
