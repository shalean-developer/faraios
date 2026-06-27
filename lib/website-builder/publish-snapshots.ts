import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { PublishSnapshotSummary } from "@/types/website-builder-settings";

/** Returns publish snapshots when `website_page_versions` exists; otherwise an empty list. */
export async function listPublishSnapshots(
  websiteId: string
): Promise<PublishSnapshotSummary[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data, error } = await admin.client
    .from("website_page_versions")
    .select("id, published_at, status, page_count")
    .eq("website_id", websiteId)
    .order("published_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    publishedAt: (row.published_at as string) ?? "",
    status: (row.status as string) ?? "published",
    pageCount: typeof row.page_count === "number" ? row.page_count : 0,
  }));
}
