import { FaraiAdminAnalytics } from "@/components/admin/farai-admin-analytics";
import { getAdminAnalyticsData } from "@/lib/services/admin";

export const metadata = {
  title: "Analytics — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const analytics = await getAdminAnalyticsData();
  return <FaraiAdminAnalytics analytics={analytics} />;
}
