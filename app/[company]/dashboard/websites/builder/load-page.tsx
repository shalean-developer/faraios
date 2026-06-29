import { notFound } from "next/navigation";

import { WebsiteBuilderClient, type BuilderSection } from "@/components/website-builder/website-builder-client";
import { getCompanyBySlug } from "@/lib/services/companies";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { loadWebsiteDomainDnsHelp } from "@/lib/hosting/website-domain-dns-help";
import {
  getDnsRecordsForDomain,
  getWebsiteDomainsForCompany,
} from "@/lib/services/website-domains";
import {
  ensureBuilderWebsite,
  getBuilderDashboardData,
  getLegacyWebsiteRowForCompany,
} from "@/lib/website-builder/service";
import { getBlogDashboardData } from "@/lib/website-builder/blog";
import { getBuilderAnalytics } from "@/lib/website-builder/analytics";
import { listPublishSnapshots } from "@/lib/website-builder/publish-snapshots";
import { listContentPosts, summarizeContentPosts } from "@/lib/services/content-posts";
import { createClient } from "@/lib/supabase/server";
import type { WebsiteDomainDnsHelp } from "@/components/websites/website-domains-panel";
import type { CompanyWithIndustry, CompanyService } from "@/types/database";
import type { PublishSnapshotSummary } from "@/types/website-builder-settings";
import type { WebsiteDnsRecord, WebsiteDomain } from "@/types/website-engine";

export const dynamic = "force-dynamic";

export async function loadWebsiteBuilderPage(slug: string, section: BuilderSection) {
  const decoded = decodeURIComponent(slug);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { unauthorized: true as const };

  const company = await getCompanyBySlug(decoded);
  if (!company) notFound();

  const hasAccess = await userHasCompanySlugAccess(user.id, decoded);
  if (!hasAccess) return { unauthorized: true as const };

  const [initialDashboardData, servicesRes, contentPosts, blogData, legacyWebsite] =
    await Promise.all([
      getBuilderDashboardData(company.id),
      supabase
        .from("company_services")
        .select("*")
        .eq("company_id", company.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      listContentPosts(company.id),
      getBlogDashboardData(company.id),
      getLegacyWebsiteRowForCompany(company.id),
    ]);

  let dashboardData = initialDashboardData;
  if (!dashboardData && legacyWebsite) {
    const adopted = await ensureBuilderWebsite(company);
    if (adopted.ok) {
      dashboardData = await getBuilderDashboardData(company.id);
    }
  }

  const builderAnalytics =
    section === "analytics" && dashboardData?.website
      ? await getBuilderAnalytics({
          companyId: company.id,
          website: dashboardData.website,
          servicePages: dashboardData.servicePages ?? [],
          companySlug: decoded,
        })
      : null;

  const publishSnapshots: PublishSnapshotSummary[] =
    section === "settings" && dashboardData?.website
      ? await listPublishSnapshots(dashboardData.website.id)
      : [];

  let websiteDomains = (dashboardData?.websiteDomains ?? []) as WebsiteDomain[];
  let dnsByDomain = (dashboardData?.dnsByDomain ?? {}) as Record<string, WebsiteDnsRecord[]>;
  let domainDnsHelp = dashboardData?.domainDnsHelp ?? null;

  if (section === "domains" && !dashboardData) {
    websiteDomains = await getWebsiteDomainsForCompany(company.id);
    dnsByDomain = {};
    await Promise.all(
      websiteDomains.map(async (domain) => {
        dnsByDomain[domain.id] = await getDnsRecordsForDomain(domain.id);
      })
    );
    domainDnsHelp = await loadWebsiteDomainDnsHelp(company.id);
  }

  return {
    unauthorized: false as const,
    slug: decoded,
    companyId: company.id,
    company,
    section,
    website: dashboardData?.website ?? null,
    landingContent: dashboardData?.landingContent ?? null,
    servicePages: dashboardData?.servicePages ?? [],
    enquiries: dashboardData?.enquiries ?? [],
    domainSettings: dashboardData?.domainSettings ?? null,
    websiteDomains,
    dnsByDomain,
    domainDnsHelp,
    companyServices: (servicesRes.data ?? []) as CompanyService[],
    savedComponents: dashboardData?.savedComponents ?? [],
    mediaItems: dashboardData?.mediaItems ?? [],
    contentPosts,
    contentSummary: summarizeContentPosts(contentPosts),
    blogCategories: blogData.categories,
    blogTags: blogData.tags,
    postTagIds: blogData.postTagIds,
    blogTaxonomyReady: blogData.taxonomyReady,
    builderAnalytics,
    publishSnapshots,
  };
}

export function renderWebsiteBuilderPage(
  data: Awaited<ReturnType<typeof loadWebsiteBuilderPage>>
) {
  if (data.unauthorized) {
    return (
      <main className="px-4 py-10 text-center">
        <p className="text-sm text-slate-600">Please sign in to access the website builder.</p>
      </main>
    );
  }

  return (
    <WebsiteBuilderClient
      slug={data.slug}
      companyId={data.companyId}
      company={data.company as CompanyWithIndustry}
      section={data.section}
      website={data.website}
      landingContent={data.landingContent}
      servicePages={data.servicePages}
      enquiries={data.enquiries}
      domainSettings={data.domainSettings}
      websiteDomains={data.websiteDomains}
      dnsByDomain={data.dnsByDomain}
      domainDnsHelp={data.domainDnsHelp}
      companyServices={data.companyServices}
      savedComponents={data.savedComponents}
      mediaItems={data.mediaItems}
      contentPosts={data.contentPosts}
      contentSummary={data.contentSummary}
      blogCategories={data.blogCategories}
      blogTags={data.blogTags}
      postTagIds={data.postTagIds}
      blogTaxonomyReady={data.blogTaxonomyReady}
      builderAnalytics={data.builderAnalytics}
      publishSnapshots={data.publishSnapshots}
    />
  );
}
