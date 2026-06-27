import { FaraiAdminHostingServers } from "@/components/admin/farai-admin-hosting-servers";
import { getAdminHostingServers } from "@/lib/services/hosting-admin";

export const metadata = { title: "Hosting Servers — FaraiOS Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHostingServersPage() {
  const servers = await getAdminHostingServers();
  return <FaraiAdminHostingServers servers={servers} />;
}
