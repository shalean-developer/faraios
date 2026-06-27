import { FaraiAdminHostingPlans } from "@/components/admin/farai-admin-hosting-management";
import { getAdminHostingPlans } from "@/lib/services/hosting-admin";

export const metadata = { title: "Hosting Plans — FaraiOS Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHostingPlansPage() {
  const plans = await getAdminHostingPlans();
  return <FaraiAdminHostingPlans plans={plans} />;
}
