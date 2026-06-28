import { promises as dns } from "dns";

import { normalizeDomain } from "@/lib/utils/normalize-domain";

import { getHostingProvider } from "@/lib/hosting/providers";
import type { DnsRecordType } from "@/lib/hosting/providers";
import { getPleskHostingTarget } from "@/lib/hosting/plesk/target";
import { syncHostingSubscriptionFromWebsiteDomain } from "@/lib/services/hosting-domain";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type {
  WebsiteDnsRecord,
  WebsiteDomain,
} from "@/types/website-engine";

export async function getWebsiteDomainsForCompany(
  companyId: string
): Promise<WebsiteDomain[]> {
  if (!isSupabaseConfigured() || !companyId) return [];

  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data, error } = await admin.client
    .from("website_domains")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[website_domains] getWebsiteDomainsForCompany", error.message);
    return [];
  }

  return (data ?? []) as WebsiteDomain[];
}

export async function getDnsRecordsForDomain(
  websiteDomainId: string
): Promise<WebsiteDnsRecord[]> {
  if (!isSupabaseConfigured() || !websiteDomainId) return [];

  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data, error } = await admin.client
    .from("website_dns_records")
    .select("*")
    .eq("website_domain_id", websiteDomainId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[website_dns_records] getDnsRecordsForDomain", error.message);
    return [];
  }

  return (data ?? []) as WebsiteDnsRecord[];
}

async function verifyDnsRecord(
  domain: string,
  recordType: DnsRecordType,
  host: string,
  expectedValue: string
): Promise<boolean> {
  const lookupDomain = host === "@" ? domain : `${host}.${domain}`;

  try {
    if (recordType === "TXT") {
      const records = await dns.resolveTxt(lookupDomain);
      const flat = records.map((r) => r.join("")).join("");
      return flat.includes(expectedValue.replace(/"/g, ""));
    }
    if (recordType === "CNAME") {
      const records = await dns.resolveCname(lookupDomain);
      return records.some(
        (r) => r.toLowerCase().replace(/\.$/, "") === expectedValue.toLowerCase().replace(/\.$/, "")
      );
    }
    if (recordType === "A") {
      const records = await dns.resolve4(lookupDomain);
      return records.includes(expectedValue);
    }
  } catch {
    return false;
  }
  return false;
}

async function getPublicNameservers(domain: string): Promise<string[]> {
  try {
    return await dns.resolveNs(domain);
  } catch {
    return [];
  }
}

function normalizeNameserver(value: string): string {
  return value.toLowerCase().replace(/\.$/, "");
}

function usesExternalDns(publicNs: string[], pleskNs: string[]): boolean {
  if (!publicNs.length || !pleskNs.length) return false;
  const pleskSet = new Set(pleskNs.map(normalizeNameserver));
  return publicNs.some((ns) => !pleskSet.has(normalizeNameserver(ns)));
}

export function buildExternalDnsTxtHint(
  nameservers: string[]
): string {
  const nsList = nameservers.join(", ");
  return `This domain uses external DNS (${nsList}). Add the _faraios TXT record at that DNS provider. Plesk DNS sync does not publish records when nameservers point elsewhere.`;
}

export async function verifyWebsiteDomain(
  websiteDomainId: string,
  companyId: string
): Promise<{ ok: boolean; verified: boolean; error?: string; hint?: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, verified: false, error: "Server not configured." };
  }

  const { data: domainRow, error: domainError } = await admin.client
    .from("website_domains")
    .select("*")
    .eq("id", websiteDomainId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (domainError || !domainRow) {
    return { ok: false, verified: false, error: "Domain not found." };
  }

  const { data: records } = await admin.client
    .from("website_dns_records")
    .select("*")
    .eq("website_domain_id", websiteDomainId);

  const dnsRecords = (records ?? []) as WebsiteDnsRecord[];
  const now = new Date().toISOString();
  let allVerified = dnsRecords.length > 0;
  let hint: string | undefined;

  for (const record of dnsRecords) {
    const verified = await verifyDnsRecord(
      domainRow.domain,
      record.record_type,
      record.host,
      record.value
    );

    await admin.client
      .from("website_dns_records")
      .update({
        status: verified ? "verified" : "failed",
        last_checked_at: now,
      })
      .eq("id", record.id);

    if (!verified) {
      allVerified = false;
      if (
        !hint &&
        record.record_type === "TXT" &&
        record.host === "_faraios"
      ) {
        const publicNs = await getPublicNameservers(domainRow.domain);
        const pleskTarget = await getPleskHostingTarget({ companyId });
        if (usesExternalDns(publicNs, pleskTarget?.nameservers ?? [])) {
          hint = buildExternalDnsTxtHint(publicNs);
        }
      }
    }
  }

  const verificationStatus = allVerified ? "verified" : "pending";
  let sslStatus =
    allVerified && domainRow.ssl_status === "not_started" ? "pending" : domainRow.ssl_status;

  await admin.client
    .from("website_domains")
    .update({
      verification_status: verificationStatus,
      ssl_status: sslStatus,
      last_checked_at: now,
      updated_at: now,
    })
    .eq("id", websiteDomainId);

  if (allVerified && domainRow.hosting_provider) {
    const provider = getHostingProvider(domainRow.hosting_provider);
    const status = await provider.checkStatus({
      providerDomainId: domainRow.provider_domain_id ?? undefined,
      domain: domainRow.domain,
      companyId,
    });
    if (status.sslStatus === "active") {
      sslStatus = "active";
      await admin.client
        .from("website_domains")
        .update({ ssl_status: "active", updated_at: now })
        .eq("id", websiteDomainId);
    }
  }

  await syncHostingSubscriptionFromWebsiteDomain(
    companyId,
    domainRow.domain,
    verificationStatus,
    sslStatus
  );

  return { ok: true, verified: allVerified, hint };
}

export async function seedDnsRecordsForDomain(
  websiteDomainId: string,
  dnsRecords: { recordType: DnsRecordType; host: string; value: string }[]
): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  await admin.client
    .from("website_dns_records")
    .delete()
    .eq("website_domain_id", websiteDomainId);

  if (!dnsRecords.length) return;

  await admin.client.from("website_dns_records").insert(
    dnsRecords.map((r) => ({
      website_domain_id: websiteDomainId,
      record_type: r.recordType,
      host: r.host,
      value: r.value,
      status: "pending",
    }))
  );
}

export { normalizeDomain } from "@/lib/utils/normalize-domain";
