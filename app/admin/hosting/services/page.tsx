import { FaraiAdminHostingServices } from "@/components/admin/farai-admin-hosting-management";
import { getAdminHostingServices } from "@/lib/services/hosting-admin";

export const metadata = { title: "Hosting Services — FaraiOS Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHostingServicesPage() {
  const services = await getAdminHostingServices();
  return <FaraiAdminHostingServices services={services} />;
}
