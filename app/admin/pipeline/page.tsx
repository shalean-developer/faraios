import { FaraiAdminDashboard } from "@/components/admin/farai-admin-dashboard";
import { computeProjectStats, getAllProjects } from "@/lib/services/admin";

export const metadata = {
  title: "Build Pipeline — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPipelinePage() {
  const projects = await getAllProjects();
  const stats = computeProjectStats(projects);

  return (
    <FaraiAdminDashboard projects={projects} stats={stats} viewMode="pipeline" />
  );
}
