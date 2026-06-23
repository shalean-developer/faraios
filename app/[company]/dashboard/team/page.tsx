import { notFound } from "next/navigation";

import { getMemberRoleForUser, listCompanyMembers } from "@/lib/services/team";
import { getCompanyBySlug } from "@/lib/services/companies";
import { createClient } from "@/lib/supabase/server";

import { CompanyTeamClient } from "./company-team-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyTeamPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const [members, role] = await Promise.all([
    listCompanyMembers(row.id),
    getMemberRoleForUser(row.id, user.id),
  ]);

  return (
    <CompanyTeamClient
      slug={slug}
      company={row}
      members={members}
      currentUserId={user.id}
      canManage={role === "owner"}
    />
  );
}
