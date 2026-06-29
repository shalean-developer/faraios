import { CompanyHostingResourceClient } from "@/components/hosting/company-hosting-resource-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadScopedCompanyHostingPage } from "@/lib/services/hosting-company-scope";

export const metadata = { title: "Hosting Domains", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingDomainsPage({
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

  const admin = createAdminClient();
  const { data: domains } = await admin
    .from("hosting_domains")
    .select("*")
    .eq("company_id", row.id)
    .order("domain_name");

  return (
    <CompanyHostingResourceClient
      slug={slug}
      companyId={row.id}
      title="Domains"
      description={
        scopedServiceDomain
          ? `Domains linked to ${scopedServiceDomain}`
          : "Domains linked to your hosting services"
      }
      resourceType="domains"
      services={overview.services}
      records={domains ?? []}
      hasLegacySubscription={hasLegacySubscription}
      scopedServiceId={scopedServiceId}
      scopedServiceDomain={scopedServiceDomain}
    />
  );
}
