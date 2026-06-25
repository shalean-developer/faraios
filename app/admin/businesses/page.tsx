import { FaraiClientManagement } from "@/components/admin/farai-client-management";
import { getAdminClients } from "@/lib/services/admin";

export const metadata = {
  title: "Businesses — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminBusinessesPage() {
  const { clients, stats } = await getAdminClients();

  return <FaraiClientManagement clients={clients} stats={stats} />;
}
