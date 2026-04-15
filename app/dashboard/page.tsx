import { FaraiDashboard } from "@/components/dashboard/farai-dashboard";
import { getDashboardSnapshot } from "@/lib/services/dashboard";

export const metadata = {
  title: "Dashboard — FaraiOS",
  description: "Your FaraiOS client workspace overview",
};

export const dynamic = "force-dynamic";

export default async function DashboardIndexPage() {
  const snapshot = await getDashboardSnapshot();

  return <FaraiDashboard snapshot={snapshot} />;
}
