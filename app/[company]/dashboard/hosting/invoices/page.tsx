import { CompanyHostingInvoicesClient } from "@/components/hosting/company-hosting-services-client";
import { loadCompanyHostingPageWithPaymentConfirmation } from "@/lib/services/hosting-company-pages";

export const metadata = { title: "Hosting Invoices", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingInvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ payment?: string; reference?: string; trxref?: string }>;
}) {
  const { company } = await params;
  const query = await searchParams;
  const { slug, company, overview, hasLegacySubscription, paymentConfirmation } =
    await loadCompanyHostingPageWithPaymentConfirmation(company, query);

  return (
    <CompanyHostingInvoicesClient
      slug={slug}
      companyId={company.id}
      invoices={overview.invoices}
      hasLegacySubscription={hasLegacySubscription}
      paymentConfirmation={paymentConfirmation}
    />
  );
}
