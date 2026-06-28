import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { decryptHostingSecret, encryptHostingSecret } from "@/lib/hosting/plesk/secrets";
import { defaultXmlEndpoint } from "@/lib/hosting/plesk/pleskXmlClient";
import type { PleskCredentials } from "@/lib/hosting/plesk/pleskTypes";
import type { AdminHostingSettings, HostingServerRow } from "@/types/hosting-automation";

export type { PleskCredentials };

function credentialsFromEnv(): PleskCredentials | null {
  const url = process.env.PLESK_API_URL?.trim();
  const username = process.env.PLESK_API_USERNAME?.trim();
  const secret =
    process.env.PLESK_API_SECRET?.trim() ?? process.env.PLESK_API_PASSWORD?.trim();
  if (!url || !username || !secret) return null;

  const xmlEndpoint =
    process.env.PLESK_XML_API_ENDPOINT?.trim() || defaultXmlEndpoint(url);

  const nameservers = (process.env.PLESK_DEFAULT_NAMESERVERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    url: url.replace(/\/$/, ""),
    xmlEndpoint,
    username,
    secret,
    defaultNameservers: nameservers,
  };
}

async function credentialsFromPlatformSettings(): Promise<PleskCredentials | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("platform_settings")
    .select("integration_settings")
    .eq("id", 1)
    .maybeSingle();

  const settings = (data?.integration_settings as Record<string, unknown>) ?? {};
  const plesk = settings.plesk as Record<string, unknown> | undefined;
  const url = typeof plesk?.url === "string" ? plesk.url.trim() : "";
  const username = typeof plesk?.username === "string" ? plesk.username.trim() : "";
  const secret = typeof plesk?.secret === "string" ? plesk.secret.trim() : "";
  if (!url || !username || !secret) return null;

  const xmlEndpoint =
    typeof plesk?.xml_endpoint === "string" && plesk.xml_endpoint
      ? plesk.xml_endpoint
      : defaultXmlEndpoint(url);

  const nameservers = Array.isArray(plesk?.default_nameservers)
    ? (plesk.default_nameservers as string[]).filter(Boolean)
    : [];

  return {
    url: url.replace(/\/$/, ""),
    xmlEndpoint,
    username,
    secret,
    defaultNameservers: nameservers,
  };
}

function credentialsFromServerRow(server: HostingServerRow): PleskCredentials | null {
  const username = server.api_username?.trim();
  const encrypted = server.api_secret_encrypted?.trim();
  if (!username || !encrypted) return null;

  let secret: string;
  try {
    secret = decryptHostingSecret(encrypted);
  } catch {
    return null;
  }

  const url = server.plesk_url.replace(/\/$/, "");
  const xmlEndpoint = server.xml_api_endpoint?.trim() || defaultXmlEndpoint(url);

  return {
    url,
    xmlEndpoint,
    username,
    secret,
    serverId: server.id,
    defaultNameservers: server.default_nameservers ?? [],
  };
}

async function credentialsFromDefaultServer(): Promise<PleskCredentials | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data: defaultServer } = await admin.client
    .from("hosting_servers")
    .select("*")
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();

  if (!defaultServer) return null;
  return credentialsFromServerRow(defaultServer as HostingServerRow);
}

async function credentialsFromServerId(
  serverId: string
): Promise<PleskCredentials | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data: server } = await admin.client
    .from("hosting_servers")
    .select("*")
    .eq("id", serverId)
    .eq("is_active", true)
    .maybeSingle();

  if (!server) return null;
  return credentialsFromServerRow(server as HostingServerRow);
}

export async function getPleskCredentials(serverId?: string | null): Promise<PleskCredentials | null> {
  if (serverId) {
    const fromServer = await credentialsFromServerId(serverId);
    if (fromServer) return fromServer;
  }

  const fromDefaultServer = await credentialsFromDefaultServer();
  if (fromDefaultServer) return fromDefaultServer;

  const fromDb = await credentialsFromPlatformSettings();
  if (fromDb) return fromDb;

  return credentialsFromEnv();
}

export function encryptServerSecret(secret: string): string {
  return encryptHostingSecret(secret);
}

export async function getAdminHostingSettings(): Promise<AdminHostingSettings> {
  const env = credentialsFromEnv();
  if (env) {
    return {
      pleskUrl: env.url,
      pleskUsername: env.username,
      hasPleskSecret: true,
      xmlApiEndpoint: env.xmlEndpoint,
      defaultServerId: process.env.PLESK_DEFAULT_SERVER_ID?.trim() || null,
      defaultNameservers: env.defaultNameservers,
      welcomeEmailTemplate:
        process.env.PLESK_WELCOME_EMAIL_TEMPLATE?.trim() ??
        "Your FaraiOS hosting account is ready.",
      configured: true,
      source: "env",
      apiType: "xml",
      lastConnectionStatus: null,
    };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return {
      pleskUrl: "",
      pleskUsername: "",
      hasPleskSecret: false,
      xmlApiEndpoint: "",
      defaultServerId: null,
      defaultNameservers: [],
      welcomeEmailTemplate: "Your FaraiOS hosting account is ready.",
      configured: false,
      source: "none",
      apiType: "xml",
      lastConnectionStatus: null,
    };
  }

  const { data } = await admin.client
    .from("platform_settings")
    .select("integration_settings")
    .eq("id", 1)
    .maybeSingle();

  const settings = (data?.integration_settings as Record<string, unknown>) ?? {};
  const plesk = settings.plesk as Record<string, unknown> | undefined;
  const url = typeof plesk?.url === "string" ? plesk.url : "";

  const { data: defaultServer } = await admin.client
    .from("hosting_servers")
    .select("last_connection_status, last_connection_at, last_connection_message")
    .eq("is_default", true)
    .maybeSingle();

  return {
    pleskUrl: url,
    pleskUsername: typeof plesk?.username === "string" ? plesk.username : "",
    hasPleskSecret: typeof plesk?.secret === "string" && plesk.secret.length > 0,
    xmlApiEndpoint:
      typeof plesk?.xml_endpoint === "string"
        ? plesk.xml_endpoint
        : url
          ? defaultXmlEndpoint(url)
          : "",
    defaultServerId:
      typeof plesk?.default_server_id === "string" ? plesk.default_server_id : null,
    defaultNameservers: Array.isArray(plesk?.default_nameservers)
      ? (plesk.default_nameservers as string[])
      : [],
    welcomeEmailTemplate:
      typeof plesk?.welcome_email_template === "string"
        ? plesk.welcome_email_template
        : "Your FaraiOS hosting account is ready.",
    configured: Boolean(
      url &&
        typeof plesk?.username === "string" &&
        plesk.username &&
        typeof plesk?.secret === "string" &&
        plesk.secret
    ),
    source: "db",
    apiType: "xml",
    lastConnectionStatus: defaultServer?.last_connection_status ?? null,
    lastConnectionAt: defaultServer?.last_connection_at ?? null,
    lastConnectionMessage: defaultServer?.last_connection_message ?? null,
  };
}
