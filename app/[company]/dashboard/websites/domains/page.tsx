import Link from "next/link";



import { WebsiteDomainsClient } from "./company-domains-client";

import { companyWebsitesPath } from "@/lib/paths/company";

import { getCompanyBySlug } from "@/lib/services/companies";

import { userHasCompanySlugAccess } from "@/lib/services/memberships";

import {

  getDnsRecordsForDomain,

  getWebsiteDomainsForCompany,

} from "@/lib/services/website-domains";

import { loadWebsiteDomainDnsHelp, enrichWebsiteDomainDnsHelp } from "@/lib/hosting/website-domain-dns-help";
import { listActiveHostingPlans } from "@/lib/services/domain-hosting-readiness";
import { loadDomainDnsGuidanceMap } from "@/lib/hosting/external-dns-guidance";
import { parseDomainPurchaseNotice } from "@/lib/services/domain-purchase-notice";
import {
  domainHostingReturnPathForDomainsPage,
  handleDomainHostingPaymentReturn,
} from "@/lib/services/domain-hosting-payment-return";

import { createClient } from "@/lib/supabase/server";

import { riseCardClassName, risePageClassName } from "@/lib/ui/rise-dashboard-styles";

import type { WebsiteDnsRecord } from "@/types/website-engine";
import type { HostingPlanRow } from "@/types/hosting-automation";



export const metadata = {

  title: "Domains — FaraiOS",

  robots: { index: false, follow: false },

};



export const dynamic = "force-dynamic";



type Props = {
  params: Promise<{ company: string }>;
  searchParams: Promise<{
    payment?: string;
    domain?: string;
    reference?: string;
    trxref?: string;
    hosting_connected?: string;
    hosting_provisioning?: string;
    hosting_error?: string;
    message?: string;
  }>;
};



export default async function CompanyWebsiteDomainsPage({ params, searchParams }: Props) {

  const { company } = await params;
  const sp = await searchParams;

  const slug = decodeURIComponent(company);



  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();

  if (!user) {

    return (

      <main className="mx-auto max-w-5xl px-4 py-10">

        <p className="text-sm text-slate-500">Sign in to manage domains.</p>

      </main>

    );

  }



  const row = await getCompanyBySlug(slug);

  if (!row || !(await userHasCompanySlugAccess(user.id, slug))) {

    return (

      <main className="mx-auto max-w-5xl px-4 py-10">

        <p className="text-sm text-slate-500">Access denied.</p>

      </main>

    );

  }



  await handleDomainHostingPaymentReturn({
    searchParams: sp,
    companyId: row.id,
    companySlug: slug,
    userId: user.id,
    returnPath: domainHostingReturnPathForDomainsPage(slug),
  });

  const domainPurchaseNotice = parseDomainPurchaseNotice(sp);

  const domains = await getWebsiteDomainsForCompany(row.id);

  const dnsByDomain: Record<string, WebsiteDnsRecord[]> = {};

  const domainDnsHelp = await loadWebsiteDomainDnsHelp(row.id);
  const hostingPlans = (await listActiveHostingPlans()) as HostingPlanRow[];
  const domainDnsGuidanceById = await loadDomainDnsGuidanceMap(row.id, domains);
  const enrichedDnsHelp = enrichWebsiteDomainDnsHelp(domainDnsHelp, domainDnsGuidanceById);



  await Promise.all(

    domains.map(async (d) => {

      dnsByDomain[d.id] = await getDnsRecordsForDomain(d.id);

    })

  );



  return (

    <div className={risePageClassName}>

      <div className={riseCardClassName}>

        <div className="px-4 py-4 sm:px-5">

          <Link

            href={companyWebsitesPath(slug)}

            className="text-sm font-medium text-[#5a8dee] hover:text-[#4a6fd8]"

          >

            ← Website overview

          </Link>

          <h1 className="mt-3 text-lg font-medium text-slate-800">Domains</h1>

          <p className="mt-1 text-sm text-slate-500">

            Add custom domains, view DNS instructions, and verify ownership.

          </p>

        </div>

      </div>



      <div className="mt-4">

        <WebsiteDomainsClient

          companyId={row.id}

          slug={slug}

          domains={domains}

          dnsByDomain={dnsByDomain}

          dnsHelp={enrichedDnsHelp}

          hostingPlans={hostingPlans}

          billingEmail={row.primary_contact_email ?? null}

          domainPurchaseNotice={domainPurchaseNotice}

          domainDnsGuidanceById={domainDnsGuidanceById}

        />

      </div>

    </div>

  );

}


