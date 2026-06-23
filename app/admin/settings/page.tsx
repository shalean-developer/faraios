import Link from "next/link";

import { FaraiSettings } from "@/components/admin/farai-settings";
import {
  getAdminNotificationPreferences,
  getAdminSettingsUsers,
  getPlatformSettings,
  isCurrentUserPlatformAdmin,
} from "@/lib/services/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin Settings — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function AccessDenied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: "#f8f7ff" }}>
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Admin access required</h1>
        <p className="mt-2 text-sm text-gray-500">
          This area is restricted to platform administrators.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const allowed = await isCurrentUserPlatformAdmin();
  if (!allowed) return <AccessDenied />;

  const { tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [adminUsers, platformSettings, notificationPreferences] = await Promise.all([
    getAdminSettingsUsers(),
    getPlatformSettings(),
    user ? getAdminNotificationPreferences(user.id) : Promise.resolve({
      emailAlerts: true,
      projectUpdates: true,
      clientActivity: false,
    }),
  ]);

  const adminDisplayName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    (user?.email ? user.email.split("@")[0]! : "Super Admin");

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
      adminDisplayName={adminDisplayName}
      platformSettings={platformSettings}
      notificationPreferences={notificationPreferences}
      initialTab={initialTab}
    />
  );
}
