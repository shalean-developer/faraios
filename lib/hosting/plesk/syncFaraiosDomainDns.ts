import { getPleskCredentials } from "@/lib/hosting/plesk/config";
import {
  domainsMatchForHosting,
  hostsMatch,
  valuesMatch,
} from "@/lib/hosting/plesk/dnsSyncUtils";
import {
  addPleskDnsRecord,
  getPleskDnsRecords,
  updatePleskDnsRecord,
} from "@/lib/hosting/plesk/pleskDns";
import type { PleskCredentials, PleskDnsRecord } from "@/lib/hosting/plesk/pleskTypes";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { normalizeDomain } from "@/lib/utils/normalize-domain";

type RequiredRecord = {
  type: string;
  host: string;
  value: string;
};

export type SyncFaraiosDomainDnsResult =
  | { ok: true; synced: string[] }
  | { ok: false; error: string };

const DNS_ZONE_RETRY_ATTEMPTS = 3;
const DNS_ZONE_RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRequiredRecords(
  domain: string,
  serverIp: string,
  verificationToken: string | null
): RequiredRecord[] {
  const records: RequiredRecord[] = [
    { type: "A", host: "@", value: serverIp },
    { type: "A", host: "www", value: serverIp },
  ];

  if (verificationToken) {
    records.push({
      type: "TXT",
      host: "_faraios",
      value: `faraios-verify=${verificationToken}`,
    });
  }

  return records;
}

async function resolvePleskSiteContext(
  companyId: string,
  domain: string,
  options?: {
    serverId?: string | null;
    pleskSubscriptionId?: string | null;
  }
): Promise<
  | {
      creds: PleskCredentials;
      siteId: string;
      serverId: string | undefined;
    }
  | null
> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const normalized = normalizeDomain(domain);

  if (options?.pleskSubscriptionId) {
    const creds = await getPleskCredentials(options.serverId);
    if (!creds) return null;
    return {
      creds,
      siteId: options.pleskSubscriptionId,
      serverId: options.serverId ?? creds.serverId ?? undefined,
    };
  }

  const { data: services } = await admin.client
    .from("hosting_services")
    .select("plesk_subscription_id, server_id, domain_name")
    .eq("company_id", companyId)
    .eq("status", "active")
    .not("plesk_subscription_id", "is", null)
    .order("created_at", { ascending: false });

  const match = (services ?? []).find((service) =>
    domainsMatchForHosting(String(service.domain_name ?? ""), normalized)
  );

  if (!match?.plesk_subscription_id) return null;

  const serverId = options?.serverId ?? match.server_id ?? null;
  const creds = await getPleskCredentials(serverId);
  if (!creds) return null;

  return {
    creds,
    siteId: match.plesk_subscription_id as string,
    serverId: serverId ?? creds.serverId ?? undefined,
  };
}

async function upsertPleskDnsRecord(
  creds: PleskCredentials,
  siteId: string,
  serverId: string | undefined,
  domain: string,
  existing: PleskDnsRecord[],
  required: RequiredRecord
): Promise<{ ok: true; action: "added" | "updated" | "unchanged" } | { ok: false; error: string }> {
  const match = existing.find(
    (record) =>
      record.type.toUpperCase() === required.type.toUpperCase() &&
      hostsMatch(record.host, required.host, domain)
  );

  if (match?.id) {
    if (valuesMatch(required.type, match.value, required.value)) {
      return { ok: true, action: "unchanged" };
    }

    const result = await updatePleskDnsRecord(creds, {
      siteId,
      recordId: match.id,
      record: {
        type: required.type,
        host: required.host,
        value: required.value,
      },
      serverId,
    });

    return result.ok
      ? { ok: true, action: "updated" }
      : { ok: false, error: result.error };
  }

  const result = await addPleskDnsRecord(creds, {
    siteId,
    record: {
      type: required.type,
      host: required.host,
      value: required.value,
    },
    serverId,
  });

  return result.ok ? { ok: true, action: "added" } : { ok: false, error: result.error };
}

export async function syncFaraiosDomainDnsToPlesk(input: {
  companyId: string;
  domain: string;
  serverIp: string;
  verificationToken: string | null;
  serverId?: string | null;
  pleskSubscriptionId?: string | null;
}): Promise<SyncFaraiosDomainDnsResult> {
  const domain = normalizeDomain(input.domain);
  if (!domain) {
    return { ok: false, error: "Invalid domain." };
  }

  const ctx = await resolvePleskSiteContext(input.companyId, domain, {
    serverId: input.serverId,
    pleskSubscriptionId: input.pleskSubscriptionId,
  });

  if (!ctx) {
    return {
      ok: false,
      error: `No active Plesk hosting service found for ${domain}.`,
    };
  }

  const requiredRecords = buildRequiredRecords(domain, input.serverIp, input.verificationToken);
  const synced: string[] = [];

  for (const required of requiredRecords) {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= DNS_ZONE_RETRY_ATTEMPTS; attempt += 1) {
      const existingResult = await getPleskDnsRecords(ctx.creds, ctx.siteId, ctx.serverId);
      if (!existingResult.ok) {
        lastError = existingResult.error;
        if (attempt < DNS_ZONE_RETRY_ATTEMPTS) {
          await sleep(DNS_ZONE_RETRY_DELAY_MS);
          continue;
        }
        return { ok: false, error: existingResult.error };
      }

      const result = await upsertPleskDnsRecord(
        ctx.creds,
        ctx.siteId,
        ctx.serverId,
        domain,
        existingResult.records,
        required
      );

      if (result.ok) {
        if (result.action !== "unchanged") {
          synced.push(`${required.type} ${required.host}`);
        }
        lastError = undefined;
        break;
      }

      lastError = result.error;
      if (attempt < DNS_ZONE_RETRY_ATTEMPTS) {
        await sleep(DNS_ZONE_RETRY_DELAY_MS);
      }
    }

    if (lastError) {
      return { ok: false, error: lastError };
    }
  }

  return { ok: true, synced };
}
