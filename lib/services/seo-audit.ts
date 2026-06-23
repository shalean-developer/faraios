import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { SeoAuditResult } from "@/types/growth-engine";
import { getLocalSeoSettingsAdmin } from "@/lib/services/local-seo";

export async function runSeoAudit(companyId: string): Promise<SeoAuditResult> {
  const admin = tryCreateAdminClient();
  const empty: SeoAuditResult = {
    score: 0,
    missingMetaTitles: 0,
    missingMetaDescriptions: 0,
    missingH1: 0,
    missingServiceAreaPages: 0,
    sitemapStatus: "missing",
    schemaStatus: "missing",
    indexedPagesPlaceholder: 0,
    topKeywords: [],
    recommendedActions: ["Configure Supabase to run SEO audit."],
  };

  if (!admin.ok) return empty;

  const [
    { data: websites },
    { data: areaPages },
    { data: contentPosts },
    localSeo,
  ] = await Promise.all([
    admin.client
      .from("websites")
      .select("seo_title, seo_description, seo_keywords, status")
      .eq("client_id", companyId),
    admin.client
      .from("service_area_pages")
      .select("id, seo_title, meta_description, h1, status")
      .eq("company_id", companyId),
    admin.client
      .from("content_posts")
      .select("id, meta_title, meta_description, status")
      .eq("company_id", companyId),
    getLocalSeoSettingsAdmin(companyId),
  ]);

  const publishedSites = (websites ?? []).filter((w) => w.status === "published");
  const publishedAreas = (areaPages ?? []).filter((p) => p.status === "published");
  const publishedPosts = (contentPosts ?? []).filter((p) => p.status === "published");

  let missingMetaTitles = 0;
  let missingMetaDescriptions = 0;
  let missingH1 = 0;

  for (const site of publishedSites) {
    if (!site.seo_title?.trim()) missingMetaTitles++;
    if (!site.seo_description?.trim()) missingMetaDescriptions++;
  }

  for (const page of areaPages ?? []) {
    if (!page.seo_title?.trim()) missingMetaTitles++;
    if (!page.meta_description?.trim()) missingMetaDescriptions++;
    if (!page.h1?.trim()) missingH1++;
  }

  for (const post of contentPosts ?? []) {
    if (!post.meta_title?.trim()) missingMetaTitles++;
    if (!post.meta_description?.trim()) missingMetaDescriptions++;
  }

  const serviceAreas = localSeo?.service_areas ?? [];
  const expectedAreaPages = serviceAreas.length;
  const missingServiceAreaPages = Math.max(0, expectedAreaPages - publishedAreas.length);

  const hasLocalSeo = Boolean(
    localSeo?.business_name &&
      localSeo?.primary_location &&
      localSeo?.phone
  );
  const hasSchemaData = hasLocalSeo && publishedSites.length > 0;
  const hasSitemap = publishedSites.length > 0;

  const keywords = new Set<string>();
  for (const site of publishedSites) {
    const kw = (site.seo_keywords as string)?.split(",") ?? [];
    kw.forEach((k) => {
      const trimmed = k.trim();
      if (trimmed) keywords.add(trimmed);
    });
  }
  if (localSeo?.main_service) keywords.add(localSeo.main_service);
  serviceAreas.forEach((a) => keywords.add(a));

  const recommendedActions: string[] = [];
  if (missingMetaTitles > 0) {
    recommendedActions.push(`Add meta titles to ${missingMetaTitles} page(s).`);
  }
  if (missingMetaDescriptions > 0) {
    recommendedActions.push(`Add meta descriptions to ${missingMetaDescriptions} page(s).`);
  }
  if (missingH1 > 0) {
    recommendedActions.push(`Add H1 headings to ${missingH1} service area page(s).`);
  }
  if (missingServiceAreaPages > 0) {
    recommendedActions.push(
      `Create ${missingServiceAreaPages} service area page(s) for your configured areas.`
    );
  }
  if (!localSeo?.google_review_link) {
    recommendedActions.push("Add your Google review link in Local SEO settings.");
  }
  if (!localSeo?.google_business_profile_url) {
    recommendedActions.push("Connect your Google Business Profile URL.");
  }
  if (publishedPosts.length === 0) {
    recommendedActions.push("Publish your first blog post to improve organic visibility.");
  }
  if (!hasSchemaData) {
    recommendedActions.push("Complete local SEO settings to enable schema markup.");
  }

  const maxScore = 100;
  const deductions =
    missingMetaTitles * 8 +
    missingMetaDescriptions * 6 +
    missingH1 * 5 +
    missingServiceAreaPages * 10 +
    (hasSitemap ? 0 : 15) +
    (hasSchemaData ? 0 : 10) +
    (publishedPosts.length > 0 ? 0 : 5);

  const score = Math.max(0, Math.min(maxScore, maxScore - deductions));

  return {
    score,
    missingMetaTitles,
    missingMetaDescriptions,
    missingH1,
    missingServiceAreaPages,
    sitemapStatus: hasSitemap ? (publishedAreas.length > 0 ? "ok" : "partial") : "missing",
    schemaStatus: hasSchemaData ? "ok" : "partial",
    indexedPagesPlaceholder:
      publishedSites.length * 5 + publishedAreas.length + publishedPosts.length,
    topKeywords: Array.from(keywords).slice(0, 8),
    recommendedActions: recommendedActions.length
      ? recommendedActions
      : ["Your SEO foundation looks good. Keep publishing content and monitoring performance."],
  };
}
