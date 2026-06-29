import { CompanyHostingResourceClient } from "@/components/hosting/company-hosting-resource-client";
import { loadScopedCompanyHostingPage } from "@/lib/services/hosting-company-scope";
import { listCompanyFtpAccounts } from "@/lib/services/hosting-resources";

export const metadata = { title: "Hosting FTP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingFtpPage({
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

  const accounts = await listCompanyFtpAccounts(row.id);

  return (
    <CompanyHostingResourceClient
      slug={slug}
      companyId={row.id}
      title="FTP accounts"
      description={
        scopedServiceDomain
          ? `View and request FTP accounts for ${scopedServiceDomain}`
          : "View and request FTP accounts for your hosting services"
      }
      resourceType="ftp"
      services={overview.services}
      records={accounts}
      createLabel="Request FTP account"
      createFieldLabel="FTP username"
      hasLegacySubscription={hasLegacySubscription}
      scopedServiceId={scopedServiceId}
      scopedServiceDomain={scopedServiceDomain}
    />
  );
}
