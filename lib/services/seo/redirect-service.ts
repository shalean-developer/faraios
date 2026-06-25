import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { SeoRedirect } from "@/types/seo-v10";

export async function listRedirects(projectId: string): Promise<SeoRedirect[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("seo_redirects")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (data ?? []).map(mapRedirect);
}

function mapRedirect(row: Record<string, unknown>): SeoRedirect {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    company_id: row.company_id as string,
    source_url: row.source_url as string,
    destination_url: (row.destination_url as string) ?? null,
    status_code: row.status_code as number,
    hits: (row.hits as number) ?? 0,
    last_visit_at: (row.last_visit_at as string) ?? null,
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function createRedirect(input: {
  projectId: string;
  companyId: string;
  sourceUrl: string;
  destinationUrl: string | null;
  statusCode: number;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { data, error } = await admin.client
    .from("seo_redirects")
    .insert({
      project_id: input.projectId,
      company_id: input.companyId,
      source_url: input.sourceUrl,
      destination_url: input.destinationUrl,
      status_code: input.statusCode,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Create failed" };
  return { ok: true, id: data.id };
}

export async function updateRedirect(
  id: string,
  updates: Partial<Pick<SeoRedirect, "destination_url" | "status_code" | "is_active">>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.client
    .from("seo_redirects")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteRedirect(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.client.from("seo_redirects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function exportRedirectsCsv(redirects: SeoRedirect[]): string {
  const header = "source_url,destination_url,status_code,is_active";
  const rows = redirects.map(
    (r) =>
      `"${r.source_url}","${r.destination_url ?? ""}",${r.status_code},${r.is_active}`
  );
  return [header, ...rows].join("\n");
}

export function parseRedirectsCsv(csv: string): {
  sourceUrl: string;
  destinationUrl: string;
  statusCode: number;
}[] {
  const lines = csv.trim().split("\n").slice(1);
  return lines
    .map((line) => {
      const parts = line.match(/("([^"]|"")*"|[^,]+)/g);
      if (!parts || parts.length < 3) return null;
      const source = parts[0].replace(/^"|"$/g, "");
      const dest = parts[1].replace(/^"|"$/g, "");
      const code = parseInt(parts[2], 10);
      if (!source || isNaN(code)) return null;
      return { sourceUrl: source, destinationUrl: dest, statusCode: code };
    })
    .filter(Boolean) as { sourceUrl: string; destinationUrl: string; statusCode: number }[];
}

export async function countRedirectIssues(projectId: string): Promise<number> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return 0;

  const { count } = await admin.client
    .from("seo_redirects")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("is_active", true)
    .is("destination_url", null);

  return count ?? 0;
}
