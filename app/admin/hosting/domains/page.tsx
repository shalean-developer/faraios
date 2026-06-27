import { FaraiAdminHostingResources } from "@/components/admin/farai-admin-hosting-resources";
import { getAdminHostingDomains, getAdminHostingServices } from "@/lib/services/hosting-admin";

export const metadata = { title: "Hosting Domains — FaraiOS Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHostingDomainsPage() {
  const [domains, services] = await Promise.all([
    getAdminHostingDomains(),
    getAdminHostingServices(),
  ]);

  return (
    <FaraiAdminHostingResources
      title="Hosting domains"
      description="Domains linked to hosting services"
      resourceType="domains"
      services={services.map((s) => ({ id: s.id, domain_name: s.domain_name, status: s.status }))}
      records={domains}
    />
  );
}
