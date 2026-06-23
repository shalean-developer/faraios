import { notFound } from "next/navigation";

import { GrowthHubNav } from "@/components/growth/growth-hub-nav";
import { SeoDashboardClient } from "@/components/growth/seo-dashboard-client";
import { getCompanyBySlug } from "@/lib/services/companies";
import { getLocalSeoSettings, seedLocalSeoFromCompany } from "@/lib/services/local-seo";
import { runSeoAudit } from "@/lib/services/seo-audit";
import { listServiceAreaPages } from "@/lib/services/service-area-pages";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "SEO — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

export default async function CompanySeoPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

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
