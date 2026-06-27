import { FaraiAdminHostingResources } from "@/components/admin/farai-admin-hosting-resources";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminHostingServices } from "@/lib/services/hosting-admin";

export const metadata = { title: "Hosting Databases — FaraiOS Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHostingDatabasesPage() {
  const admin = createAdminClient();
  const [services, { data: records }] = await Promise.all([
    getAdminHostingServices(),
    admin.from("hosting_databases").select("*").order("db_name"),
  ]);

  return (
    <FaraiAdminHostingResources
      title="Database management"
      description="Create and manage MySQL databases (unlimited on reseller account)"
      resourceType="databases"
      services={services.filter((s) => s.status === "active").map((s) => ({ id: s.id, domain_name: s.domain_name, status: s.status }))}
      records={records ?? []}
    />
  );
}
