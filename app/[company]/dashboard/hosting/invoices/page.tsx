import { CompanyHostingInvoicesClient } from "@/components/hosting/company-hosting-services-client";
import { loadCompanyHostingPage } from "@/lib/services/hosting-company-pages";

export const metadata = { title: "Hosting Invoices", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingInvoicesPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
  const { slug, overview, hasLegacySubscription } = await loadCompanyHostingPage(company);

  return (
    <CompanyHostingInvoicesClient
      slug={slug}
      invoices={overview.invoices}
      hasLegacySubscription={hasLegacySubscription}
    />
  );
}
