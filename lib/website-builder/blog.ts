import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { BlogCategory, BlogTag } from "@/types/website-builder-blog";

function isBlogTaxonomyTableMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes("content_blog_categories") ||
    message.includes("content_blog_tags") ||
    message.includes("content_post_blog_tags")
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapCategory(row: Record<string, unknown>): BlogCategory {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: (row.description as string) ?? null,
    sort_order: (row.sort_order as number) ?? 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapTag(row: Record<string, unknown>): BlogTag {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    name: row.name as string,
    slug: row.slug as string,
    created_at: row.created_at as string,
  };
}

export async function listBlogCategories(companyId: string): Promise<BlogCategory[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data, error } = await admin.client
    .from("content_blog_categories")
    .select("*")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (!isBlogTaxonomyTableMissing(error)) {
      console.error("[content_blog_categories] listBlogCategories", error.message);
    }
    return [];
  }

  return (data ?? []).map(mapCategory);
}

export async function createBlogCategory(
  companyId: string,
  input: { name: string; slug?: string; description?: string; sortOrder?: number }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const slug = input.slug?.trim() || slugify(input.name);
  const { data, error } = await admin.client
    .from("content_blog_categories")
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      sort_order: input.sortOrder ?? 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[content_blog_categories] createBlogCategory", error?.message);
    return { ok: false, error: error?.message ?? "Could not create category." };
  }

  return { ok: true, id: data.id as string };
}

export async function updateBlogCategory(
  companyId: string,
  categoryId: string,
  input: { name?: string; slug?: string; description?: string; sortOrder?: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.slug !== undefined) payload.slug = input.slug.trim();
  if (input.description !== undefined) payload.description = input.description.trim() || null;
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;

  const { error } = await admin.client
    .from("content_blog_categories")
    .update(payload)
    .eq("id", categoryId)
    .eq("company_id", companyId);

  if (error) {
    console.error("[content_blog_categories] updateBlogCategory", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function deleteBlogCategory(
  companyId: string,
  categoryId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.client
    .from("content_blog_categories")
    .delete()
    .eq("id", categoryId)
    .eq("company_id", companyId);

  if (error) {
    console.error("[content_blog_categories] deleteBlogCategory", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function listBlogTags(companyId: string): Promise<BlogTag[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data, error } = await admin.client
    .from("content_blog_tags")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    if (!isBlogTaxonomyTableMissing(error)) {
      console.error("[content_blog_tags] listBlogTags", error.message);
    }
    return [];
  }

  return (data ?? []).map(mapTag);
}

export async function createBlogTag(
  companyId: string,
  input: { name: string; slug?: string }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const slug = input.slug?.trim() || slugify(input.name);
  const { data, error } = await admin.client
    .from("content_blog_tags")
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      slug,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[content_blog_tags] createBlogTag", error?.message);
    return { ok: false, error: error?.message ?? "Could not create tag." };
  }

  return { ok: true, id: data.id as string };
}

export async function deleteBlogTag(
  companyId: string,
  tagId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.client
    .from("content_blog_tags")
    .delete()
    .eq("id", tagId)
    .eq("company_id", companyId);

  if (error) {
    console.error("[content_blog_tags] deleteBlogTag", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function getPostTagIds(companyId: string): Promise<Record<string, string[]>> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return {};

  const { data: posts, error: postsError } = await admin.client
    .from("content_posts")
    .select("id")
    .eq("company_id", companyId);

  if (postsError || !posts?.length) return {};

  const postIds = posts.map((p) => p.id as string);
  const { data, error } = await admin.client
    .from("content_post_blog_tags")
    .select("post_id, tag_id")
    .in("post_id", postIds);

  if (error) {
    if (!isBlogTaxonomyTableMissing(error)) {
      console.error("[content_post_blog_tags] getPostTagIds", error.message);
    }
    return {};
  }

  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    const postId = row.post_id as string;
    if (!map[postId]) map[postId] = [];
    map[postId].push(row.tag_id as string);
  }
  return map;
}

export async function setPostBlogTags(
  postId: string,
  tagIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error: deleteError } = await admin.client
    .from("content_post_blog_tags")
    .delete()
    .eq("post_id", postId);

  if (deleteError) {
    console.error("[content_post_blog_tags] setPostBlogTags delete", deleteError.message);
    return { ok: false, error: deleteError.message };
  }

  if (tagIds.length === 0) return { ok: true };

  const { error: insertError } = await admin.client.from("content_post_blog_tags").insert(
    tagIds.map((tagId) => ({
      post_id: postId,
      tag_id: tagId,
    }))
  );

  if (insertError) {
    console.error("[content_post_blog_tags] setPostBlogTags insert", insertError.message);
    return { ok: false, error: insertError.message };
  }

  return { ok: true };
}

export async function getBlogDashboardData(companyId: string) {
  const [categories, tags, postTagIds] = await Promise.all([
    listBlogCategories(companyId),
    listBlogTags(companyId),
    getPostTagIds(companyId),
  ]);

  const taxonomyReady = await isBlogTaxonomyReady();

  return { categories, tags, postTagIds, taxonomyReady };
}

export async function isBlogTaxonomyReady(): Promise<boolean> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return false;

  const { error } = await admin.client.from("content_blog_categories").select("id").limit(1);
  return !isBlogTaxonomyTableMissing(error);
}
