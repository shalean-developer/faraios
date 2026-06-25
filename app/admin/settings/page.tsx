import { FaraiSettings } from "@/components/admin/farai-settings";
import {
  getAdminNotificationPreferences,
  getAdminSettingsUsers,
  getPlatformAuditLogs,
  getPlatformSettings,
} from "@/lib/services/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Platform Settings — Shalean Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [adminUsers, platformSettings, notificationPreferences, auditLogs] =
    await Promise.all([
    getAdminSettingsUsers(),
    getPlatformSettings(),
    user
      ? getAdminNotificationPreferences(user.id)
      : Promise.resolve({
          emailAlerts: true,
          projectUpdates: true,
          clientActivity: false,
        }),
    getPlatformAuditLogs(40),
  ]);

  const initialTab =
    tab === "users" ||
    tab === "notifications" ||
    tab === "security" ||
    tab === "billing"
      ? tab
      : "general";

  return (
    <FaraiSettings
      adminUsers={adminUsers}
      adminEmail={user?.email ?? null}
      platformSettings={platformSettings}
      notificationPreferences={notificationPreferences}
      auditLogs={auditLogs}
      initialTab={initialTab}
    />
  );
}
