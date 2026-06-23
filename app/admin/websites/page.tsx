import Link from "next/link";

import { FaraiAdminWebsites } from "@/components/admin/farai-admin-websites";
import { getAdminQueryClient, isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import { createClient } from "@/lib/supabase/server";
import type { Website } from "@/types/database";

export const metadata = {
  title: "Admin Websites — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function AccessDenied() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Admin access required
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        This area is only available to super admins.
      </p>
      <Link
        href="/admin"
        className="mt-6 inline-block text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to admin
      </Link>
    </main>
  );
}

type WebsiteWithCompany = Website & { companies?: { name?: string | null } | null };

export default async function AdminWebsitesPage() {
  if (!(await isCurrentUserPlatformAdmin())) return <AccessDenied />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminClient = await getAdminQueryClient();
  const { data } = await adminClient
    .from("websites")
    .select("*, companies(name)")
    .order("created_at", { ascending: false });

  const websites = (data as WebsiteWithCompany[] | null) ?? [];
  const adminDisplayName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    (user?.email ? user.email.split("@")[0]! : "Super Admin");

  return (
    <FaraiAdminWebsites
      websites={websites}
      adminDisplayName={adminDisplayName}
      adminEmail={user?.email ?? null}
    />
  );
}
