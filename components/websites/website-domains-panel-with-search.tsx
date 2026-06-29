"use client";

import { Suspense } from "react";

import {
  WebsiteDomainsPanel,
  type WebsiteDomainDnsHelp,
} from "@/components/websites/website-domains-panel";
import type { HostingPlanRow } from "@/types/hosting-automation";
import type { WebsiteDnsRecord, WebsiteDomain } from "@/types/website-engine";

type Props = {
  companyId: string;
  slug: string;
  domains: WebsiteDomain[];
  dnsByDomain: Record<string, WebsiteDnsRecord[]>;
  websiteId?: string | null;
  variant?: "page" | "embedded";
  dnsHelp?: WebsiteDomainDnsHelp | null;
  hostingPlans?: HostingPlanRow[];
  billingEmail?: string | null;
};

export function WebsiteDomainsPanelWithSearch(props: Props) {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-slate-500">Loading domain settings…</p>
      }
    >
      <WebsiteDomainsPanel {...props} />
    </Suspense>
  );
}
