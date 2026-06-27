import { FaraiAdminHostingLogs } from "@/components/admin/farai-admin-hosting-management";
import { getAdminProvisioningLogs } from "@/lib/services/hosting-admin";

export const metadata = { title: "Provisioning Logs — FaraiOS Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHostingProvisioningLogsPage() {
  const logs = await getAdminProvisioningLogs();
  return <FaraiAdminHostingLogs logs={logs} />;
}
