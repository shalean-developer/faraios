import { FaraiActivityFeed } from "@/components/admin/farai-activity-feed";
import { getAdminActivityItems } from "@/lib/services/admin";

export const metadata = {
  title: "Activity — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  const items = await getAdminActivityItems();
  return <FaraiActivityFeed items={items} />;
}
