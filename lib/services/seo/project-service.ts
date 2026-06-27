import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type {
  SeoIntegration,
  SeoProject,
  SeoSettings,
  SeoSitemapConfig,
} from "@/types/seo-v10";

function mapProject(row: Record<string, unknown>): SeoProject {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    name: row.name as string,
    website_url: (row.website_url as string) ?? null,
    domain: (row.domain as string) ?? null,
    language: (row.language as string) ?? "en",
    country: (row.country as string) ?? "ZA",
    business_type: (row.business_type as string) ?? null,
    default_schema_type: (row.default_schema_type as string) ?? "LocalBusiness",
    sitemap_url: (row.sitemap_url as string) ?? null,
    robots_txt_url: (row.robots_txt_url as string) ?? null,
    gsc_connected: Boolean(row.gsc_connected),
    ga_connected: Boolean(row.ga_connected),
    gbp_connected: Boolean(row.gbp_connected),
    is_active: Boolean(row.is_active ?? true),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function getOrCreateSeoProject(
  companyId: string,
  companyName: string
): Promise<SeoProject | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data: existing } = await admin.client
    .from("seo_projects")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return mapProject(existing);

  const { data: websites } = await admin.client
    .from("websites")
    .select("id, slug, status")
    .eq("client_id", companyId)
    .eq("status", "published")
    .limit(1);

  const site = websites?.[0];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://faraios.com";

  const { data: created, error } = await admin.client
    .from("seo_projects")
    .insert({
      company_id: companyId,
      name: `${companyName} SEO`,
      website_url: site ? `${baseUrl}/site/${site.slug}` : null,
      domain: site ? `${baseUrl}/site/${site.slug}` : null,
    })
    .select("*")
    .single();

  if (error || !created) {
    console.error("[seo_projects] getOrCreate", error?.message);
    return null;
  }

  await admin.client.from("seo_settings").insert({
    project_id: created.id,
    company_id: companyId,
    robots_txt_content: "User-agent: *\nAllow: /\n",
    sitemap_reference: "/sitemap.xml",
  });

  await admin.client.from("seo_sitemaps").insert({
    project_id: created.id,
    company_id: companyId,
    status: "pending",
  });

  return mapProject(created);
}

export async function updateSeoProject(
  projectId: string,
  updates: Partial<
    Pick<
      SeoProject,
      | "name"
      | "website_url"
      | "domain"
      | "language"
      | "country"
      | "business_type"
      | "default_schema_type"
      | "sitemap_url"
      | "robots_txt_url"
      | "gsc_connected"
      | "ga_connected"
      | "gbp_connected"
    >
  >
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.client
    .from("seo_projects")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listSeoProjectsAdmin(): Promise<
  (SeoProject & { company_name?: string; company_slug?: string })[]
> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("seo_projects")
    .select("*, companies(name, slug)")
    .order("updated_at", { ascending: false });

  return (data ?? []).map((row) => ({
    ...mapProject(row),
    company_name: (row.companies as { name?: string; slug?: string } | null)?.name,
    company_slug: (row.companies as { name?: string; slug?: string } | null)?.slug,
  }));
}

export async function getSeoSettings(projectId: string): Promise<SeoSettings | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("seo_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (!data) return null;
  return {
    project_id: data.project_id,
    company_id: data.company_id,
    robots_txt_content: data.robots_txt_content,
    robots_allow_rules: data.robots_allow_rules ?? [],
    robots_disallow_rules: data.robots_disallow_rules ?? [],
    crawl_delay: data.crawl_delay,
    sitemap_reference: data.sitemap_reference,
    auto_crawl_enabled: Boolean(data.auto_crawl_enabled),
    crawl_frequency_days: data.crawl_frequency_days ?? 7,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function getSeoSitemapConfig(
  projectId: string
): Promise<SeoSitemapConfig | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("seo_sitemaps")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    project_id: data.project_id,
    company_id: data.company_id,
    include_pages: Boolean(data.include_pages),
    include_posts: Boolean(data.include_posts),
    include_products: Boolean(data.include_products),
    include_categories: Boolean(data.include_categories),
    include_images: Boolean(data.include_images),
    include_videos: Boolean(data.include_videos),
    include_news: Boolean(data.include_news),
    exclusions: (data.exclusions as string[]) ?? [],
    status: data.status,
    last_generated_at: data.last_generated_at,
    url_count: data.url_count ?? 0,
    sitemap_url: data.sitemap_url,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function getSeoIntegrations(companyId: string): Promise<SeoIntegration[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("seo_integrations")
    .select("*")
    .eq("company_id", companyId);

  return (data ?? []).map((row) => ({
    id: row.id,
    company_id: row.company_id,
    project_id: row.project_id,
    provider: row.provider,
    status: row.status,
    config: (row.config as Record<string, unknown>) ?? {},
    connected_at: row.connected_at,
    last_synced_at: row.last_synced_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function syncIntegrationStatus(companyId: string, projectId: string) {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  const { data: gsc } = await admin.client
    .from("google_search_console_connections")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();

  if (gsc) {
    await admin.client.from("seo_integrations").upsert(
      {
        company_id: companyId,
        project_id: projectId,
        provider: "google_search_console",
        status: "connected",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "company_id,provider" }
    );
    await admin.client
      .from("seo_projects")
      .update({ gsc_connected: true })
      .eq("id", projectId);
  }
}
