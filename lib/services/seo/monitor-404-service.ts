import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { Seo404Log } from "@/types/seo-v10";

function sanitizeReferrer(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname;
    return host.slice(0, 200);
  } catch {
    return null;
  }
}

function sanitizeUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  if (/bot|crawl|spider/i.test(ua)) return "bot";
  if (/chrome/i.test(ua)) return "chrome";
  if (/firefox/i.test(ua)) return "firefox";
  if (/safari/i.test(ua)) return "safari";
  return "other";
}

export async function log404Hit(input: {
  projectId: string;
  companyId: string;
  missingUrl: string;
  referrer?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  const referrerHost = sanitizeReferrer(input.referrer ?? null);
  const uaFamily = sanitizeUserAgent(input.userAgent ?? null);

  const { data: existing } = await admin.client
    .from("seo_404_logs")
    .select("id, occurrences")
    .eq("project_id", input.projectId)
    .eq("missing_url", input.missingUrl)
    .maybeSingle();

  if (existing) {
    await admin.client
      .from("seo_404_logs")
      .update({
        occurrences: (existing.occurrences ?? 1) + 1,
        last_seen_at: new Date().toISOString(),
        referrer_host: referrerHost,
        user_agent_family: uaFamily,
      })
      .eq("id", existing.id);
  } else {
    await admin.client.from("seo_404_logs").insert({
      project_id: input.projectId,
      company_id: input.companyId,
      missing_url: input.missingUrl,
      referrer_host: referrerHost,
      user_agent_family: uaFamily,
    });
  }
}

export async function list404Logs(projectId: string, limit = 50): Promise<Seo404Log[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("seo_404_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    project_id: row.project_id,
    company_id: row.company_id,
    missing_url: row.missing_url,
    referrer_host: row.referrer_host,
    user_agent_family: row.user_agent_family,
    occurrences: row.occurrences,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
  }));
}

export async function count404Issues(projectId: string): Promise<number> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return 0;

  const { count } = await admin.client
    .from("seo_404_logs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  return count ?? 0;
}

export async function clear404Log(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.client.from("seo_404_logs").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
