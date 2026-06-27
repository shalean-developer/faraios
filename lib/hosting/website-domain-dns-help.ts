import {
  describePleskDnsInstructions,
  getPleskHostingTarget,
  type PleskHostingTarget,
} from "@/lib/hosting/plesk/target";
import type { WebsiteDomainDnsHelp } from "@/components/websites/website-domains-panel";

export function buildWebsiteDomainDnsHelp(
  target: PleskHostingTarget | null
): WebsiteDomainDnsHelp {
  return {
    serverIp: target?.serverIp ?? null,
    serverHostname: target?.serverHostname ?? null,
    nameservers: target?.nameservers ?? [],
    helpText: describePleskDnsInstructions(target),
  };
}

export async function loadWebsiteDomainDnsHelp(
  companyId: string
): Promise<WebsiteDomainDnsHelp> {
  const target = await getPleskHostingTarget({ companyId });
  return buildWebsiteDomainDnsHelp(target);
}
