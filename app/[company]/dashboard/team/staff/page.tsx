import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { userHasPermission } from "@/lib/services/permissions";
import { listStaffProfiles } from "@/lib/services/staff-profiles";
import { getMemberRoleForUser, listCompanyMembers } from "@/lib/services/team";
import { createClient } from "@/lib/supabase/server";

import { CompanyTeamStaffClient } from "./company-team-staff-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyTeamStaffPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const row = await getCompanyBySlug(slug);
  if (!row || !(await userHasCompanySlugAccess(user.id, slug))) notFound();

  const [members, profiles, role, canManageStaff] = await Promise.all([
    listCompanyMembers(row.id),
    listStaffProfiles(row.id),
    getMemberRoleForUser(row.id, user.id),
    userHasPermission(row.id, user.id, "manage_staff"),
  ]);

  return (
    <CompanyTeamStaffClient
      slug={slug}
      company={row}
      members={members}
      profiles={profiles}
      canManage={role === "owner" || canManageStaff}
      currentUserId={user.id}
    />
  );
}
