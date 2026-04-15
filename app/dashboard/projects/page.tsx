import { DashboardHeader } from "@/components/DashboardHeader";
import { Navbar } from "@/components/Navbar";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { companyToProjectCard } from "@/lib/mappers/company-to-project-card";
import { listMemberCompaniesWithIndustry } from "@/lib/services/companies";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "My Projects — FaraiOS",
  description: "Track the progress of your custom-built websites",
};

export const dynamic = "force-dynamic";

export default async function DashboardProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = user
    ? await listMemberCompaniesWithIndustry(user.id)
    : [];
  const projects = rows.map(companyToProjectCard);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navbar activeNav="projects" />
      <main className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <DashboardHeader />
        {projects.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-card px-6 py-16 text-center text-muted-foreground">
            {user
              ? "No companies yet. Submit the onboarding form from the home page or "
              : "Sign in to see your workspaces, or start from the home page — "}
            <a href="/get-started" className="text-[#7C3AED] underline">
              Get Started
            </a>
            .
          </p>
        ) : (
          <ProjectsGrid projects={projects} />
        )}
      </main>
    </div>
  );
}
