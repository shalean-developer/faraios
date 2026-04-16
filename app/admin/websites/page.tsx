import Link from "next/link";

import { PreviewWebsiteButton } from "@/components/websites/preview-website-button";
import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";
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
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin access required</h1>
      <p className="mt-2 text-sm text-slate-500">This area is only available to super admins.</p>
      <Link href="/admin" className="mt-6 inline-block text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Back to admin
      </Link>
    </main>
  );
}

type WebsiteWithCompany = Website & { companies?: { name?: string | null } | null };

export default async function AdminWebsitesPage() {
  if (!(await isCurrentUserPlatformAdmin())) return <AccessDenied />;
  const supabase = await createClient();
  const { data } = await supabase
    .from("websites")
    .select("*, companies(name)")
    .order("created_at", { ascending: false });

  const websites = (data as WebsiteWithCompany[] | null) ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Websites</h1>
          <p className="mt-2 text-sm text-slate-500">Create and manage client websites.</p>
        </div>
        <Link href="/admin/websites/create" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
          + Create Website
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.1fr_1fr_0.8fr_0.8fr_auto_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Business</span><span>Client</span><span>Industry</span><span>Status</span><span className="text-right">Action</span>
          <span className="text-right">Preview</span>
        </div>
        {websites.length > 0 ? (
          websites.map((website) => (
            <div key={website.id} className="grid grid-cols-[1.1fr_1fr_0.8fr_0.8fr_auto_auto] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
              <span className="font-medium text-slate-900">{website.name}</span>
              <span className="text-slate-600">{website.companies?.name ?? "—"}</span>
              <span className="text-slate-600">{website.industry}</span>
              <span className="text-slate-600">{website.status}</span>
              <span className="text-right">
                <Link href={`/admin/websites/${website.id}/edit`} className="font-medium text-violet-700 hover:text-violet-900">
                  Edit
                </Link>
              </span>
              <span className="flex justify-end">
                <PreviewWebsiteButton websiteId={website.id} domain={website.domain} />
              </span>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500">No websites yet.</div>
        )}
      </div>
    </main>
  );
}
