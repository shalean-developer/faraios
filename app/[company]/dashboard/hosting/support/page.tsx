import { CompanyHostingSupportClient } from "@/components/hosting/company-hosting-support-client";
import { loadCompanyHostingPage } from "@/lib/services/hosting-company-pages";

export const metadata = { title: "Hosting Support", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingSupportPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
  const { slug, company: row, overview, hasLegacySubscription } =
    await loadCompanyHostingPage(company);

  return (
    <CompanyHostingSupportClient
      slug={slug}
      companyId={row.id}
      services={overview.services}
      tickets={overview.tickets}
      hasLegacySubscription={hasLegacySubscription}
    />
  );
}
