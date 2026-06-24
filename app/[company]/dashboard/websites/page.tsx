import Link from "next/link";
import { notFound } from "next/navigation";

import {
  listBusinessWebProperties,
  summarizeWebsiteHub,
} from "@/lib/services/business-websites";
import { getConnectedWebsiteForCompany } from "@/lib/services/connected-websites";
import { getCompanyBySlug } from "@/lib/services/companies";
import { getHostingSubscriptionForCompany } from "@/lib/services/hosting";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { companyHasWebsiteProject } from "@/lib/services/projects";
import { getWebsiteSetupChecklistForCompany } from "@/lib/services/website-checklist";
import { getWebsiteDomainsForCompany } from "@/lib/services/website-domains";
import { getRecentTrackingEvents } from "@/lib/services/website-tracking";
import { companyDashboardPath } from "@/lib/paths/company";
import { createClient } from "@/lib/supabase/server";
import type { Website } from "@/types/database";

import { CompanyWebsitesClient } from "./company-websites-client";

export const metadata = {
  title: "Websites — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

function AccessDenied({ slug }: { slug: string }) {
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
      <Link
        href={companyDashboardPath(slug)}
        className="mt-3 block text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Back to dashboard
      </Link>
    </main>
  );
}

export default async function CompanyWebsitesPage({ params }: Props) {
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

  const companyId = row.id;

  const [{ data: websites }, hasWebsiteProject, connectedWebsite, hosting, domains, properties, recentEvents] =
    await Promise.all([
      supabase
        .from("websites")
        .select("*")
        .eq("client_id", companyId)
        .order("created_at", { ascending: false }),
      companyHasWebsiteProject(companyId),
      getConnectedWebsiteForCompany(companyId),
      getHostingSubscriptionForCompany(companyId),
      getWebsiteDomainsForCompany(companyId),
      listBusinessWebProperties(companyId),
      getRecentTrackingEvents(companyId, 5),
    ]);

  const hostedWebsites = (websites as Website[] | null) ?? [];

  const checklist = await getWebsiteSetupChecklistForCompany(
    companyId,
    slug,
    connectedWebsite,
    hostedWebsites,
    domains
  );

  const summary = summarizeWebsiteHub({
    websites: hostedWebsites,
    domains,
    properties,
    checklist,
    hosting,
    recentEvents,
  });

  return (
    <CompanyWebsitesClient
      slug={slug}
      websites={hostedWebsites}
      hasWebsiteProject={hasWebsiteProject}
      connectedWebsite={connectedWebsite}
      hosting={hosting}
      domains={domains}
      properties={properties}
      checklist={checklist}
      summary={summary}
      recentEvents={recentEvents}
    />
  );
}
