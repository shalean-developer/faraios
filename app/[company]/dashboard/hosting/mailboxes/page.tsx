import { CompanyHostingResourceClient } from "@/components/hosting/company-hosting-resource-client";
import { loadScopedCompanyHostingPage } from "@/lib/services/hosting-company-scope";
import { listCompanyMailboxes } from "@/lib/services/hosting-resources";

export const metadata = { title: "Hosting Mailboxes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingMailboxesPage({
  params,
  searchParams,
}: {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { company } = await params;
  const query = await searchParams;
  const { slug, company: row, overview, hasLegacySubscription, scopedServiceId, scopedServiceDomain } =
    await loadScopedCompanyHostingPage(company, query.service);

  const mailboxes = await listCompanyMailboxes(row.id);

  return (
    <CompanyHostingResourceClient
      slug={slug}
      companyId={row.id}
      title="Mailboxes"
      description={
        scopedServiceDomain
          ? `View and request mailboxes for ${scopedServiceDomain}`
          : "View and request mailboxes for your hosting services"
      }
      resourceType="mailboxes"
      services={overview.services}
      records={mailboxes}
      createLabel="Request mailbox"
      createFieldLabel="Mailbox name (e.g. info)"
      hasLegacySubscription={hasLegacySubscription}
      scopedServiceId={scopedServiceId}
      scopedServiceDomain={scopedServiceDomain}
    />
  );
}
