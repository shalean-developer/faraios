import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { SeoSitemapConfig } from "@/types/seo-v10";
import { collectPageInventory } from "./crawl-service";

export async function regenerateSitemap(
  projectId: string,
  companyId: string,
  baseUrl: string
): Promise<{ ok: true; urlCount: number } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { data: config } = await admin.client
    .from("seo_sitemaps")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (!config) return { ok: false, error: "Sitemap config not found" };

  await admin.client
    .from("seo_sitemaps")
    .update({ status: "generating" })
    .eq("project_id", projectId);

  const inventory = await collectPageInventory(companyId, projectId, baseUrl);
  const exclusions = new Set((config.exclusions as string[]) ?? []);

  let urls = inventory.map((p) => p.url);
  if (!config.include_posts) {
    urls = urls.filter((u) => !u.includes("/blog/"));
  }
  if (!config.include_pages) {
    urls = urls.filter((u) => !u.includes("/areas/"));
  }
  urls = urls.filter((u) => !exclusions.has(u));

  const sitemapUrl = `${baseUrl.replace(/\/$/, "")}/sitemap.xml`;

  const { error } = await admin.client
    .from("seo_sitemaps")
    .update({
      status: "ok",
      url_count: urls.length,
      sitemap_url: sitemapUrl,
      last_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId);

  if (error) return { ok: false, error: error.message };

  await admin.client
    .from("seo_projects")
    .update({ sitemap_url: sitemapUrl })
    .eq("id", projectId);

  return { ok: true, urlCount: urls.length };
}

export async function updateSitemapConfig(
  projectId: string,
  updates: Partial<
    Pick<
      SeoSitemapConfig,
      | "include_pages"
      | "include_posts"
      | "include_products"
      | "include_categories"
      | "include_images"
      | "include_videos"
      | "include_news"
      | "exclusions"
    >
  >
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.client
    .from("seo_sitemaps")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("project_id", projectId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function buildRobotsTxt(settings: {
  allowRules: string[];
  disallowRules: string[];
  crawlDelay: number | null;
  sitemapReference: string | null;
  customContent: string | null;
}): string {
  if (settings.customContent?.trim()) return settings.customContent.trim();

  const lines = ["User-agent: *"];
  for (const rule of settings.allowRules) {
    if (rule.trim()) lines.push(`Allow: ${rule.trim()}`);
  }
  for (const rule of settings.disallowRules) {
    if (rule.trim()) lines.push(`Disallow: ${rule.trim()}`);
  }
  if (settings.crawlDelay != null && settings.crawlDelay > 0) {
    lines.push(`Crawl-delay: ${settings.crawlDelay}`);
  }
  if (settings.sitemapReference) {
    lines.push(`Sitemap: ${settings.sitemapReference}`);
  }
  if (lines.length === 1) {
    lines.push("Allow: /");
    lines.push("Sitemap: /sitemap.xml");
  }
  return lines.join("\n");
}

export function validateRobotsTxt(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (!/^(User-agent|Allow|Disallow|Crawl-delay|Sitemap):/i.test(trimmed)) {
      errors.push(`Invalid line: ${trimmed}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export async function saveRobotsSettings(
  projectId: string,
  companyId: string,
  input: {
    robotsTxtContent?: string | null;
    allowRules?: string[];
    disallowRules?: string[];
    crawlDelay?: number | null;
    sitemapReference?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.client.from("seo_settings").upsert(
    {
      project_id: projectId,
      company_id: companyId,
      ...input,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function getRobotsStatus(settings: {
  robots_txt_content: string | null;
  robots_allow_rules: string[];
  robots_disallow_rules: string[];
}): "ok" | "partial" | "missing" {
  if (settings.robots_txt_content?.trim()) return "ok";
  if (settings.robots_allow_rules.length || settings.robots_disallow_rules.length) return "partial";
  return "missing";
}
