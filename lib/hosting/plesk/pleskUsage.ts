import { getAllXmlBlocks, getXmlText, pleskXmlRequest } from "@/lib/hosting/plesk/pleskXmlClient";
import type { PleskCredentials, PleskUsageStats } from "@/lib/hosting/plesk/pleskTypes";

function parseUsageFromXml(rawXml: string): PleskUsageStats {
  const diskBytes = parseInt(getXmlText(rawXml, "disk_space") ?? "0", 10);
  const trafficBytes = parseInt(getXmlText(rawXml, "traffic") ?? "0", 10);
  const mailboxes = parseInt(getXmlText(rawXml, "box") ?? getXmlText(rawXml, "mailboxes") ?? "0", 10);
  const databases = parseInt(getXmlText(rawXml, "db") ?? getXmlText(rawXml, "databases") ?? "0", 10);
  const ftp = parseInt(getXmlText(rawXml, "subftp_users") ?? getXmlText(rawXml, "ftp_users") ?? "0", 10);

  return {
    diskUsedMb: Math.round(diskBytes / 1024 / 1024),
    bandwidthUsedMb: Math.round(trafficBytes / 1024 / 1024),
    mailboxesUsed: mailboxes,
    databasesUsed: databases,
    ftpAccountsUsed: ftp,
  };
}

export async function getPleskUsage(
  creds: PleskCredentials,
  subscriptionId: string,
  serverId?: string
): Promise<{ ok: true; usage: PleskUsageStats } | { ok: false; error: string }> {
  const inner = `<webspace><get><filter><id>${subscriptionId}</id></filter><dataset><stat/></dataset></get></webspace>`;
  const result = await pleskXmlRequest(creds, inner, {
    serverId,
    action: "get_usage",
  });

  if (!result.ok) return { ok: false, error: result.error };

  const statBlock = getAllXmlBlocks(result.rawXml, "stat")[0] ?? result.rawXml;
  return { ok: true, usage: parseUsageFromXml(statBlock) };
}

export async function syncPleskUsage(
  creds: PleskCredentials,
  subscriptionId: string,
  serviceId: string,
  serverId?: string
): Promise<{ ok: true; usage: PleskUsageStats } | { ok: false; error: string }> {
  const usageResult = await getPleskUsage(creds, subscriptionId, serverId);
  if (!usageResult.ok) return usageResult;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin.from("hosting_usage_snapshots").insert({
    service_id: serviceId,
    disk_used_mb: usageResult.usage.diskUsedMb,
    bandwidth_used_mb: usageResult.usage.bandwidthUsedMb,
    email_accounts_used: usageResult.usage.mailboxesUsed,
    databases_used: usageResult.usage.databasesUsed,
  });

  return usageResult;
}
