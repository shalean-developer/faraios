import { promises as dns } from "dns";

import { normalizeDomain } from "@/lib/utils/normalize-domain";

import { getHostingProvider } from "@/lib/hosting/providers";
import type { DnsRecordType } from "@/lib/hosting/providers";
import { getPleskHostingTarget } from "@/lib/hosting/plesk/target";
import { syncHostingSubscriptionFromWebsiteDomain } from "@/lib/services/hosting-domain";
import { pushWebsiteDomainDnsToPlesk } from "@/lib/services/plesk-website-dns-sync";
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
      const records = await withDnsTimeout(dns.resolveTxt(lookupDomain));
      if (!records) return false;
      const flat = records.map((r) => r.join("")).join("");
      return flat.includes(expectedValue.replace(/"/g, ""));
    }
    if (recordType === "CNAME") {
      const records = await withDnsTimeout(dns.resolveCname(lookupDomain));
      if (!records) return false;
      return records.some(
        (r) => r.toLowerCase().replace(/\.$/, "") === expectedValue.toLowerCase().replace(/\.$/, "")
      );
    }
    if (recordType === "A") {
      const records = await withDnsTimeout(dns.resolve4(lookupDomain));
      if (!records) return false;
      return records.includes(expectedValue);
    }
  } catch {
    return false;
  }
  return false;
}

async function getPublicNameservers(domain: string): Promise<string[]> {
  try {
    const records = await withDnsTimeout(dns.resolveNs(domain));
    return records ?? [];
  } catch {
    return [];
  }
}

function normalizeNameserver(value: string): string {
  return value.toLowerCase().replace(/\.$/, "");
}

const DNS_LOOKUP_TIMEOUT_MS = 5_000;

function withDnsTimeout<T>(promise: Promise<T>, timeoutMs = DNS_LOOKUP_TIMEOUT_MS): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
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

  const domain = domainRow as WebsiteDomain;

  if (domain.hosting_provider === "plesk") {
    const pushResult = await pushWebsiteDomainDnsToPlesk({
      companyId,
      domain: domain.domain,
      verificationToken: domain.verification_token ?? null,
    });
    if (!pushResult.ok) {
      console.warn(
        "[website_domains] Plesk DNS re-sync before verify failed",
        domain.domain,
        pushResult.error
      );
    }
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
      domain.domain,
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
        const publicNs = await getPublicNameservers(domain.domain);
        const pleskTarget = await getPleskHostingTarget({ companyId });
        if (usesExternalDns(publicNs, pleskTarget?.nameservers ?? [])) {
          hint = buildExternalDnsTxtHint(publicNs);
        }
      }
    }
  }

  const verificationStatus = allVerified ? "verified" : "pending";
  let sslStatus =
    allVerified && domain.ssl_status === "not_started" ? "pending" : domain.ssl_status;

  await admin.client
    .from("website_domains")
    .update({
      verification_status: verificationStatus,
      ssl_status: sslStatus,
      last_checked_at: now,
      updated_at: now,
    })
    .eq("id", websiteDomainId);

  if (allVerified && domain.hosting_provider) {
    const provider = getHostingProvider(domain.hosting_provider);
    const status = await withDnsTimeout(
      provider.checkStatus({
        providerDomainId: domain.provider_domain_id ?? undefined,
        domain: domain.domain,
        companyId,
      }),
      8_000
    );
    if (status?.sslStatus === "active") {
      sslStatus = "active";
      await admin.client
        .from("website_domains")
        .update({ ssl_status: "active", updated_at: now })
        .eq("id", websiteDomainId);
    }
  }

  await syncHostingSubscriptionFromWebsiteDomain(
    companyId,
    domain.domain,
    verificationStatus,
    sslStatus
  );

  let resultHint = hint;
  if (allVerified && sslStatus === "pending" && domain.hosting_provider === "plesk") {
    resultHint =
      "DNS verified. SSL stays pending until HTTPS is active on your domain — in Plesk open SSL/TLS Certificates and install Let's Encrypt (or wait for auto-issue), then click Verify DNS again.";
  }

  return { ok: true, verified: allVerified, hint: resultHint };
}

const AUTO_VERIFY_RETRY_DELAYS_MS = [0, 15_000, 30_000, 60_000, 120_000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Background DNS checks after connect or manual verify (handles propagation delay). */
export async function runAutoDomainVerificationWithRetries(
  websiteDomainId: string,
  companyId: string
): Promise<{ verified: boolean; attempts: number }> {
  let attempts = 0;

  for (const delayMs of AUTO_VERIFY_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    attempts += 1;
    const result = await verifyWebsiteDomain(websiteDomainId, companyId);
    if (!result.ok) {
      console.warn(
        "[website_domains] auto-verify attempt failed",
        websiteDomainId,
        result.error
      );
      continue;
    }

    if (result.verified) {
      console.info("[website_domains] auto-verify succeeded", websiteDomainId, {
        attempts,
      });
      return { verified: true, attempts };
    }
  }

  return { verified: false, attempts };
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

export type ProcessPendingPleskDomainsResult = {
  checked: number;
  verified: number;
  errors: string[];
};

/** Re-push FaraiOS DNS to Plesk, then verify pending Plesk website domains. */
export async function processPendingPleskDomainVerifications(
  limit = 50
): Promise<ProcessPendingPleskDomainsResult> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { checked: 0, verified: 0, errors: [admin.error] };
  }

  const { data: pendingDomains, error } = await admin.client
    .from("website_domains")
    .select("id, company_id, domain, hosting_provider")
    .eq("verification_status", "pending")
    .eq("hosting_provider", "plesk")
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) {
    return { checked: 0, verified: 0, errors: [error.message] };
  }

  let verified = 0;
  const errors: string[] = [];

  for (const row of pendingDomains ?? []) {
    const domainId = row.id as string;
    const companyId = row.company_id as string;
    const domain = row.domain as string;

    try {
      const verifyResult = await verifyWebsiteDomain(domainId, companyId);
      if (!verifyResult.ok) {
        errors.push(`${domain}: ${verifyResult.error ?? "Verification failed."}`);
        continue;
      }
      if (verifyResult.verified) {
        verified += 1;
      }
    } catch (verifyError) {
      const message =
        verifyError instanceof Error ? verifyError.message : "Verification failed.";
      errors.push(`${domain}: ${message}`);
    }
  }

  return {
    checked: pendingDomains?.length ?? 0,
    verified,
    errors,
  };
}
