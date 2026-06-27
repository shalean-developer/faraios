import { FaraiAdminHostingResources } from "@/components/admin/farai-admin-hosting-resources";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminHostingServices } from "@/lib/services/hosting-admin";

export const metadata = { title: "Hosting FTP — FaraiOS Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHostingFtpPage() {
  const admin = createAdminClient();
  const [services, { data: records }] = await Promise.all([
    getAdminHostingServices(),
    admin.from("hosting_ftp_accounts").select("*").order("username"),
  ]);

  return (
    <FaraiAdminHostingResources
      title="FTP account management"
      description="Manage additional FTP accounts (100 max on reseller account)"
      resourceType="ftp"
      services={services.filter((s) => s.status === "active").map((s) => ({ id: s.id, domain_name: s.domain_name, status: s.status }))}
      records={records ?? []}
    />
  );
}
