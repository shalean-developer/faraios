import { CompanyHostingResourceClient } from "@/components/hosting/company-hosting-resource-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCompanyHostingPage } from "@/lib/services/hosting-company-pages";

export const metadata = { title: "Hosting Domains", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyHostingDomainsPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
  const { slug, company: row, overview, hasLegacySubscription } =
    await loadCompanyHostingPage(company);

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
      description="Domains linked to your hosting services"
      resourceType="domains"
      services={overview.services}
      records={domains ?? []}
      hasLegacySubscription={hasLegacySubscription}
    />
  );
}
