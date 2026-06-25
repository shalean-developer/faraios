import { notFound } from "next/navigation";

import { CompanyOperationsDashboard } from "./company-operations-dashboard";
import { getCompanyBySlug } from "@/lib/services/companies";
import { getHomeOverviewData } from "@/lib/services/home-overview";
import {
  listNotifications,
  summarizeNotifications,
} from "@/lib/services/notifications";
import { getWorkspaceSetupChecklist } from "@/lib/services/workspace-setup";
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

  const overview = await getHomeOverviewData(row.id);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userDisplayName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    (user?.email ? user.email.split("@")[0]! : "there");

  const notifications = user
    ? await listNotifications(row.id, user.id, 8)
    : [];
  const { unread: unreadCount } = summarizeNotifications(notifications);
  const workspaceSetup = await getWorkspaceSetupChecklist(row);

  return (
    <CompanyOperationsDashboard
      slug={slug}
      company={row}
      overview={overview}
      userDisplayName={userDisplayName}
      notifications={notifications}
      unreadCount={unreadCount}
      workspaceSetup={workspaceSetup}
    />
  );
}
