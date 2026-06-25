import { FaraiAdminSupport } from "@/components/admin/farai-admin-support";
import { getAdminSupportData } from "@/lib/services/admin";

export const metadata = {
  title: "Support — Shalean Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const data = await getAdminSupportData();
  return <FaraiAdminSupport data={data} />;
}
