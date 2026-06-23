import Link from "next/link";
import { notFound } from "next/navigation";

import { GrowthHubNav } from "@/components/growth/growth-hub-nav";
import { SeoDashboardClient } from "@/components/growth/seo-dashboard-client";
import { companyDashboardPath } from "@/lib/paths/company";
import { getCompanyBySlug } from "@/lib/services/companies";
import { getLocalSeoSettings, seedLocalSeoFromCompany } from "@/lib/services/local-seo";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { runSeoAudit } from "@/lib/services/seo-audit";
import { listServiceAreaPages } from "@/lib/services/service-area-pages";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "SEO — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

function AccessDenied({ slug }: { slug: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Access denied</h1>
      <p className="mt-2 text-sm text-slate-500">Please sign in to manage SEO settings.</p>
      <Link
        href="/auth/sign-in"
        className="mt-6 inline-block text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        Go to sign in
      </Link>
      <Link
        href={companyDashboardPath(slug)}
        className="mt-3 block text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Back to dashboard
      </Link>
    </main>
  );
}

export default async function CompanySeoPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <AccessDenied slug={slug} />;

  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const hasAccess = await userHasCompanySlugAccess(user.id, slug);
  if (!hasAccess) return <AccessDenied slug={slug} />;

  await seedLocalSeoFromCompany(row.id, row);

  const [audit, localSeo, serviceAreaPages, websites] = await Promise.all([
    runSeoAudit(row.id),
    getLocalSeoSettings(row.id),
    listServiceAreaPages(row.id),
    fetchWebsites(row.id),
  ]);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Growth</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">SEO dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage local SEO, meta tags, service area pages, and schema readiness.
        </p>
      </header>

      <GrowthHubNav slug={slug} active="seo" />

      <SeoDashboardClient
        slug={slug}
        companyId={row.id}
        companyName={row.name}
        audit={audit}
        localSeo={localSeo}
        websites={websites}
        serviceAreaPages={serviceAreaPages}
      />
    </div>
  );
}

async function fetchWebsites(companyId: string) {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("websites")
    .select("id, name, seo_title, seo_description, seo_keywords")
    .eq("client_id", companyId);

  return data ?? [];
}
