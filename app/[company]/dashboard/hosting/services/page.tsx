import { CompanyHostingServicesClient } from "@/components/hosting/company-hosting-services-client";
import { loadCompanyHostingPageWithPaymentConfirmation } from "@/lib/services/hosting-company-pages";

export const metadata = { title: "Hosting Services", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ payment?: string; reference?: string; trxref?: string }>;
}) {
  const { company } = await params;
  const query = await searchParams;
  const { slug, company: row, overview, hasLegacySubscription, paymentConfirmation } =
    await loadCompanyHostingPageWithPaymentConfirmation(company, query);

  return (
    <CompanyHostingServicesClient
      slug={slug}
      companyId={row.id}
      services={overview.services}
      hasLegacySubscription={hasLegacySubscription}
      paymentConfirmation={paymentConfirmation}
    />
  );
}
