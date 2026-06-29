import { CompanyHostingInvoicesClient } from "@/components/hosting/company-hosting-services-client";
import { loadCompanyHostingPageWithPaymentConfirmation } from "@/lib/services/hosting-company-pages";
import { resolveScopedHostingService } from "@/lib/services/hosting-company-scope";

export const metadata = { title: "Hosting Invoices", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingInvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ payment?: string; reference?: string; trxref?: string; service?: string }>;
}) {
  const { company } = await params;
  const query = await searchParams;
  const { slug, company: row, overview, hasLegacySubscription, paymentConfirmation } =
    await loadCompanyHostingPageWithPaymentConfirmation(company, query);
  const scope = resolveScopedHostingService(overview.services, query.service);

  return (
    <CompanyHostingInvoicesClient
      slug={slug}
      companyId={row.id}
      invoices={overview.invoices}
      hasLegacySubscription={hasLegacySubscription}
      paymentConfirmation={paymentConfirmation}
      scopedServiceId={scope.scopedServiceId}
      scopedServiceDomain={scope.scopedServiceDomain}
    />
  );
}
