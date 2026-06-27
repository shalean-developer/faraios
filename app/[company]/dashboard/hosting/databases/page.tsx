import { CompanyHostingResourceClient } from "@/components/hosting/company-hosting-resource-client";
import { loadCompanyHostingPage } from "@/lib/services/hosting-company-pages";
import { listCompanyDatabases } from "@/lib/services/hosting-resources";

export const metadata = { title: "Hosting Databases", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingDatabasesPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
  const { slug, company: row, overview, hasLegacySubscription } =
    await loadCompanyHostingPage(company);

  const databases = await listCompanyDatabases(row.id);

  return (
    <CompanyHostingResourceClient
      slug={slug}
      companyId={row.id}
      title="Databases"
      description="View and request MySQL databases for your hosting services"
      resourceType="databases"
      services={overview.services}
      records={databases}
      createLabel="Request database"
      createFieldLabel="Database name"
      hasLegacySubscription={hasLegacySubscription}
    />
  );
}
