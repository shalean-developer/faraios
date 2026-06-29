import { CompanyHostingDnsClient } from "@/components/hosting/company-hosting-dns-client";
import { loadScopedCompanyHostingPage } from "@/lib/services/hosting-company-scope";
import {
  listCompanyDnsRecords,
  syncServiceDnsRecords,
} from "@/lib/services/hosting-resources";

export const metadata = { title: "Hosting DNS", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingDnsPage({
  params,
  searchParams,
}: {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { company } = await params;
  const query = await searchParams;
  const { slug, company: row, overview, hasLegacySubscription, scopedServiceId, scopedServiceDomain } =
    await loadScopedCompanyHostingPage(company, query.service);

  if (scopedServiceId) {
    await syncServiceDnsRecords(scopedServiceId);
  }

  const records = await listCompanyDnsRecords(row.id);

  return (
    <CompanyHostingDnsClient
      slug={slug}
      companyId={row.id}
      services={overview.services}
      records={records}
      hasLegacySubscription={hasLegacySubscription}
      scopedServiceId={scopedServiceId}
      scopedServiceDomain={scopedServiceDomain}
    />
  );
}
