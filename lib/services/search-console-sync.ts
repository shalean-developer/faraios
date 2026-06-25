import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { getSearchConsoleOAuthCredentials } from "@/lib/services/search-console-config";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type SearchConsoleSyncResult = {
  connectionsProcessed: number;
  daysUpserted: number;
  errors: string[];
};

type GscRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

function formatGscDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const creds = await getSearchConsoleOAuthCredentials();
  if (!creds) return null;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const json = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !json.access_token) {
    console.error("[search-console-sync] token refresh", json.error ?? response.status);
    return null;
  }

  return json.access_token;
}

async function querySearchAnalytics(input: {
  accessToken: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions: string[];
  rowLimit?: number;
}): Promise<GscRow[]> {
  const encodedSite = encodeURIComponent(input.siteUrl);
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: input.startDate,
        endDate: input.endDate,
        dimensions: input.dimensions,
        rowLimit: input.rowLimit ?? 1000,
      }),
    }
  );

  const json = (await response.json()) as { rows?: GscRow[]; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(json.error?.message ?? `GSC query failed (${response.status})`);
  }

  return json.rows ?? [];
}

export async function syncSearchConsoleForCompany(input: {
  companyId: string;
  propertyUrl: string;
  refreshToken: string;
  lookbackDays?: number;
}): Promise<{ daysUpserted: number; error?: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { daysUpserted: 0, error: admin.error };

  const accessToken = await refreshAccessToken(input.refreshToken);
  if (!accessToken) {
    return { daysUpserted: 0, error: "Failed to refresh Google access token." };
  }

  const lookback = input.lookbackDays ?? 28;
  const endDate = formatGscDate(daysAgo(1));
  const startDate = formatGscDate(daysAgo(lookback));

  let dailyRows: GscRow[];
  let queryRows: GscRow[];

  try {
    [dailyRows, queryRows] = await Promise.all([
      querySearchAnalytics({
        accessToken,
        siteUrl: input.propertyUrl,
        startDate,
        endDate,
        dimensions: ["date"],
      }),
      querySearchAnalytics({
        accessToken,
        siteUrl: input.propertyUrl,
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 25,
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "GSC query failed";
    return { daysUpserted: 0, error: message };
  }

  const topQueries = queryRows
    .map((row) => ({
      query: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
    }))
    .filter((row) => row.query)
    .slice(0, 25);

  let daysUpserted = 0;
  let latestDate = endDate;

  for (const row of dailyRows) {
    const metricDate = row.keys?.[0];
    if (!metricDate) continue;
    if (metricDate > latestDate) latestDate = metricDate;

    const { error } = await admin.client.from("seo_search_metrics").upsert(
      {
        company_id: input.companyId,
        metric_date: metricDate,
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
        top_queries: [],
      },
      { onConflict: "company_id,metric_date" }
    );

    if (error) {
      return { daysUpserted, error: error.message };
    }

    daysUpserted += 1;
  }

  if (topQueries.length > 0) {
    const targetDate = dailyRows.length > 0 ? latestDate : endDate;
    const dayRow = dailyRows.find((row) => row.keys?.[0] === targetDate);
    const { error } = await admin.client.from("seo_search_metrics").upsert(
      {
        company_id: input.companyId,
        metric_date: targetDate,
        clicks:
          dayRow?.clicks ??
          queryRows.reduce((sum, row) => sum + (row.clicks ?? 0), 0),
        impressions:
          dayRow?.impressions ??
          queryRows.reduce((sum, row) => sum + (row.impressions ?? 0), 0),
        ctr: dayRow?.ctr ?? 0,
        position: dayRow?.position ?? 0,
        top_queries: topQueries,
      },
      { onConflict: "company_id,metric_date" }
    );
    if (error) return { daysUpserted, error: error.message };
    if (dailyRows.length === 0) daysUpserted = 1;
  }

  await admin.client
    .from("google_search_console_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("company_id", input.companyId);

  return { daysUpserted };
}

export async function syncSearchConsoleForAllCompanies(): Promise<SearchConsoleSyncResult> {
  const result: SearchConsoleSyncResult = {
    connectionsProcessed: 0,
    daysUpserted: 0,
    errors: [],
  };

  if (!isSupabaseConfigured()) return result;

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    result.errors.push(admin.error);
    return result;
  }

  const { data: connections, error } = await admin.client
    .from("google_search_console_connections")
    .select("company_id, property_url, site_url, refresh_token")
    .not("refresh_token", "is", null);

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  for (const row of connections ?? []) {
    const refreshToken = row.refresh_token as string | null;
    const propertyUrl = (row.property_url as string) || (row.site_url as string);
    if (!refreshToken || !propertyUrl) continue;

    result.connectionsProcessed += 1;
    const syncResult = await syncSearchConsoleForCompany({
      companyId: row.company_id as string,
      propertyUrl,
      refreshToken,
    });

    result.daysUpserted += syncResult.daysUpserted;
    if (syncResult.error) {
      result.errors.push(`${row.company_id}: ${syncResult.error}`);
    }
  }

  return result;
}
