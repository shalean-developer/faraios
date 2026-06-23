import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { ContentPost, ContentPostCategory } from "@/types/growth-engine";

export type ContentPostInput = {
  title: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  featuredImage?: string;
  category?: ContentPostCategory;
  author?: string;
  status?: "draft" | "published";
  contentBody?: string;
  ctaText?: string;
  ctaLink?: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapRow(row: Record<string, unknown>): ContentPost {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    title: row.title as string,
    slug: row.slug as string,
    meta_title: (row.meta_title as string) ?? null,
    meta_description: (row.meta_description as string) ?? null,
    featured_image: (row.featured_image as string) ?? null,
    category: row.category as ContentPost["category"],
    author: (row.author as string) ?? null,
    status: row.status as ContentPost["status"],
    published_at: (row.published_at as string) ?? null,
    content_body: (row.content_body as string) ?? null,
    cta_text: (row.cta_text as string) ?? null,
    cta_link: (row.cta_link as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listContentPosts(companyId: string): Promise<ContentPost[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data, error } = await admin.client
    .from("content_posts")
    .select("*")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[content_posts] listContentPosts", error.message);
    return [];
  }

  return (data ?? []).map(mapRow);
}

export type ContentPostSummary = {
  total: number;
  drafts: number;
  published: number;
  byCategory: Record<ContentPostCategory, number>;
};

export function summarizeContentPosts(posts: ContentPost[]): ContentPostSummary {
  const byCategory: Record<ContentPostCategory, number> = {
    blog: 0,
    guide: 0,
    service_article: 0,
    faq: 0,
  };

  let drafts = 0;
  let published = 0;

  for (const post of posts) {
    byCategory[post.category] += 1;
    if (post.status === "published") published += 1;
    else drafts += 1;
  }

  return {
    total: posts.length,
    drafts,
    published,
    byCategory,
  };
}

export async function getPublishedContentPost(
  companyId: string,
  slug: string
): Promise<ContentPost | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("content_posts")
    .select("*")
    .eq("company_id", companyId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return data ? mapRow(data) : null;
}

export async function createContentPost(
  companyId: string,
  input: ContentPostInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const slug = input.slug || slugify(input.title);
  const isPublished = input.status === "published";

  const { data, error } = await admin.client
    .from("content_posts")
    .insert({
      company_id: companyId,
      title: input.title,
      slug,
      meta_title: input.metaTitle ?? input.title,
      meta_description: input.metaDescription ?? null,
      featured_image: input.featuredImage ?? null,
      category: input.category ?? "blog",
      author: input.author ?? null,
      status: input.status ?? "draft",
      published_at: isPublished ? new Date().toISOString() : null,
      content_body: input.contentBody ?? null,
      cta_text: input.ctaText ?? null,
      cta_link: input.ctaLink ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[content_posts] createContentPost", error?.message);
    return { ok: false, error: error?.message ?? "Failed to create post." };
  }
  return { ok: true, id: data.id as string };
}

export async function listPublishedContentPosts(companyId: string): Promise<ContentPost[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("content_posts")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (data ?? []).map(mapRow);
}

export async function updateContentPost(
  companyId: string,
  postId: string,
  input: Partial<ContentPostInput>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.title !== undefined) payload.title = input.title;
  if (input.slug !== undefined) payload.slug = input.slug;
  if (input.metaTitle !== undefined) payload.meta_title = input.metaTitle;
  if (input.metaDescription !== undefined) payload.meta_description = input.metaDescription;
  if (input.featuredImage !== undefined) payload.featured_image = input.featuredImage;
  if (input.category !== undefined) payload.category = input.category;
  if (input.author !== undefined) payload.author = input.author;
  if (input.contentBody !== undefined) payload.content_body = input.contentBody;
  if (input.ctaText !== undefined) payload.cta_text = input.ctaText;
  if (input.ctaLink !== undefined) payload.cta_link = input.ctaLink;
  if (input.status !== undefined) {
    payload.status = input.status;
    if (input.status === "published") {
      payload.published_at = new Date().toISOString();
    }
  }

  const { error } = await admin.client
    .from("content_posts")
    .update(payload)
    .eq("id", postId)
    .eq("company_id", companyId);

  if (error) {
    console.error("[content_posts] updateContentPost", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
