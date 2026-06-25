"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyPermissionAndFeature } from "@/lib/services/company-access";
import { upsertLocalSeoSettings } from "@/lib/services/local-seo";
import type { LocalSeoInput } from "@/lib/services/local-seo";
import {
  loadSeoV10Dashboard,
  runProjectCrawl,
} from "@/lib/services/seo";
import { upsertPageMeta, type SeoMetaInput } from "@/lib/services/seo/meta-service";
import {
  createRedirect,
  deleteRedirect,
  parseRedirectsCsv,
} from "@/lib/services/seo/redirect-service";
import { clear404Log } from "@/lib/services/seo/monitor-404-service";
import {
  regenerateSitemap,
  saveRobotsSettings,
  updateSitemapConfig,
} from "@/lib/services/seo/sitemap-service";
import {
  deleteSchemaRecord,
  saveSchemaRecord,
} from "@/lib/services/seo/schema-service";
import { generateHealthReport } from "@/lib/services/seo/report-service";
import { updateSeoProject } from "@/lib/services/seo/project-service";
import { addPageKeyword } from "@/lib/services/seo/image-seo-service";

export type SeoV10ActionResult = { ok: true } | { ok: false; error: string };

function revalidateSeo(slug: string) {
  revalidatePath(`/${slug}/dashboard/seo`);
  revalidatePath(`/${slug}/dashboard/growth`);
}

export async function runSeoCrawlAction(input: {
  companyId: string;
  companySlug: string;
  projectId: string;
  fetchLive?: boolean;
}): Promise<SeoV10ActionResult> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://faraios.com";
  const result = await runProjectCrawl(
    input.companyId,
    input.projectId,
    baseUrl,
    { fetchLive: input.fetchLive }
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidateSeo(input.companySlug);
  return { ok: true };
}

export async function saveSeoProjectAction(input: {
  companyId: string;
  companySlug: string;
  projectId: string;
  updates: {
    name?: string;
    website_url?: string;
    domain?: string;
    language?: string;
    country?: string;
    business_type?: string;
    default_schema_type?: string;
  };
}): Promise<SeoV10ActionResult> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const result = await updateSeoProject(input.projectId, input.updates);
  if (!result.ok) return result;

  revalidateSeo(input.companySlug);
  return { ok: true };
}

export async function savePageMetaAction(input: {
  companyId: string;
  companySlug: string;
  pageId: string;
  meta: SeoMetaInput;
}): Promise<SeoV10ActionResult> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const result = await upsertPageMeta(input.pageId, input.companyId, input.meta);
  if (!result.ok) return result;

  revalidateSeo(input.companySlug);
  return { ok: true };
}

export async function saveRobotsAction(input: {
  companyId: string;
  companySlug: string;
  projectId: string;
  robotsTxtContent?: string;
  allowRules?: string[];
  disallowRules?: string[];
  crawlDelay?: number | null;
  sitemapReference?: string | null;
}): Promise<SeoV10ActionResult> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const result = await saveRobotsSettings(input.projectId, input.companyId, {
    robotsTxtContent: input.robotsTxtContent,
    allowRules: input.allowRules,
    disallowRules: input.disallowRules,
    crawlDelay: input.crawlDelay,
    sitemapReference: input.sitemapReference,
  });
  if (!result.ok) return result;

  revalidateSeo(input.companySlug);
  return { ok: true };
}

export async function regenerateSitemapAction(input: {
  companyId: string;
  companySlug: string;
  projectId: string;
}): Promise<SeoV10ActionResult & { urlCount?: number }> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://faraios.com";
  const result = await regenerateSitemap(input.projectId, input.companyId, baseUrl);
  if (!result.ok) return result;

  revalidateSeo(input.companySlug);
  return { ok: true, urlCount: result.urlCount };
}

export async function updateSitemapConfigAction(input: {
  companyId: string;
  companySlug: string;
  projectId: string;
  config: {
    include_pages?: boolean;
    include_posts?: boolean;
    include_images?: boolean;
    exclusions?: string[];
  };
}): Promise<SeoV10ActionResult> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const result = await updateSitemapConfig(input.projectId, input.config);
  if (!result.ok) return result;

  revalidateSeo(input.companySlug);
  return { ok: true };
}

export async function createRedirectAction(input: {
  companyId: string;
  companySlug: string;
  projectId: string;
  sourceUrl: string;
  destinationUrl: string;
  statusCode: number;
}): Promise<SeoV10ActionResult> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const result = await createRedirect({
    projectId: input.projectId,
    companyId: input.companyId,
    sourceUrl: input.sourceUrl,
    destinationUrl: input.destinationUrl,
    statusCode: input.statusCode,
  });
  if (!result.ok) return result;

  revalidateSeo(input.companySlug);
  return { ok: true };
}

export async function deleteRedirectAction(input: {
  companyId: string;
  companySlug: string;
  redirectId: string;
}): Promise<SeoV10ActionResult> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const result = await deleteRedirect(input.redirectId);
  if (!result.ok) return result;

  revalidateSeo(input.companySlug);
  return { ok: true };
}

export async function importRedirectsAction(input: {
  companyId: string;
  companySlug: string;
  projectId: string;
  csv: string;
}): Promise<SeoV10ActionResult & { imported?: number }> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const rows = parseRedirectsCsv(input.csv);
  let imported = 0;
  for (const row of rows) {
    const r = await createRedirect({
      projectId: input.projectId,
      companyId: input.companyId,
      sourceUrl: row.sourceUrl,
      destinationUrl: row.destinationUrl,
      statusCode: row.statusCode,
    });
    if (r.ok) imported++;
  }

  revalidateSeo(input.companySlug);
  return { ok: true, imported };
}

export async function createRedirectFrom404Action(input: {
  companyId: string;
  companySlug: string;
  projectId: string;
  logId: string;
  missingUrl: string;
  destinationUrl: string;
}): Promise<SeoV10ActionResult> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  await createRedirect({
    projectId: input.projectId,
    companyId: input.companyId,
    sourceUrl: input.missingUrl,
    destinationUrl: input.destinationUrl,
    statusCode: 301,
  });
  await clear404Log(input.logId);

  revalidateSeo(input.companySlug);
  return { ok: true };
}

export async function saveSchemaAction(input: {
  companyId: string;
  companySlug: string;
  projectId: string;
  schemaType: string;
  jsonLd: Record<string, unknown>;
  pageId?: string;
}): Promise<SeoV10ActionResult> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const result = await saveSchemaRecord({
    projectId: input.projectId,
    companyId: input.companyId,
    schemaType: input.schemaType,
    jsonLd: input.jsonLd,
    pageId: input.pageId,
  });
  if (!result.ok) return result;

  revalidateSeo(input.companySlug);
  return { ok: true };
}

export async function deleteSchemaAction(input: {
  companyId: string;
  companySlug: string;
  schemaId: string;
}): Promise<SeoV10ActionResult> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const result = await deleteSchemaRecord(input.schemaId);
  if (!result.ok) return result;

  revalidateSeo(input.companySlug);
  return { ok: true };
}

export async function generateReportAction(input: {
  companyId: string;
  companySlug: string;
  companyName: string;
}): Promise<SeoV10ActionResult & { reportId?: string }> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const dashboard = await loadSeoV10Dashboard(input.companyId, input.companyName);
  if (!dashboard.project) return { ok: false, error: "No SEO project" };

  const result = await generateHealthReport({
    projectId: dashboard.project.id,
    companyId: input.companyId,
    dashboard,
  });
  if (!result.ok) return result;

  revalidateSeo(input.companySlug);
  return { ok: true, reportId: result.id };
}

export async function saveExtendedLocalSeoAction(input: {
  companyId: string;
  companySlug: string;
  settings: LocalSeoInput & {
    latitude?: number | null;
    longitude?: number | null;
    google_maps_url?: string | null;
    logo_url?: string | null;
    whatsapp?: string | null;
    knowledge_graph_data?: Record<string, unknown>;
  };
}): Promise<SeoV10ActionResult> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const result = await upsertLocalSeoSettings(input.companyId, input.settings);
  if (!result.ok) return result;

  revalidateSeo(input.companySlug);
  return { ok: true };
}

export async function addKeywordAction(input: {
  companyId: string;
  companySlug: string;
  pageId: string;
  keyword: string;
}): Promise<SeoV10ActionResult> {
  const access = await requireCompanyPermissionAndFeature(
    input.companyId,
    "manage_marketing",
    "seo"
  );
  if (!access.ok) return access;

  const result = await addPageKeyword(input.pageId, input.companyId, input.keyword);
  if (!result.ok) return result;

  revalidateSeo(input.companySlug);
  return { ok: true };
}
