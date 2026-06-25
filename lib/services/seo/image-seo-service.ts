import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { SeoImageIssue, SeoKeyword } from "@/types/seo-v10";

export async function listImageIssues(companyId: string): Promise<SeoImageIssue[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("seo_image_issues")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((row) => ({
    id: row.id,
    page_id: row.page_id,
    company_id: row.company_id,
    image_url: row.image_url,
    issue_type: row.issue_type,
    recommendation: row.recommendation,
    file_size_kb: row.file_size_kb,
    created_at: row.created_at,
  }));
}

export async function countImageIssues(companyId: string): Promise<number> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return 0;

  const { count } = await admin.client
    .from("seo_image_issues")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  return count ?? 0;
}

export async function listPageKeywords(pageId: string): Promise<SeoKeyword[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("seo_keywords")
    .select("*")
    .eq("page_id", pageId);

  return (data ?? []).map((row) => ({
    id: row.id,
    page_id: row.page_id,
    company_id: row.company_id,
    keyword: row.keyword,
    is_primary: Boolean(row.is_primary),
    in_title: Boolean(row.in_title),
    in_url: Boolean(row.in_url),
    in_meta_description: Boolean(row.in_meta_description),
    in_first_paragraph: Boolean(row.in_first_paragraph),
    in_headings: Boolean(row.in_headings),
    in_image_alt: Boolean(row.in_image_alt),
    in_conclusion: Boolean(row.in_conclusion),
    density_percent: Number(row.density_percent ?? 0),
    recommendations: (row.recommendations as string[]) ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function addPageKeyword(
  pageId: string,
  companyId: string,
  keyword: string,
  isPrimary = false
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.client.from("seo_keywords").insert({
    page_id: pageId,
    company_id: companyId,
    keyword: keyword.trim(),
    is_primary: isPrimary,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
