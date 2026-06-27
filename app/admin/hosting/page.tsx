import { FaraiAdminHostingOverview } from "@/components/admin/farai-admin-hosting-overview";
import { getAdminHostingOverview } from "@/lib/services/hosting-admin";

export const metadata = {
  title: "Hosting — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminHostingPage() {
  const data = await getAdminHostingOverview();
  return <FaraiAdminHostingOverview data={data} />;
}
