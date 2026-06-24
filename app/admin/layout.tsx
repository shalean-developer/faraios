import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import {
  getAdminSessionProfile,
  isCurrentUserPlatformAdmin,
} from "@/lib/services/admin";
import { getPrimaryCompanySlugForUser } from "@/lib/services/routing";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowed = await isCurrentUserPlatformAdmin();
  if (!allowed) {
    return <AdminAccessDenied />;
  }

  const profile = await getAdminSessionProfile();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const workspaceSlug = user ? await getPrimaryCompanySlugForUser(user.id) : null;

  return (
    <AdminLayoutShell
      adminDisplayName={profile.adminDisplayName}
      adminEmail={profile.adminEmail}
      workspaceSlug={workspaceSlug}
    >
      {children}
    </AdminLayoutShell>
  );
}
