import { FaraiAdminWebsites } from "@/components/admin/farai-admin-websites";
import { getAdminQueryClient } from "@/lib/services/admin";
import type { Website } from "@/types/database";

export const metadata = {
  title: "Websites — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type WebsiteWithCompany = Website & { companies?: { name?: string | null } | null };

export default async function AdminWebsitesPage() {
  const adminClient = await getAdminQueryClient();
  const { data } = await adminClient
    .from("websites")
    .select("*, companies(name)")
    .order("created_at", { ascending: false });

  const websites = (data as WebsiteWithCompany[] | null) ?? [];

  return <FaraiAdminWebsites websites={websites} />;
}
