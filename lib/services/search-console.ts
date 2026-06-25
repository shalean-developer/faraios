import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import {
  getSearchConsoleOAuthCredentials,
  getSearchConsoleOAuthRedirectUri,
  isSearchConsoleOAuthConfigured,
} from "@/lib/services/search-console-config";

export type SearchConsoleConnection = {
  id: string;
  companyId: string;
  siteUrl: string;
  propertyUrl: string | null;
  connectedAt: string;
  lastSyncedAt: string | null;
};

export type SearchConsoleMetricsSummary = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  topQueries: { query: string; clicks: number; impressions: number }[];
  periodDays: number;
};

/** Sync check for env vars only (tests / quick client hints). */
export function isSearchConsoleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim()
  );
}

export { isSearchConsoleOAuthConfigured };

export async function searchConsoleConnectUrl(companyId: string): Promise<string | null> {
  const creds = await getSearchConsoleOAuthCredentials();
  const redirectUri = getSearchConsoleOAuthRedirectUri();
  if (!creds || !redirectUri) return null;

  const state = Buffer.from(JSON.stringify({ companyId })).toString("base64url");

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function getSearchConsoleConnection(
  companyId: string
): Promise<SearchConsoleConnection | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_search_console_connections")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    companyId,
    siteUrl: data.site_url as string,
    propertyUrl: (data.property_url as string) ?? null,
    connectedAt: data.connected_at as string,
    lastSyncedAt: (data.last_synced_at as string) ?? null,
  };
}

export async function getSearchConsoleMetricsSummary(
  companyId: string,
  days = 28
): Promise<SearchConsoleMetricsSummary | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("seo_search_metrics")
    .select("*")
    .eq("company_id", companyId)
    .gte("metric_date", since.toISOString().slice(0, 10))
    .order("metric_date", { ascending: false });

  if (error || !data?.length) return null;

  let clicks = 0;
  let impressions = 0;
  let positionSum = 0;
  const queryMap = new Map<string, { clicks: number; impressions: number }>();

  for (const row of data) {
    clicks += (row.clicks as number) ?? 0;
    impressions += (row.impressions as number) ?? 0;
    positionSum += Number(row.position ?? 0);

    const queries = (row.top_queries as { query?: string; clicks?: number; impressions?: number }[]) ?? [];
    for (const item of queries) {
      if (!item.query) continue;
      const existing = queryMap.get(item.query) ?? { clicks: 0, impressions: 0 };
      queryMap.set(item.query, {
        clicks: existing.clicks + (item.clicks ?? 0),
        impressions: existing.impressions + (item.impressions ?? 0),
      });
    }
  }

  const topQueries = [...queryMap.entries()]
    .map(([query, stats]) => ({ query, ...stats }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: data.length > 0 ? positionSum / data.length : 0,
    topQueries,
    periodDays: days,
  };
}
