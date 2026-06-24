import { notFound } from "next/navigation";

import { CompanyWorkspaceShell } from "@/components/company/company-workspace-shell";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listCompaniesForUser } from "@/lib/services/memberships";
import { getUserPermissionKeys } from "@/lib/services/permissions";
import { companyHasWebsiteProject } from "@/lib/services/projects";
import { createClient } from "@/lib/supabase/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ company: string }>;
};

export default async function CompanyDashboardLayout({ children, params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  const hasWebsiteProject = await companyHasWebsiteProject(row.id);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const companies = user ? await listCompaniesForUser(user.id) : [];

  const userDisplayName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    (user?.email ? user.email.split("@")[0]! : "Account");

  const userPermissions = user ? await getUserPermissionKeys(row.id, user.id) : [];

  return (
    <CompanyWorkspaceShell
      slug={slug}
      companyName={row.name}
      hasWebsiteProject={hasWebsiteProject}
      companies={companies}
      userDisplayName={userDisplayName}
      userEmail={user?.email ?? null}
      userPermissions={userPermissions}
    >
      {children}
    </CompanyWorkspaceShell>
  );
}
