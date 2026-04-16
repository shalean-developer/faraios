import Link from "next/link";

import { PreviewWebsiteButton } from "@/components/websites/preview-website-button";
import { createClient } from "@/lib/supabase/server";
import type { Website } from "@/types/database";

export const metadata = {
  title: "Websites — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function AccessDenied() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Access denied</h1>
      <p className="mt-2 text-sm text-slate-500">
        Please sign in to view your websites.
      </p>
      <Link
        href="/auth/sign-in"
        className="mt-6 inline-block text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        Go to sign in
      </Link>
    </main>
  );
}

export default async function WebsitesDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <AccessDenied />;

  const { data: membership } = await supabase
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const companyId = membership?.company_id ?? null;
  const { data: websites } = companyId
    ? await supabase
        .from("websites")
        .select("*")
        .eq("client_id", companyId)
        .order("created_at", { ascending: false })
    : { data: [] as Website[] };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Websites
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Create and manage websites for your clients.
          </p>
        </div>
        <Link
          href="/dashboard/websites/create"
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          + Create Website
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_0.8fr_1fr_auto_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Business</span>
          <span>Industry</span>
          <span>Status</span>
          <span className="text-right">Action</span>
          <span className="text-right">Preview</span>
        </div>
        {(websites as Website[] | null)?.length ? (
          (websites as Website[]).map((website) => (
            <div
              key={website.id}
              className="grid grid-cols-[1.2fr_0.8fr_1fr_auto_auto] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
            >
              <span className="font-medium text-slate-900">{website.name}</span>
              <span className="text-slate-600">{website.industry}</span>
              <span className="text-slate-600">{website.status}</span>
              <span className="text-right">
                <Link
                  href={`/dashboard/websites/${website.id}/edit`}
                  className="font-medium text-violet-700 hover:text-violet-900"
                >
                  Edit
                </Link>
              </span>
              <span className="flex justify-end">
                <PreviewWebsiteButton websiteId={website.id} domain={website.domain} />
              </span>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No websites yet. Click <strong>+ Create Website</strong> to generate one.
          </div>
        )}
      </div>
    </main>
  );
}
