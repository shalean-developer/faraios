import { FaraiAdminHostingResources } from "@/components/admin/farai-admin-hosting-resources";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminHostingServices } from "@/lib/services/hosting-admin";

export const metadata = { title: "Hosting DNS — FaraiOS Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHostingDnsPage() {
  const admin = createAdminClient();
  const [services, { data: records }] = await Promise.all([
    getAdminHostingServices(),
    admin.from("hosting_dns_records").select("*").order("domain_name"),
  ]);

  return (
    <FaraiAdminHostingResources
      title="DNS management"
      description="Manage DNS records via Plesk XML API"
      resourceType="dns"
      services={services.map((s) => ({ id: s.id, domain_name: s.domain_name, status: s.status }))}
      records={records ?? []}
    />
  );
}
