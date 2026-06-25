import { FaraiAdminFeatureRequests } from "@/components/admin/farai-admin-feature-requests";
import { getAdminFeatureRequestsData } from "@/lib/services/admin";

export const metadata = {
  title: "Feature Requests — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminFeatureRequestsPage() {
  const data = await getAdminFeatureRequestsData();
  return <FaraiAdminFeatureRequests data={data} />;
}
