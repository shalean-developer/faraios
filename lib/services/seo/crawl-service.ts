import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { SeoCrawl, SeoPage } from "@/types/seo-v10";
import { analyzePageFromHtml } from "./analysis-engine";
import { aggregateHealthScore } from "./scoring-engine";

const FETCH_TIMEOUT_MS = 8000;

type PageInventoryItem = {
  url: string;
  path: string;
  page_type: string;
  source_table: string;
  source_id: string;
  meta_title: string | null;
  meta_description: string | null;
  h1: string | null;
  focus_keywords: string[];
};

function mapInventoryItem(
  item: {
    urlPath: string;
    page_type: string;
    source_table: string;
    source_id: string;
    meta_title: string | null;
    meta_description: string | null;
    h1: string | null;
    focus_keywords: string[];
  },
  base: string
): PageInventoryItem {
  const path = item.urlPath.startsWith("/") ? item.urlPath : `/${item.urlPath}`;
  return {
    url: `${base}${path}`,
    path,
    page_type: item.page_type,
    source_table: item.source_table,
    source_id: item.source_id,
    meta_title: item.meta_title,
    meta_description: item.meta_description,
    h1: item.h1,
    focus_keywords: item.focus_keywords,
  };
}

function mapPage(row: Record<string, unknown>): SeoPage {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    company_id: row.company_id as string,
    url: row.url as string,
    path: (row.path as string) ?? null,
    page_type: (row.page_type as string) ?? "page",
    source_table: (row.source_table as string) ?? null,
    source_id: (row.source_id as string) ?? null,
    http_status: row.http_status as number | null,
    is_indexable: Boolean(row.is_indexable ?? true),
    canonical_url: (row.canonical_url as string) ?? null,
    meta_title: (row.meta_title as string) ?? null,
    meta_description: (row.meta_description as string) ?? null,
    h1: (row.h1 as string) ?? null,
    h2_count: (row.h2_count as number) ?? 0,
    h3_count: (row.h3_count as number) ?? 0,
    internal_links: (row.internal_links as number) ?? 0,
    external_links: (row.external_links as number) ?? 0,
    broken_links: (row.broken_links as number) ?? 0,
    has_schema: Boolean(row.has_schema),
    has_og_tags: Boolean(row.has_og_tags),
    has_twitter_cards: Boolean(row.has_twitter_cards),
    is_https: Boolean(row.is_https ?? true),
    robots_meta: (row.robots_meta as string) ?? null,
    content_length: (row.content_length as number) ?? 0,
    last_crawled_at: (row.last_crawled_at as string) ?? null,
    seo_score: row.seo_score as number | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function collectPageInventory(
  companyId: string,
  projectId: string,
  baseUrl: string
): Promise<PageInventoryItem[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const items: PageInventoryItem[] = [];
  const base = baseUrl.replace(/\/$/, "");

  const push = (raw: Parameters<typeof mapInventoryItem>[0]) => {
    items.push(mapInventoryItem(raw, base));
  };

  const { data: websites } = await admin.client
    .from("websites")
    .select("id, slug, seo_title, seo_description, seo_keywords, status")
    .eq("client_id", companyId);

  for (const site of websites ?? []) {
    const prefix = `/site/${site.slug}`;
    push({
      urlPath: prefix,
      page_type: "home",
      source_table: "websites",
      source_id: site.id,
      meta_title: site.seo_title,
      meta_description: site.seo_description,
      h1: site.seo_title,
      focus_keywords: parseKeywords(site.seo_keywords),
    });
    for (const sub of ["services", "about", "contact", "reviews"]) {
      push({
        urlPath: `${prefix}/${sub}`,
        page_type: "page",
        source_table: "websites",
        source_id: site.id,
        meta_title: site.seo_title,
        meta_description: site.seo_description,
        h1: null,
        focus_keywords: parseKeywords(site.seo_keywords),
      });
    }
  }

  const { data: areas } = await admin.client
    .from("service_area_pages")
    .select("id, slug, seo_title, meta_description, h1, service_name")
    .eq("company_id", companyId)
    .eq("status", "published");

  for (const area of areas ?? []) {
    push({
      urlPath: `/areas/${area.slug}`,
      page_type: "service_area",
      source_table: "service_area_pages",
      source_id: area.id,
      meta_title: area.seo_title,
      meta_description: area.meta_description,
      h1: area.h1,
      focus_keywords: [area.service_name].filter(Boolean),
    });
  }

  const { data: posts } = await admin.client
    .from("content_posts")
    .select("id, slug, meta_title, meta_description, title")
    .eq("company_id", companyId)
    .eq("status", "published");

  for (const post of posts ?? []) {
    push({
      urlPath: `/blog/${post.slug}`,
      page_type: "post",
      source_table: "content_posts",
      source_id: post.id,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      h1: post.title,
      focus_keywords: [],
    });
  }

  const { data: servicePages } = await admin.client
    .from("website_service_pages")
    .select("id, slug, seo_title, seo_description, title, website_id")
    .eq("company_id", companyId);

  for (const sp of servicePages ?? []) {
    const site = (websites ?? []).find((w) => w.id === sp.website_id);
    if (!site) continue;
    push({
      urlPath: `/site/${site.slug}/services/${sp.slug}`,
      page_type: "service",
      source_table: "website_service_pages",
      source_id: sp.id,
      meta_title: sp.seo_title,
      meta_description: sp.seo_description,
      h1: sp.title,
      focus_keywords: [],
    });
  }

  return items;
}

function parseKeywords(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(/[,;]/).map((k) => k.trim()).filter(Boolean);
}

async function fetchPageHtml(url: string): Promise<{ html: string; status: number } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "FaraiOS-SEO-Crawler/1.0" },
    });
    clearTimeout(timer);
    const html = await res.text();
    return { html, status: res.status };
  } catch {
    return null;
  }
}

function analyzePageFromDb(item: PageInventoryItem) {
  const html = buildSyntheticHtml(item);
  return analyzePageFromHtml(html, item.url, item.focus_keywords);
}

function buildSyntheticHtml(item: PageInventoryItem): string {
  return `<html><head>
    <title>${escapeHtml(item.meta_title ?? "")}</title>
    <meta name="description" content="${escapeHtml(item.meta_description ?? "")}" />
  </head><body>
    <h1>${escapeHtml(item.h1 ?? "")}</h1>
    <p>${escapeHtml(item.meta_description ?? item.meta_title ?? "")}</p>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function runProjectCrawl(
  companyId: string,
  projectId: string,
  baseUrl: string,
  options?: { fetchLive?: boolean }
): Promise<{ ok: true; crawl: SeoCrawl } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { data: crawlRow, error: crawlErr } = await admin.client
    .from("seo_crawls")
    .insert({
      project_id: projectId,
      company_id: companyId,
      status: "running",
    })
    .select("*")
    .single();

  if (crawlErr || !crawlRow) {
    return { ok: false, error: crawlErr?.message ?? "Failed to start crawl" };
  }

  const inventory = await collectPageInventory(companyId, projectId, baseUrl);
  let totalCritical = 0;
  let totalWarnings = 0;
  let totalPassed = 0;
  const pageScores: number[] = [];

  for (const item of inventory) {
    let analysis;
    let httpStatus: number | null = 200;
    let pageData: Record<string, unknown>;

    if (options?.fetchLive) {
      const fetched = await fetchPageHtml(item.url);
      if (fetched) {
        httpStatus = fetched.status;
        analysis = analyzePageFromHtml(fetched.html, item.url, item.focus_keywords);
        const p = analysis.parsed;
        pageData = {
          project_id: projectId,
          company_id: companyId,
          url: item.url,
          path: item.path,
          page_type: item.page_type,
          source_table: item.source_table,
          source_id: item.source_id,
          http_status: httpStatus,
          meta_title: p.metaTitle ?? item.meta_title,
          meta_description: p.metaDescription ?? item.meta_description,
          h1: p.h1 ?? item.h1,
          h2_count: p.h2Count,
          h3_count: p.h3Count,
          internal_links: p.internalLinks,
          external_links: p.externalLinks,
          has_schema: p.hasSchema,
          has_og_tags: p.hasOgTags,
          has_twitter_cards: p.hasTwitterCards,
          canonical_url: p.canonicalUrl,
          robots_meta: p.robotsMeta,
          is_https: p.isHttps,
          content_length: p.contentLength,
          last_crawled_at: new Date().toISOString(),
          seo_score: analysis.score.score,
        };
      } else {
        analysis = analyzePageFromDb(item);
        pageData = buildDbPageData(projectId, companyId, item, analysis.score.score, httpStatus);
      }
    } else {
      analysis = analyzePageFromDb(item);
      pageData = buildDbPageData(projectId, companyId, item, analysis.score.score, httpStatus);
    }

    const { data: pageRow } = await admin.client
      .from("seo_pages")
      .upsert(pageData, { onConflict: "project_id,url" })
      .select("id")
      .single();

    if (pageRow) {
      await admin.client.from("seo_analysis").insert({
        page_id: pageRow.id,
        crawl_id: crawlRow.id,
        company_id: companyId,
        score: analysis.score.score,
        issues: analysis.score.issues,
        critical_count: analysis.score.criticalCount,
        warning_count: analysis.score.warningCount,
        passed_count: analysis.score.passedCount,
        recommendation_count: analysis.score.recommendationCount,
      });

      for (const kw of analysis.keywordResults) {
        await admin.client.from("seo_keywords").upsert(
          {
            page_id: pageRow.id,
            company_id: companyId,
            keyword: kw.keyword,
            is_primary: kw.keyword === item.focus_keywords[0],
            in_title: kw.inTitle,
            in_url: kw.inUrl,
            in_meta_description: kw.inMetaDescription,
            in_first_paragraph: kw.inFirstParagraph,
            in_headings: kw.inHeadings,
            in_image_alt: kw.inImageAlt,
            in_conclusion: kw.inConclusion,
            density_percent: kw.densityPercent,
            recommendations: kw.recommendations,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "page_id,keyword", ignoreDuplicates: false }
        );
      }

      for (const img of analysis.parsed?.imageIssues ?? []) {
        await admin.client.from("seo_image_issues").insert({
          page_id: pageRow.id,
          company_id: companyId,
          image_url: img.url,
          issue_type: img.issue,
          recommendation: img.issue,
        });
      }
    }

    totalCritical += analysis.score.criticalCount;
    totalWarnings += analysis.score.warningCount;
    totalPassed += analysis.score.passedCount;
    pageScores.push(analysis.score.score);
  }

  const healthScore = aggregateHealthScore(pageScores);
  const seoScore = healthScore;

  const { data: completed } = await admin.client
    .from("seo_crawls")
    .update({
      status: "completed",
      pages_scanned: inventory.length,
      critical_issues: totalCritical,
      warnings: totalWarnings,
      passed_checks: totalPassed,
      completed_at: new Date().toISOString(),
    })
    .eq("id", crawlRow.id)
    .select("*")
    .single();

  await admin.client.from("seo_health_history").upsert(
    {
      project_id: projectId,
      company_id: companyId,
      seo_score: seoScore,
      health_score: healthScore,
      pages_scanned: inventory.length,
      critical_issues: totalCritical,
      warnings: totalWarnings,
      passed_checks: totalPassed,
      recorded_at: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "project_id,recorded_at" }
  );

  return {
    ok: true,
    crawl: {
      id: completed!.id,
      project_id: completed!.project_id,
      company_id: completed!.company_id,
      status: completed!.status,
      pages_scanned: completed!.pages_scanned,
      critical_issues: completed!.critical_issues,
      warnings: completed!.warnings,
      passed_checks: completed!.passed_checks,
      started_at: completed!.started_at,
      completed_at: completed!.completed_at,
      error_message: completed!.error_message,
    },
  };
}

function buildDbPageData(
  projectId: string,
  companyId: string,
  item: PageInventoryItem,
  score: number,
  httpStatus: number | null
): Record<string, unknown> {
  return {
    project_id: projectId,
    company_id: companyId,
    url: item.url,
    path: item.path,
    page_type: item.page_type,
    source_table: item.source_table,
    source_id: item.source_id,
    http_status: httpStatus,
    meta_title: item.meta_title,
    meta_description: item.meta_description,
    h1: item.h1,
    content_length: (item.meta_description?.length ?? 0) + (item.meta_title?.length ?? 0),
    last_crawled_at: new Date().toISOString(),
    seo_score: score,
  };
}

export async function listSeoPages(projectId: string): Promise<SeoPage[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("seo_pages")
    .select("*")
    .eq("project_id", projectId)
    .order("seo_score", { ascending: true, nullsFirst: true });

  return (data ?? []).map(mapPage);
}

export async function getLatestCrawl(projectId: string): Promise<SeoCrawl | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("seo_crawls")
    .select("*")
    .eq("project_id", projectId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    project_id: data.project_id,
    company_id: data.company_id,
    status: data.status,
    pages_scanned: data.pages_scanned,
    critical_issues: data.critical_issues,
    warnings: data.warnings,
    passed_checks: data.passed_checks,
    started_at: data.started_at,
    completed_at: data.completed_at,
    error_message: data.error_message,
  };
}

export async function getHealthHistory(
  projectId: string,
  limit = 30
): Promise<
  {
    recorded_at: string;
    seo_score: number;
    health_score: number;
    pages_scanned: number;
    critical_issues: number;
    warnings: number;
  }[]
> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("seo_health_history")
    .select("recorded_at, seo_score, health_score, pages_scanned, critical_issues, warnings")
    .eq("project_id", projectId)
    .order("recorded_at", { ascending: true })
    .limit(limit);

  return data ?? [];
}
