import { FaraiAdminApiUsage } from "@/components/admin/farai-admin-api-usage";
import { getAdminApiUsageData } from "@/lib/services/admin";

export const metadata = {
  title: "API Usage — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminApiUsagePage() {
  const data = await getAdminApiUsageData();
  return <FaraiAdminApiUsage data={data} />;
}
