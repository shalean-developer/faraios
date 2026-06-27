import { notFound, redirect } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import {
  listNotifications,
  summarizeNotifications,
} from "@/lib/services/notifications";
import { companyDashboardPath } from "@/lib/paths/company";
import { createClient } from "@/lib/supabase/server";

import { CompanyNotificationsClient } from "./company-notifications-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(companyDashboardPath(slug) + "/notifications")}`);
  }

  const notifications = await listNotifications(row.id, user.id);

  return (
    <CompanyNotificationsClient
      slug={slug}
      company={row}
      notifications={notifications}
      summary={summarizeNotifications(notifications)}
    />
  );
}
