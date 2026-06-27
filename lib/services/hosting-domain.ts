import { getHostingProvider } from "@/lib/hosting/providers";
import { getDefaultHostingProviderSlug } from "@/lib/hosting/constants";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { WebsiteDnsRecord, WebsiteDomain, WebsiteDomainType } from "@/types/website-engine";

import {
  getDnsRecordsForDomain,
  normalizeDomain,
  seedDnsRecordsForDomain,
} from "./website-domains";

type ProvisionInput = {
  companyId: string;
  domain: string;
  hostingProvider?: string;
  domainType?: WebsiteDomainType;
  websiteId?: string | null;
  connectedWebsiteId?: string | null;
  isPrimary?: boolean;
  syncHostingSubscription?: boolean;
};

type ProvisionResult =
  | { ok: true; websiteDomainId: string }
  | { ok: false; error: string };

export function mapWebsiteDomainToHostingStatus(
  verificationStatus: string,
  sslStatus: string
): { domain_status: "pending" | "verified" | "failed"; ssl_status: "pending" | "active" | "failed" } {
  const domain_status =
    verificationStatus === "verified"
      ? "verified"
      : verificationStatus === "failed"
        ? "failed"
        : "pending";

  const ssl_status =
    sslStatus === "active" ? "active" : sslStatus === "failed" ? "failed" : "pending";

  return { domain_status, ssl_status };
}

export async function syncHostingSubscriptionFromWebsiteDomain(
  companyId: string,
  domain: string,
  verificationStatus: string,
  sslStatus: string
): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  const normalized = normalizeDomain(domain);
  const { domain_status, ssl_status } = mapWebsiteDomainToHostingStatus(
    verificationStatus,
    sslStatus
  );

  await admin.client
    .from("hosting_subscriptions")
    .update({
      custom_domain: normalized,
      domain_status,
      ssl_status,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("status", "active")
    .ilike("custom_domain", normalized);
}

export async function getHostingDomainContext(
  companyId: string,
  customDomain: string | null | undefined
): Promise<{ domain: WebsiteDomain | null; dnsRecords: WebsiteDnsRecord[] }> {
  if (!isSupabaseConfigured() || !companyId || !customDomain?.trim()) {
    return { domain: null, dnsRecords: [] };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { domain: null, dnsRecords: [] };

  const normalized = normalizeDomain(customDomain);
  const { data, error } = await admin.client
    .from("website_domains")
    .select("*")
    .eq("company_id", companyId)
    .ilike("domain", normalized)
    .maybeSingle();

  if (error || !data) {
    return { domain: null, dnsRecords: [] };
  }

  const domain = data as WebsiteDomain;
  const dnsRecords = await getDnsRecordsForDomain(domain.id);
  return { domain, dnsRecords };
}

export async function ensureHostingDomainProvisioned(
  companyId: string,
  customDomain: string
): Promise<ProvisionResult | { ok: true; skipped: true }> {
  const normalized = normalizeDomain(customDomain);
  if (!normalized) {
    return { ok: false, error: "Invalid domain." };
  }

  const existing = await getHostingDomainContext(companyId, normalized);
  if (existing.domain) {
    return { ok: true, skipped: true };
  }

  return provisionCompanyWebsiteDomain({
    companyId,
    domain: normalized,
    syncHostingSubscription: true,
    isPrimary: true,
  });
}

export async function provisionCompanyWebsiteDomain(
  input: ProvisionInput
): Promise<ProvisionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const normalized = normalizeDomain(input.domain);
  if (!normalized || !normalized.includes(".")) {
    return { ok: false, error: "Enter a valid domain." };
  }

  const provider = getHostingProvider(input.hostingProvider ?? getDefaultHostingProviderSlug());
  const connectResult = await provider.connectDomain({
    providerProjectId: `faraios-${input.companyId.slice(0, 8)}`,
    domain: normalized,
    companyId: input.companyId,
  });

  if (!connectResult.ok) {
    return { ok: false, error: connectResult.error };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: admin.error };
  }

  const { data: existingRow } = await admin.client
    .from("website_domains")
    .select("id, company_id, verification_token")
    .ilike("domain", normalized)
    .maybeSingle();

  if (existingRow && existingRow.company_id !== input.companyId) {
    return { ok: false, error: "This domain is already connected to another workspace." };
  }

  if (input.isPrimary ?? true) {
    await admin.client
      .from("website_domains")
      .update({ is_primary: false, updated_at: new Date().toISOString() })
      .eq("company_id", input.companyId);
  }

  let websiteDomainId: string;

  if (existingRow) {
    const { error: updateError } = await admin.client
      .from("website_domains")
      .update({
        domain: normalized,
        domain_type: input.domainType ?? "primary",
        website_id: input.websiteId ?? null,
        connected_website_id: input.connectedWebsiteId ?? null,
        verification_status: "pending",
        ssl_status: "not_started",
        hosting_provider: provider.slug,
        provider_domain_id: connectResult.providerDomainId,
        is_primary: input.isPrimary ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingRow.id);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }
    websiteDomainId = existingRow.id as string;
  } else {
    const { data: domainRow, error } = await admin.client
      .from("website_domains")
      .insert({
        company_id: input.companyId,
        website_id: input.websiteId ?? null,
        connected_website_id: input.connectedWebsiteId ?? null,
        domain: normalized,
        domain_type: input.domainType ?? "primary",
        verification_status: "pending",
        ssl_status: "not_started",
        hosting_provider: provider.slug,
        provider_domain_id: connectResult.providerDomainId,
        is_primary: input.isPrimary ?? true,
      })
      .select("id, verification_token")
      .single();

    if (error || !domainRow) {
      return { ok: false, error: error?.message ?? "Could not add domain." };
    }

    websiteDomainId = domainRow.id as string;
  }

  await seedDnsRecordsForDomain(websiteDomainId, connectResult.dnsRecords);

  const { data: tokenRow } = await admin.client
    .from("website_domains")
    .select("verification_token")
    .eq("id", websiteDomainId)
    .maybeSingle();

  if (tokenRow?.verification_token) {
    const { data: existingTxt } = await admin.client
      .from("website_dns_records")
      .select("id")
      .eq("website_domain_id", websiteDomainId)
      .eq("host", "_faraios")
      .maybeSingle();

    if (!existingTxt) {
      await admin.client.from("website_dns_records").insert({
        website_domain_id: websiteDomainId,
        record_type: "TXT",
        host: "_faraios",
        value: `faraios-verify=${tokenRow.verification_token}`,
        status: "pending",
      });
    }
  }

  await admin.client.from("connected_websites").upsert(
    {
      company_id: input.companyId,
      primary_domain: normalized,
      hosting_provider: provider.slug,
      status: "verification_pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  if (input.syncHostingSubscription) {
    await admin.client
      .from("hosting_subscriptions")
      .update({
        custom_domain: normalized,
        domain_status: "pending",
        ssl_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", input.companyId)
      .eq("status", "active");
  }

  return { ok: true, websiteDomainId };
}
