import { FaraiAdminTeamManagement } from "@/components/admin/farai-admin-team-management";
import {
  getAdminAssignableProjects,
  getAdminTeamMembers,
} from "@/lib/services/admin";

export const metadata = {
  title: "Team — Shalean Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const [members, assignableProjects] = await Promise.all([
    getAdminTeamMembers(),
    getAdminAssignableProjects(),
  ]);

  return (
    <FaraiAdminTeamManagement members={members} assignableProjects={assignableProjects} />
  );
}
