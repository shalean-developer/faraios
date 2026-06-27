import { FaraiAdminHostingResources } from "@/components/admin/farai-admin-hosting-resources";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminHostingServices } from "@/lib/services/hosting-admin";

export const metadata = { title: "Hosting Mailboxes — FaraiOS Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHostingMailboxesPage() {
  const admin = createAdminClient();
  const [services, { data: records }] = await Promise.all([
    getAdminHostingServices(),
    admin.from("hosting_mailboxes").select("*").order("email_address"),
  ]);

  return (
    <FaraiAdminHostingResources
      title="Mailbox management"
      description="Create and manage mailboxes (500 max on reseller account)"
      resourceType="mailboxes"
      services={services.filter((s) => s.status === "active").map((s) => ({ id: s.id, domain_name: s.domain_name, status: s.status }))}
      records={records ?? []}
    />
  );
}
