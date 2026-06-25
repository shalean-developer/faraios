import { FaraiAdminCron } from "@/components/admin/farai-admin-cron";
import { getAdminCronData } from "@/lib/services/admin";

export const metadata = {
  title: "Cron Jobs — Shalean Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCronPage() {
  const data = await getAdminCronData();
  return <FaraiAdminCron data={data} />;
}
