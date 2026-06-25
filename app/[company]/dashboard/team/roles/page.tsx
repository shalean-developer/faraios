import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { listPermissionsForCompany } from "@/lib/services/permissions";
import { listCompanyRoles } from "@/lib/services/company-roles";
import { getMemberRoleForUser } from "@/lib/services/team";
import { createClient } from "@/lib/supabase/server";

import { CompanyTeamRolesClient } from "./company-team-roles-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Roles & permissions — Shalean",
  robots: { index: false, follow: false },
};

export default async function CompanyTeamRolesPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const row = await getCompanyBySlug(slug);
  if (!row || !(await userHasCompanySlugAccess(user.id, slug))) notFound();

  const [rolePermissions, memberRole, customRoles] = await Promise.all([
    listPermissionsForCompany(row.id),
    getMemberRoleForUser(row.id, user.id),
    listCompanyRoles(row.id),
  ]);

  const mergedPermissions = [
    ...rolePermissions,
    ...customRoles.map((role) => ({ role: role.roleKey, permissions: role.permissions })),
  ];

  return (
    <CompanyTeamRolesClient
      slug={slug}
      company={row}
      rolePermissions={mergedPermissions}
      customRoles={customRoles}
      canEdit={memberRole === "owner"}
    />
  );
}
