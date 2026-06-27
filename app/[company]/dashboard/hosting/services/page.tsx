import { CompanyHostingServicesClient } from "@/components/hosting/company-hosting-services-client";
import { loadCompanyHostingPage } from "@/lib/services/hosting-company-pages";

export const metadata = { title: "Hosting Services", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingServicesPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
  const { slug, company: row, overview, hasLegacySubscription } =
    await loadCompanyHostingPage(company);

  return (
    <CompanyHostingServicesClient
      slug={slug}
      companyId={row.id}
      services={overview.services}
      hasLegacySubscription={hasLegacySubscription}
    />
  );
}
