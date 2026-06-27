import { CompanyHostingResourceClient } from "@/components/hosting/company-hosting-resource-client";
import { loadCompanyHostingPage } from "@/lib/services/hosting-company-pages";
import { listCompanyMailboxes } from "@/lib/services/hosting-resources";

export const metadata = { title: "Hosting Mailboxes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingMailboxesPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
  const { slug, company: row, overview, hasLegacySubscription } =
    await loadCompanyHostingPage(company);

  const mailboxes = await listCompanyMailboxes(row.id);

  return (
    <CompanyHostingResourceClient
      slug={slug}
      companyId={row.id}
      title="Mailboxes"
      description="View and request mailboxes for your hosting services"
      resourceType="mailboxes"
      services={overview.services}
      records={mailboxes}
      createLabel="Request mailbox"
      createFieldLabel="Mailbox name (e.g. info)"
      hasLegacySubscription={hasLegacySubscription}
    />
  );
}
