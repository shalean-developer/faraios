import { escapeXml, getAllXmlBlocks, getXmlText, pleskXmlRequest } from "@/lib/hosting/plesk/pleskXmlClient";
import type { PleskCredentials } from "@/lib/hosting/plesk/pleskTypes";
import { normalizeDomain } from "@/lib/utils/normalize-domain";

export function complementaryHostingDomain(domain: string): string | null {
  const normalized = normalizeDomain(domain);
  if (!normalized) return null;
  if (normalized.startsWith("www.")) {
    const apex = normalized.slice(4);
    return apex.includes(".") ? apex : null;
  }
  return `www.${normalized}`;
}

async function listPleskSiteAliasNames(
  creds: PleskCredentials,
  siteId: string,
  serverId?: string
): Promise<string[]> {
  const inner = `<site-alias><get><filter><site-id>${escapeXml(siteId)}</site-id></filter></get></site-alias>`;
  const result = await pleskXmlRequest(creds, inner, {
    serverId,
    action: "list_site_aliases",
  });
  if (!result.ok) return [];

  const names: string[] = [];
  for (const block of getAllXmlBlocks(result.rawXml, "result")) {
    if (getXmlText(block, "status") === "error") continue;
    const name = getXmlText(block, "name");
    if (name) names.push(name.toLowerCase());
  }
  return names;
}

/** Ensure www ↔ apex alias exists so both hostnames hit the same Plesk vhost (not the server default site). */
export async function ensurePleskComplementarySiteAlias(
  creds: PleskCredentials,
  input: {
    siteId: string;
    primaryDomain: string;
    serverId?: string;
    serviceId?: string;
    companyId?: string;
  }
): Promise<{ ok: true; created: boolean } | { ok: true; skipped: true } | { ok: false; error: string }> {
  const primary = normalizeDomain(input.primaryDomain);
  const aliasName = complementaryHostingDomain(primary);
  if (!primary || !aliasName) {
    return { ok: true, skipped: true };
  }

  const existing = await listPleskSiteAliasNames(creds, input.siteId, input.serverId);
  if (existing.includes(aliasName)) {
    return { ok: true, created: false };
  }

  const inner = `<site-alias><create><site-id>${escapeXml(input.siteId)}</site-id><name>${escapeXml(aliasName)}</name><pref><web>1</web><mail>0</mail><tomcat>0</tomcat></pref></create></site-alias>`;
  const result = await pleskXmlRequest(creds, inner, {
    serverId: input.serverId,
    serviceId: input.serviceId,
    companyId: input.companyId,
    action: "create_site_alias",
  });

  if (!result.ok) {
    if (/permission|denied|not allowed|administrator/i.test(result.error)) {
      return { ok: true, skipped: true };
    }
    if (/already exists|duplicate/i.test(result.error)) {
      return { ok: true, created: false };
    }
    return { ok: false, error: result.error };
  }

  return { ok: true, created: true };
}
