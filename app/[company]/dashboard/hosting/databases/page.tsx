import { CompanyHostingResourceClient } from "@/components/hosting/company-hosting-resource-client";
import { loadScopedCompanyHostingPage } from "@/lib/services/hosting-company-scope";
import { listCompanyDatabases } from "@/lib/services/hosting-resources";

export const metadata = { title: "Hosting Databases", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingDatabasesPage({
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

  const databases = await listCompanyDatabases(row.id);

  return (
    <CompanyHostingResourceClient
      slug={slug}
      companyId={row.id}
      title="Databases"
      description={
        scopedServiceDomain
          ? `View and request MySQL databases for ${scopedServiceDomain}`
          : "View and request MySQL databases for your hosting services"
      }
      resourceType="databases"
      services={overview.services}
      records={databases}
      createLabel="Request database"
      createFieldLabel="Database name"
      hasLegacySubscription={hasLegacySubscription}
      scopedServiceId={scopedServiceId}
      scopedServiceDomain={scopedServiceDomain}
    />
  );
}
