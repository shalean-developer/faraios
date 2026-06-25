import { FaraiAdminRevenue } from "@/components/admin/farai-admin-revenue";
import { getPlatformRevenueData } from "@/lib/services/admin";

export const metadata = {
  title: "Revenue — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminRevenuePage() {
  const data = await getPlatformRevenueData();
  return <FaraiAdminRevenue data={data} />;
}
