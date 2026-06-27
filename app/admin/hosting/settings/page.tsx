import { FaraiAdminHostingSettings } from "@/components/admin/farai-admin-hosting-settings";
import { getAdminHostingSettingsPageData } from "@/lib/services/hosting-admin";

export const metadata = { title: "Hosting Settings — FaraiOS Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHostingSettingsPage() {
  const data = await getAdminHostingSettingsPageData();
  return <FaraiAdminHostingSettings settings={data.settings} servers={data.servers} />;
}
