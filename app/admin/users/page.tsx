import { FaraiAdminUsers } from "@/components/admin/farai-admin-users";
import { getAdminPlatformUsers } from "@/lib/services/admin";

export const metadata = {
  title: "Users — Shalean Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { users, stats } = await getAdminPlatformUsers();
  return <FaraiAdminUsers users={users} stats={stats} />;
}
