import { CompanyHostingResourceClient } from "@/components/hosting/company-hosting-resource-client";
import { loadCompanyHostingPage } from "@/lib/services/hosting-company-pages";
import { listCompanyFtpAccounts } from "@/lib/services/hosting-resources";

export const metadata = { title: "Hosting FTP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingFtpPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
  const { slug, company: row, overview, hasLegacySubscription } =
    await loadCompanyHostingPage(company);

  const accounts = await listCompanyFtpAccounts(row.id);

  return (
    <CompanyHostingResourceClient
      slug={slug}
      companyId={row.id}
      title="FTP accounts"
      description="View and request FTP accounts for your hosting services"
      resourceType="ftp"
      services={overview.services}
      records={accounts}
      createLabel="Request FTP account"
      createFieldLabel="FTP username"
      hasLegacySubscription={hasLegacySubscription}
    />
  );
}
