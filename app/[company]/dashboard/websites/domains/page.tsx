import Link from "next/link";

import { WebsiteDomainsClient } from "./company-domains-client";
import { companyWebsitesPath } from "@/lib/paths/company";
import { getCompanyBySlug } from "@/lib/services/companies";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import {
  getDnsRecordsForDomain,
  getWebsiteDomainsForCompany,
} from "@/lib/services/website-domains";
import { createClient } from "@/lib/supabase/server";
import type { WebsiteDnsRecord } from "@/types/website-engine";

export const metadata = {
  title: "Domains — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

export default async function CompanyWebsiteDomainsPage({ params }: Props) {
  const { company } = await params;
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

  const domains = await getWebsiteDomainsForCompany(row.id);
  const dnsByDomain: Record<string, WebsiteDnsRecord[]> = {};

  await Promise.all(
    domains.map(async (d) => {
      dnsByDomain[d.id] = await getDnsRecordsForDomain(d.id);
    })
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href={companyWebsitesPath(slug)}
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Website overview
      </Link>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-violet-600">Website</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Domains</h1>
      <p className="mt-2 text-sm text-slate-500">
        Add custom domains, view DNS instructions, and verify ownership.
      </p>

      <div className="mt-6">
        <WebsiteDomainsClient
          companyId={row.id}
          slug={slug}
          domains={domains}
          dnsByDomain={dnsByDomain}
        />
      </div>
    </main>
  );
}
