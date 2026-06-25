import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { SeoMetaRecord } from "@/types/seo-v10";

export async function getPageMeta(pageId: string): Promise<SeoMetaRecord | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("seo_meta")
    .select("*")
    .eq("page_id", pageId)
    .maybeSingle();

  if (!data) return null;
  return mapMeta(data);
}

export async function listProjectMeta(companyId: string): Promise<
  (SeoMetaRecord & { page_url?: string })[]
> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("seo_meta")
    .select("*, seo_pages(url)")
    .eq("company_id", companyId);

  return (data ?? []).map((row) => ({
    ...mapMeta(row),
    page_url: (row.seo_pages as { url?: string } | null)?.url,
  }));
}

function mapMeta(row: Record<string, unknown>): SeoMetaRecord {
  return {
    id: row.id as string,
    page_id: row.page_id as string,
    company_id: row.company_id as string,
    seo_title: (row.seo_title as string) ?? null,
    meta_description: (row.meta_description as string) ?? null,
    canonical_url: (row.canonical_url as string) ?? null,
    robots_meta: (row.robots_meta as string) ?? null,
    og_title: (row.og_title as string) ?? null,
    og_description: (row.og_description as string) ?? null,
    og_image: (row.og_image as string) ?? null,
    twitter_title: (row.twitter_title as string) ?? null,
    twitter_description: (row.twitter_description as string) ?? null,
    twitter_image: (row.twitter_image as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export type SeoMetaInput = Partial<
  Omit<SeoMetaRecord, "id" | "page_id" | "company_id" | "created_at" | "updated_at">
>;

export async function upsertPageMeta(
  pageId: string,
  companyId: string,
  meta: SeoMetaInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.client.from("seo_meta").upsert(
    {
      page_id: pageId,
      company_id: companyId,
      ...meta,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "page_id" }
  );

  if (error) return { ok: false, error: error.message };

  await admin.client
    .from("seo_pages")
    .update({
      meta_title: meta.seo_title,
      meta_description: meta.meta_description,
      canonical_url: meta.canonical_url,
      robots_meta: meta.robots_meta,
      has_og_tags: Boolean(meta.og_title || meta.og_description),
      has_twitter_cards: Boolean(meta.twitter_title || meta.twitter_description),
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId);

  return { ok: true };
}

export function buildSearchPreview(meta: {
  seo_title: string | null;
  meta_description: string | null;
  url: string;
}): { title: string; description: string; url: string } {
  return {
    title: meta.seo_title?.trim() || "Page title",
    description:
      meta.meta_description?.trim() ||
      "Add a meta description to improve click-through rate in search results.",
    url: meta.url,
  };
}

export function buildSocialPreview(meta: {
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  url: string;
}): { title: string; description: string; image: string | null; url: string } {
  return {
    title: meta.og_title?.trim() || "Social preview title",
    description: meta.og_description?.trim() || "Social preview description",
    image: meta.og_image,
    url: meta.url,
  };
}
