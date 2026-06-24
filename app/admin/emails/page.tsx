import { FaraiAdminEmails } from "@/components/admin/farai-admin-emails";
import { getAdminEmailsData } from "@/lib/services/admin";

export const metadata = {
  title: "Emails — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminEmailsPage() {
  const data = await getAdminEmailsData();
  return <FaraiAdminEmails data={data} />;
}
