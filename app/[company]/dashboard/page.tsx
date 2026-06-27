import { notFound } from "next/navigation";

import { CompanyOperationsDashboard } from "./company-operations-dashboard";
import { getCompanyBySlug } from "@/lib/services/companies";
import { getHomeOverviewData } from "@/lib/services/home-overview";
import { getRiseDashboardExtras } from "@/lib/services/rise-dashboard-data";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export default async function CompanyDashboardPage({ params }: Props) {
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

  const [overview, extras] = await Promise.all([
    getHomeOverviewData(row.id),
    getRiseDashboardExtras(row.id, user?.id ?? null),
  ]);

  const userDisplayName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    (user?.email ? user.email.split("@")[0]! : "there");

  return (
    <CompanyOperationsDashboard
      slug={slug}
      overview={overview}
      extras={extras}
      userDisplayName={userDisplayName}
    />
  );
}
