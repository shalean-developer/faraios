import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { ConnectedWebsite, Website } from "@/types/database";
import type { WebsiteConnectionStatus, WebsiteMode } from "@/lib/websites/status";
import type { WebsiteDomain, WebsiteDeployment } from "@/types/website-engine";
import { getWebsiteDomainsForCompany } from "./website-domains";
import { getConnectedWebsiteForCompany } from "./connected-websites";

export type BusinessWebProperty = {
  id: string;
  companyId: string;
  name: string;
  mode: WebsiteMode;
  status: WebsiteConnectionStatus;
  primaryDomain: string | null;
  previewSubdomain: string | null;
  hostingProvider: string | null;
  bookingEnabled: boolean;
  trackingEnabled: boolean;
  seoEnabled: boolean;
  websiteId: string | null;
  connectedWebsiteId: string | null;
  legacyStatus?: string;
  createdAt: string;
};

function mapHostedWebsite(website: Website): BusinessWebProperty {
  return {
    id: website.id,
    companyId: website.client_id,
    name: website.name,
    mode: "hosted",
    status: (website as Website & { connection_status?: WebsiteConnectionStatus })
      .connection_status ?? (website.status === "published" ? "live" : "draft"),
    primaryDomain: website.domain,
    previewSubdomain:
      (website as Website & { preview_subdomain?: string }).preview_subdomain ??
      (website.subdomain ? `${website.subdomain}.faraios.com` : null),
    hostingProvider:
      (website as Website & { hosting_provider?: string }).hosting_provider ?? null,
    bookingEnabled:
      (website as Website & { booking_enabled?: boolean }).booking_enabled ?? true,
    trackingEnabled:
      (website as Website & { tracking_enabled?: boolean }).tracking_enabled ?? true,
    seoEnabled:
      (website as Website & { seo_connection_enabled?: boolean }).seo_connection_enabled ??
      false,
    websiteId: website.id,
    connectedWebsiteId: null,
    legacyStatus: website.status,
    createdAt: website.created_at,
  };
}

function mapConnectedWebsite(cw: ConnectedWebsite): BusinessWebProperty {
  const ext = cw as ConnectedWebsite & {
    name?: string | null;
    status?: WebsiteConnectionStatus;
    primary_domain?: string | null;
    preview_subdomain?: string | null;
    hosting_provider?: string | null;
    booking_enabled?: boolean;
    tracking_enabled?: boolean;
    seo_enabled?: boolean;
    website_id?: string | null;
  };

  return {
    id: cw.id,
    companyId: cw.company_id,
    name: ext.name ?? "External website",
    mode: cw.type === "hosted" ? "hosted" : "external",
    status: ext.status ?? (cw.production_url ? "connected" : "draft"),
    primaryDomain: ext.primary_domain ?? null,
    previewSubdomain: ext.preview_subdomain ?? null,
    hostingProvider: ext.hosting_provider ?? null,
    bookingEnabled: ext.booking_enabled ?? true,
    trackingEnabled: ext.tracking_enabled ?? true,
    seoEnabled: ext.seo_enabled ?? false,
    websiteId: ext.website_id ?? null,
    connectedWebsiteId: cw.id,
    createdAt: cw.created_at,
  };
}

export async function listBusinessWebProperties(
  companyId: string
): Promise<BusinessWebProperty[]> {
  if (!isSupabaseConfigured() || !companyId) return [];

  const supabase = await createClient();

  const [{ data: websites }, connected] = await Promise.all([
    supabase
      .from("websites")
      .select("*")
      .eq("client_id", companyId)
      .order("created_at", { ascending: false }),
    getConnectedWebsiteForCompany(companyId),
  ]);

  const properties: BusinessWebProperty[] = [];

  if (connected?.production_url || connected?.type === "external") {
    properties.push(mapConnectedWebsite(connected));
  }

  for (const w of (websites ?? []) as Website[]) {
    properties.push(mapHostedWebsite(w));
  }

  return properties;
}

export async function getWebsiteDeployments(
  websiteId: string
): Promise<WebsiteDeployment[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_deployments")
    .select("*")
    .eq("website_id", websiteId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[website_deployments] getWebsiteDeployments", error.message);
    return [];
  }

  return (data ?? []) as WebsiteDeployment[];
}

export async function getPrimaryDomainForCompany(
  companyId: string
): Promise<WebsiteDomain | null> {
  const domains = await getWebsiteDomainsForCompany(companyId);
  return domains.find((d) => d.is_primary) ?? domains[0] ?? null;
}

export async function recordApiKeyEvent(input: {
  companyId: string;
  eventType: "generated" | "rotated" | "revoked" | "used";
  keyPrefix?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  await admin.client.from("business_api_key_events").insert({
    company_id: input.companyId,
    event_type: input.eventType,
    key_prefix: input.keyPrefix ?? null,
    metadata: input.metadata ?? {},
  });
}
