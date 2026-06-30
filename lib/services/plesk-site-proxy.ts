import { getPleskCredentials } from "@/lib/hosting/plesk/config";
import {
  getFaraiosPleskAppOrigin,
  isFaraiosPleskProxyEnabled,
} from "@/lib/hosting/plesk/pleskProxyConfig";
import { ensurePleskComplementarySiteAlias } from "@/lib/hosting/plesk/pleskSiteAliases";
import { setPleskWebspaceReverseProxy } from "@/lib/hosting/plesk/pleskSiteProxy";
import { domainsMatchForHosting } from "@/lib/hosting/plesk/dnsSyncUtils";
import { ensureCustomDomainOnVercel } from "@/lib/services/vercel-custom-domain";
import { ensureTenantSubdomainOnVercel } from "@/lib/services/vercel-tenant-domain";
import { tenantSubdomainHost } from "@/lib/services/website-public-url";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { normalizeDomain } from "@/lib/utils/normalize-domain";

export type WireFaraiosSiteResult =
  | { ok: true; origin: string; domain: string; proxyMethod?: string }
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

async function resolveTenantSubdomainForCompany(companyId: string): Promise<{
  slug: string | null;
  host: string | null;
}> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { slug: null, host: null };

  const { data: websites } = await admin.client
    .from("websites")
    .select("subdomain, status")
    .eq("client_id", companyId)
    .order("created_at", { ascending: false });

  const target =
    websites?.find((row) => row.status === "published") ?? websites?.[0];
  const slug = target?.subdomain ? String(target.subdomain).trim() : null;
  if (!slug) return { slug: null, host: null };

  return { slug, host: tenantSubdomainHost(slug) };
}

/** Register Vercel domains and sync website.domain before FTP proxy deploy. */
async function preparePleskDomainOnVercel(
  companyId: string,
  domain: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await syncWebsiteDomainForCompany(companyId, domain);

  const { slug, host } = await resolveTenantSubdomainForCompany(companyId);
  if (slug) {
    const tenantResult = await ensureTenantSubdomainOnVercel(slug);
    if (!tenantResult.ok) {
      return { ok: false, error: tenantResult.error };
    }
    if ("domain" in tenantResult) {
      console.info("[plesk-site-proxy] tenant subdomain on Vercel", tenantResult.domain);
    }
  } else if (!host) {
    console.warn("[plesk-site-proxy] no website subdomain for PHP-tenant fallback", domain);
  }

  const vercelResult = await ensureCustomDomainOnVercel(domain);
  if (!vercelResult.ok) {
    return { ok: false, error: vercelResult.error };
  }
  if ("domains" in vercelResult) {
    console.info("[plesk-site-proxy] custom domains on Vercel", vercelResult.domains.join(", "));
  }

  return { ok: true };
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

  const prepResult = await preparePleskDomainOnVercel(service.company_id as string, domain);
  if (!prepResult.ok) {
    return { ok: false, error: prepResult.error };
  }

  const aliasResult = await ensurePleskComplementarySiteAlias(creds, {
    siteId: service.plesk_subscription_id as string,
    primaryDomain: domain,
    serverId: (service.server_id as string | null) ?? undefined,
    serviceId: service.id as string,
    companyId: service.company_id as string,
  });
  if (!aliasResult.ok) {
    console.warn("[plesk-site-proxy] site alias setup failed", domain, aliasResult.error);
  }

  const { host: tenantSubdomainHostValue } = await resolveTenantSubdomainForCompany(
    service.company_id as string
  );

  const proxyResult = await setPleskWebspaceReverseProxy(creds, {
    siteId: service.plesk_subscription_id as string,
    domain,
    originUrl: origin,
    tenantSubdomainHost: tenantSubdomainHostValue,
    serverId: (service.server_id as string | null) ?? undefined,
    serviceId: service.id as string,
    companyId: service.company_id as string,
  });

  if (!proxyResult.ok) {
    return { ok: false, error: proxyResult.error };
  }

  return {
    ok: true,
    origin,
    domain,
    proxyMethod: proxyResult.property,
  };
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
