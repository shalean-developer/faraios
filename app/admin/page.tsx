import { FaraiAdminOverview } from "@/components/admin/farai-admin-overview";
import { getPlatformOverviewMetrics } from "@/lib/services/admin";

export const metadata = {
  title: "Platform Overview — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const metrics = await getPlatformOverviewMetrics();

  return <FaraiAdminOverview metrics={metrics} />;
}
