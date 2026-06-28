import { getPleskCredentials } from "@/lib/hosting/plesk/config";
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
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

function normalizeDnsHost(host: string, domain: string): string {
  const lower = host.toLowerCase().replace(/\.$/, "");
  const apex = domain.toLowerCase();

  if (lower === "" || lower === "@" || lower === apex) return "@";
  if (lower === "www" || lower === `www.${apex}`) return "www";
  if (lower === "_faraios" || lower === `_faraios.${apex}`) return "_faraios";
  return lower;
}

function hostsMatch(recordHost: string, wantedHost: string, domain: string): boolean {
  return normalizeDnsHost(recordHost, domain) === normalizeDnsHost(wantedHost, domain);
}

function valuesMatch(type: string, actual: string, expected: string): boolean {
  if (type.toUpperCase() === "TXT") {
    return actual.replace(/"/g, "").includes(expected.replace(/"/g, ""));
  }
  return actual.toLowerCase().replace(/\.$/, "") === expected.toLowerCase().replace(/\.$/, "");
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
  domain: string
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

  const { data: byDomain } = await admin.client
    .from("hosting_services")
    .select("plesk_subscription_id, server_id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .ilike("domain_name", normalized)
    .not("plesk_subscription_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let siteId = byDomain?.plesk_subscription_id ?? null;
  let serverId = byDomain?.server_id ?? null;

  if (!siteId) {
    const { data: services } = await admin.client
      .from("hosting_services")
      .select("plesk_subscription_id, server_id")
      .eq("company_id", companyId)
      .eq("status", "active")
      .not("plesk_subscription_id", "is", null)
      .order("created_at", { ascending: false });

    if (services?.length === 1) {
      siteId = services[0].plesk_subscription_id;
      serverId = services[0].server_id;
    }
  }

  if (!siteId) return null;

  const creds = await getPleskCredentials(serverId);
  if (!creds) return null;

  return {
    creds,
    siteId,
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
}): Promise<SyncFaraiosDomainDnsResult> {
  const domain = normalizeDomain(input.domain);
  if (!domain) {
    return { ok: false, error: "Invalid domain." };
  }

  const ctx = await resolvePleskSiteContext(input.companyId, domain);
  if (!ctx) {
    return {
      ok: true,
      skipped: true,
      reason: "No active Plesk hosting service found for this company.",
    };
  }

  const requiredRecords = buildRequiredRecords(domain, input.serverIp, input.verificationToken);
  const existingResult = await getPleskDnsRecords(ctx.creds, ctx.siteId, ctx.serverId);
  if (!existingResult.ok) {
    return { ok: false, error: existingResult.error };
  }

  const synced: string[] = [];

  for (const required of requiredRecords) {
    const result = await upsertPleskDnsRecord(
      ctx.creds,
      ctx.siteId,
      ctx.serverId,
      domain,
      existingResult.records,
      required
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    if (result.action !== "unchanged") {
      synced.push(`${required.type} ${required.host}`);
    }
  }

  return { ok: true, synced };
}
