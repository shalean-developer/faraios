import { escapeXml, getAllXmlBlocks, getXmlText, pleskXmlRequest } from "@/lib/hosting/plesk/pleskXmlClient";
import type { PleskCredentials } from "@/lib/hosting/plesk/pleskTypes";

export async function getPleskDomainId(
  creds: PleskCredentials,
  domainName: string,
  serverId?: string
): Promise<string | null> {
  const inner = `<domain><get><filter><name>${escapeXml(domainName)}</name></filter><dataset><gen_info/></dataset></get></domain>`;
  const result = await pleskXmlRequest(creds, inner, { serverId, action: "get_domain" });
  if (!result.ok) return null;

  const block = getAllXmlBlocks(result.rawXml, "result")[0];
  return block ? getXmlText(block, "id") : null;
}

export async function syncPleskDomains(
  creds: PleskCredentials,
  serverId?: string
): Promise<{ ok: true; domains: { id: string; name: string }[] } | { ok: false; error: string }> {
  const inner = `<domain><get><filter/><dataset><gen_info/></dataset></get></domain>`;
  const result = await pleskXmlRequest(creds, inner, { serverId, action: "sync_domains" });
  if (!result.ok) return { ok: false, error: result.error };

  const domains: { id: string; name: string }[] = [];
  for (const block of getAllXmlBlocks(result.rawXml, "result")) {
    if (getXmlText(block, "status") === "error") continue;
    const data = getAllXmlBlocks(block, "data")[0] ?? block;
    const id = getXmlText(data, "id");
    const name = getXmlText(data, "name");
    if (id && name) domains.push({ id, name });
  }

  return { ok: true, domains };
}
