import { getAllXmlBlocks, getXmlText, pleskXmlRequest } from "@/lib/hosting/plesk/pleskXmlClient";
import type { PleskCredentials } from "@/lib/hosting/plesk/pleskTypes";

const cachedIpByEndpoint = new Map<string, string>();

/** Resolve a usable shared IPv4 address for new Plesk subscriptions. */
export async function getPleskDefaultIpAddress(
  creds: PleskCredentials,
  serverId?: string
): Promise<string | null> {
  const cacheKey = `${creds.xmlEndpoint}:${serverId ?? "default"}`;
  const cached = cachedIpByEndpoint.get(cacheKey);
  if (cached) return cached;

  const result = await pleskXmlRequest(creds, "<ip><get/></ip>", {
    serverId,
    action: "list_ips",
  });

  if (!result.ok) return null;

  const ips: string[] = [];
  for (const block of getAllXmlBlocks(result.rawXml, "result")) {
    if (getXmlText(block, "status") === "error") continue;
    const ip =
      getXmlText(block, "ip_address") ??
      getAllXmlBlocks(block, "ip_address")[0]?.trim() ??
      null;
    if (ip && ip !== "shared") ips.push(ip);
  }

  const selected = ips[0] ?? null;
  if (selected) cachedIpByEndpoint.set(cacheKey, selected);
  return selected;
}
