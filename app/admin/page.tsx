import { FaraiAdminOverview } from "@/components/admin/farai-admin-overview";
import { getPlatformOverviewMetrics } from "@/lib/services/admin";
import { getPlatformOverviewDashboardLayout } from "@/lib/services/platform-dashboard-layout";

export const metadata = {
  title: "Platform Overview — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [metrics, initialLayout] = await Promise.all([
    getPlatformOverviewMetrics(),
    getPlatformOverviewDashboardLayout(),
  ]);

  return <FaraiAdminOverview metrics={metrics} initialLayout={initialLayout} />;
}
