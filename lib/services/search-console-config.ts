import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { AdminSearchConsoleIntegrationSettings } from "@/types/admin";

export type SearchConsoleOAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

function credentialsFromEnv(): SearchConsoleOAuthCredentials | null {
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

async function credentialsFromPlatformSettings(): Promise<SearchConsoleOAuthCredentials | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data, error } = await admin.client
    .from("platform_settings")
    .select("integration_settings")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return null;

  const settings = (data.integration_settings as Record<string, unknown>) ?? {};
  const gsc = settings.google_search_console as Record<string, unknown> | undefined;
  const clientId = typeof gsc?.client_id === "string" ? gsc.client_id.trim() : "";
  const clientSecret =
    typeof gsc?.client_secret === "string" ? gsc.client_secret.trim() : "";
  if (!clientId || !clientSecret) return null;

  return { clientId, clientSecret };
}

/** Resolves OAuth app credentials from env vars or platform admin settings. */
export async function getSearchConsoleOAuthCredentials(): Promise<SearchConsoleOAuthCredentials | null> {
  return credentialsFromEnv() ?? (await credentialsFromPlatformSettings());
}

export async function isSearchConsoleOAuthConfigured(): Promise<boolean> {
  const creds = await getSearchConsoleOAuthCredentials();
  return creds !== null;
}

export function getSearchConsoleOAuthRedirectUri(): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) return null;
  return `${appUrl}/api/integrations/google-search-console/callback`;
}

export async function getAdminSearchConsoleIntegrationSettings(): Promise<AdminSearchConsoleIntegrationSettings> {
  const redirectUri = getSearchConsoleOAuthRedirectUri();
  const envCreds = credentialsFromEnv();

  if (envCreds) {
    return {
      clientId: envCreds.clientId,
      hasClientSecret: true,
      redirectUri,
      configured: true,
      source: "env",
    };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { clientId: "", hasClientSecret: false, redirectUri, configured: false, source: "none" };
  }

  const { data } = await admin.client
    .from("platform_settings")
    .select("integration_settings")
    .eq("id", 1)
    .maybeSingle();

  const settings = (data?.integration_settings as Record<string, unknown>) ?? {};
  const gsc = settings.google_search_console as Record<string, unknown> | undefined;
  const clientId = typeof gsc?.client_id === "string" ? gsc.client_id.trim() : "";
  const hasClientSecret =
    typeof gsc?.client_secret === "string" && gsc.client_secret.trim().length > 0;

  return {
    clientId,
    hasClientSecret,
    redirectUri,
    configured: Boolean(clientId && hasClientSecret),
    source: clientId && hasClientSecret ? "database" : "none",
  };
}
