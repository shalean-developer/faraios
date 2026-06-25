import { FaraiAdminDomains } from "@/components/admin/farai-admin-domains";
import { getAdminDomainsData } from "@/lib/services/admin";

export const metadata = {
  title: "Domains — Shalean Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminDomainsPage() {
  const data = await getAdminDomainsData();
  return <FaraiAdminDomains data={data} />;
}
