import {
  describePleskDnsInstructions,
  getPleskHostingTarget,
  type PleskHostingTarget,
} from "@/lib/hosting/plesk/target";
import { buildExternalDnsOverview } from "@/lib/hosting/external-dns-guidance";
import type {
  DnsRecordForGuidance,
  DomainDnsGuidance,
} from "@/lib/hosting/external-dns-guidance";
import type { WebsiteDomainDnsHelp } from "@/components/websites/website-domains-panel";

export function buildWebsiteDomainDnsHelp(
  target: PleskHostingTarget | null
): WebsiteDomainDnsHelp {
  return {
    serverIp: target?.serverIp ?? null,
    serverHostname: target?.serverHostname ?? null,
    nameservers: target?.nameservers ?? [],
    helpText: describePleskDnsInstructions(target),
    externalDnsOverview: null,
  };
}

export function enrichWebsiteDomainDnsHelp(
  help: WebsiteDomainDnsHelp,
  guidanceMap: Record<string, DomainDnsGuidance>,
  dnsByDomain: Record<string, DnsRecordForGuidance[]> = {}
): WebsiteDomainDnsHelp {
  const overview = buildExternalDnsOverview(guidanceMap, dnsByDomain);
  if (!overview) return help;

  return {
    ...help,
    externalDnsOverview: overview,
    helpText: overview,
  };
}

export async function loadWebsiteDomainDnsHelp(
  companyId: string
): Promise<WebsiteDomainDnsHelp> {
  const target = await getPleskHostingTarget({ companyId });
  return buildWebsiteDomainDnsHelp(target);
}
