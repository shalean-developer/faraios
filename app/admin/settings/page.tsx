import { FaraiSettings } from "@/components/admin/farai-settings";
import {
  getAdminNotificationPreferences,
  getAdminSettingsUsers,
  getPlatformAuditLogs,
  getPlatformSettings,
} from "@/lib/services/admin";
import {
  currentUserCanManagePlatformRoles,
  listPlatformAdminRoles,
} from "@/lib/services/platform-admin-roles";
import { getAdminBillingSettings } from "@/lib/services/billing-config";
import { getAdminSearchConsoleIntegrationSettings } from "@/lib/services/search-console-config";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Platform Settings — FaraiOS Admin",
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

  const [adminUsers, platformRoles, canManagePlatformRoles, platformSettings, notificationPreferences, auditLogs, searchConsoleIntegration, billingSettings] =
    await Promise.all([
    getAdminSettingsUsers(),
    listPlatformAdminRoles(),
    currentUserCanManagePlatformRoles(),
    getPlatformSettings(),
    user
      ? getAdminNotificationPreferences(user.id)
      : Promise.resolve({
          emailAlerts: true,
          projectUpdates: true,
          clientActivity: false,
        }),
    getPlatformAuditLogs(40),
    getAdminSearchConsoleIntegrationSettings(),
    getAdminBillingSettings(),
  ]);

  const initialTab =
    tab === "users" ||
    tab === "notifications" ||
    tab === "security" ||
    tab === "billing" ||
    tab === "integrations"
      ? tab
      : "general";

  return (
    <FaraiSettings
      adminUsers={adminUsers}
      platformRoles={platformRoles}
      canManagePlatformRoles={canManagePlatformRoles}
      adminEmail={user?.email ?? null}
      platformSettings={platformSettings}
      notificationPreferences={notificationPreferences}
      auditLogs={auditLogs}
      searchConsoleIntegration={searchConsoleIntegration}
      billingSettings={billingSettings}
      initialTab={initialTab}
    />
  );
}
