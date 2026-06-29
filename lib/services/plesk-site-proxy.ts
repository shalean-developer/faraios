import { getPleskCredentials } from "@/lib/hosting/plesk/config";
import {
  getFaraiosPleskAppOrigin,
  isFaraiosPleskProxyEnabled,
} from "@/lib/hosting/plesk/pleskProxyConfig";
import { setPleskWebspaceReverseProxy } from "@/lib/hosting/plesk/pleskSiteProxy";
import { domainsMatchForHosting } from "@/lib/hosting/plesk/dnsSyncUtils";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { normalizeDomain } from "@/lib/utils/normalize-domain";

export type WireFaraiosSiteResult =
  | { ok: true; origin: string; domain: string }
  | { ok: true; skipped: true; reason: "proxy_disabled" | "no_origin" | "no_service" }
  | { ok: false; error: string };

async function syncWebsiteDomainForCompany(
  companyId: string,
  domain: string
): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  const normalized = normalizeDomain(domain);
  if (!normalized) return;

  const { data: websites } = await admin.client
    .from("websites")
    .select("id, domain, status")
    .eq("client_id", companyId)
    .order("created_at", { ascending: false });

  const target =
    websites?.find((row) => row.status === "published") ?? websites?.[0];

  if (!target?.id) return;

  const currentDomain = target.domain ? normalizeDomain(String(target.domain)) : null;
  if (currentDomain && currentDomain !== normalized) return;

  await admin.client.from("websites").update({ domain: normalized }).eq("id", target.id);
}

export async function wireHostingServiceToFaraiosApp(
  serviceId: string
): Promise<WireFaraiosSiteResult> {
  if (!isFaraiosPleskProxyEnabled()) {
    return { ok: true, skipped: true, reason: "proxy_disabled" };
  }

  const origin = getFaraiosPleskAppOrigin();
  if (!origin) {
    return { ok: true, skipped: true, reason: "no_origin" };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: admin.error };
  }

  const { data: service, error } = await admin.client
    .from("hosting_services")
    .select("id, company_id, domain_name, server_id, plesk_subscription_id, status")
    .eq("id", serviceId)
    .maybeSingle();

  if (error || !service) {
    return { ok: false, error: error?.message ?? "Hosting service not found." };
  }

  if (service.status !== "active" || !service.plesk_subscription_id) {
    return {
      ok: false,
      error: "Service is not active or not provisioned in Plesk.",
    };
  }

  const domain = normalizeDomain(String(service.domain_name ?? ""));
  if (!domain) {
    return { ok: false, error: "Hosting service has no domain name." };
  }

  const creds = await getPleskCredentials(service.server_id as string | null);
  if (!creds) {
    return { ok: false, error: "Plesk credentials not configured." };
  }

  const proxyResult = await setPleskWebspaceReverseProxy(creds, {
    siteId: service.plesk_subscription_id as string,
    domain,
    originUrl: origin,
    serverId: (service.server_id as string | null) ?? undefined,
    serviceId: service.id as string,
    companyId: service.company_id as string,
  });

  if (!proxyResult.ok) {
    return { ok: false, error: proxyResult.error };
  }

  await syncWebsiteDomainForCompany(service.company_id as string, domain);

  return { ok: true, origin, domain };
}

export async function wireCompanyDomainToFaraiosApp(input: {
  companyId: string;
  domain: string;
}): Promise<WireFaraiosSiteResult> {
  const normalized = normalizeDomain(input.domain);
  if (!normalized) {
    return { ok: false, error: "Invalid domain." };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: admin.error };
  }

  const { data: services } = await admin.client
    .from("hosting_services")
    .select("id, domain_name, status, plesk_subscription_id")
    .eq("company_id", input.companyId)
    .eq("status", "active")
    .not("plesk_subscription_id", "is", null)
    .order("created_at", { ascending: false });

  const match = (services ?? []).find((row) =>
    domainsMatchForHosting(String(row.domain_name ?? ""), normalized)
  );

  if (!match?.id) {
    return { ok: true, skipped: true, reason: "no_service" };
  }

  return wireHostingServiceToFaraiosApp(match.id as string);
}
