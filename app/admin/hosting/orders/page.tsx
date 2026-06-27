import { FaraiAdminHostingOrders } from "@/components/admin/farai-admin-hosting-management";
import { getAdminHostingOrders } from "@/lib/services/hosting-admin";

export const metadata = { title: "Hosting Orders — FaraiOS Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHostingOrdersPage() {
  const orders = await getAdminHostingOrders();
  return <FaraiAdminHostingOrders orders={orders} />;
}
