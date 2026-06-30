import { escapeXml, getAllXmlBlocks, getXmlText, pleskXmlRequest } from "@/lib/hosting/plesk/pleskXmlClient";
import type { PleskCredentials, PleskDnsRecord } from "@/lib/hosting/plesk/pleskTypes";

/** Plesk expects an empty host for apex records, not "@". */
export function formatPleskDnsHost(host: string): string {
  const trimmed = host.trim();
  return trimmed === "@" ? "" : trimmed;
}

function parseDnsRecord(block: string): PleskDnsRecord | null {
  const type = getXmlText(block, "type");
  const host = getXmlText(block, "host") ?? "@";
  const value = getXmlText(block, "value") ?? getXmlText(block, "opt");
  if (!type || !value) return null;

  const priorityStr = getXmlText(block, "priority");
  const ttlStr = getXmlText(block, "ttl");

  return {
    id: getXmlText(block, "id") ?? undefined,
    type: type.toUpperCase(),
    host,
    value,
    priority: priorityStr ? parseInt(priorityStr, 10) : undefined,
    ttl: ttlStr ? parseInt(ttlStr, 10) : undefined,
  };
}

export async function getPleskDnsRecords(
  creds: PleskCredentials,
  siteId: string,
  serverId?: string
): Promise<{ ok: true; records: PleskDnsRecord[] } | { ok: false; error: string }> {
  const inner = `<dns><get_rec><filter><site-id>${escapeXml(siteId)}</site-id></filter></get_rec></dns>`;
  const result = await pleskXmlRequest(creds, inner, { serverId, action: "get_dns_records" });
  if (!result.ok) return { ok: false, error: result.error };

  const records: PleskDnsRecord[] = [];
  for (const block of getAllXmlBlocks(result.rawXml, "result")) {
    if (getXmlText(block, "status") === "error") continue;
    for (const recBlock of getAllXmlBlocks(block, "data")) {
      const rec = parseDnsRecord(recBlock);
      if (rec) records.push(rec);
    }
    const rec = parseDnsRecord(block);
    if (rec) records.push(rec);
  }

  return { ok: true, records };
}

export async function addPleskDnsRecord(
  creds: PleskCredentials,
  input: {
    siteId: string;
    record: Omit<PleskDnsRecord, "id">;
    serverId?: string;
  }
): Promise<{ ok: true; recordId?: string } | { ok: false; error: string }> {
  const priority = input.record.priority != null
    ? `<priority>${input.record.priority}</priority>`
    : "";
  const inner = `<dns><add_rec><site-id>${escapeXml(input.siteId)}</site-id><type>${escapeXml(input.record.type)}</type><host>${escapeXml(formatPleskDnsHost(input.record.host))}</host><value>${escapeXml(input.record.value)}</value>${priority}</add_rec></dns>`;

  const result = await pleskXmlRequest(creds, inner, { serverId: input.serverId, action: "add_dns_record" });
  if (!result.ok) return { ok: false, error: result.error };

  const block = getAllXmlBlocks(result.rawXml, "result")[0];
  return { ok: true, recordId: block ? getXmlText(block, "id") ?? undefined : undefined };
}

export async function updatePleskDnsRecord(
  creds: PleskCredentials,
  input: {
    siteId: string;
    recordId: string;
    record: Omit<PleskDnsRecord, "id">;
    serverId?: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const priority = input.record.priority != null
    ? `<priority>${input.record.priority}</priority>`
    : "";
  const inner = `<dns><set_rec><filter><site-id>${escapeXml(input.siteId)}</site-id><id>${escapeXml(input.recordId)}</id></filter><value>${escapeXml(input.record.value)}</value><host>${escapeXml(formatPleskDnsHost(input.record.host))}</host>${priority}</set_rec></dns>`;

  const result = await pleskXmlRequest(creds, inner, { serverId: input.serverId, action: "update_dns_record" });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function deletePleskDnsRecord(
  creds: PleskCredentials,
  siteId: string,
  recordId: string,
  serverId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Plesk rejects filter nodes that combine site-id with id — use record id only.
  const inner = `<dns><del_rec><filter><id>${escapeXml(recordId)}</id></filter></del_rec></dns>`;
  const result = await pleskXmlRequest(creds, inner, { serverId, action: "delete_dns_record" });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
