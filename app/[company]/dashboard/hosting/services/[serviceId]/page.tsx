import { CompanyHostingServicePanelClient } from "@/components/hosting/company-hosting-service-panel-client";
import { loadCompanyHostingService } from "@/lib/services/hosting-company-pages";

export const metadata = { title: "Hosting Control Panel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingServicePanelPage({
  params,
}: {
  params: Promise<{ company: string; serviceId: string }>;
}) {
  const { company, serviceId } = await params;
  const { slug, company: row, service, resourceSummary } = await loadCompanyHostingService(
    company,
    serviceId
  );

  return (
    <CompanyHostingServicePanelClient
      slug={slug}
      companyId={row.id}
      service={service}
      resourceSummary={resourceSummary}
    />
  );
}
