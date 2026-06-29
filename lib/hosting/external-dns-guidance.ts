import { promises as dns } from "dns";

import { getPleskHostingTarget } from "@/lib/hosting/plesk/target";
import type { WebsiteDnsRecord, WebsiteDomain } from "@/types/website-engine";

const DNS_LOOKUP_TIMEOUT_MS = 5_000;

export type DomainDnsGuidance = {
  usesExternalDns: boolean;
  publicNameservers: string[];
  pleskNameservers: string[];
  serverIp: string | null;
  dnsHostDescription: string;
  summary: string;
};

function withDnsTimeout<T>(promise: Promise<T>, timeoutMs = DNS_LOOKUP_TIMEOUT_MS): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

export function normalizeNameserver(value: string): string {
  return value.toLowerCase().replace(/\.$/, "");
}

export function usesExternalDns(publicNs: string[], pleskNs: string[]): boolean {
  if (!publicNs.length) return false;
  if (!pleskNs.length) return true;
  const pleskSet = new Set(pleskNs.map(normalizeNameserver));
  return publicNs.some((ns) => !pleskSet.has(normalizeNameserver(ns)));
}

export function describeDnsHost(publicNameservers: string[]): string {
  if (!publicNameservers.length) {
    return "your domain registrar or DNS provider";
  }
  return `your DNS provider (nameservers: ${publicNameservers.join(", ")})`;
}

export function buildExternalDnsTxtHint(nameservers: string[]): string {
  const nsList = nameservers.join(", ");
  return `This domain uses external DNS (${nsList}). Add the _faraios TXT record at that DNS provider. Changes in the Plesk DNS panel will not apply while nameservers point elsewhere.`;
}

export function buildExternalDnsGuidance(input: {
  publicNameservers: string[];
  pleskNameservers: string[];
  serverIp: string | null;
}): DomainDnsGuidance {
  const external = usesExternalDns(input.publicNameservers, input.pleskNameservers);
  const dnsHostDescription = describeDnsHost(input.publicNameservers);

  const summary = external
    ? `Your nameservers are not FaraiOS/Plesk. Add the DNS records below at ${dnsHostDescription} — not in the Plesk DNS panel. Plesk hosts your website, but the internet only reads DNS from your nameserver provider.`
    : `DNS is managed on your FaraiOS Plesk server. Add or confirm the records below in Plesk, then verify.`;

  return {
    usesExternalDns: external,
    publicNameservers: input.publicNameservers,
    pleskNameservers: input.pleskNameservers,
    serverIp: input.serverIp,
    dnsHostDescription,
    summary,
  };
}

export async function getPublicNameserversForDomain(domain: string): Promise<string[]> {
  try {
    const records = await withDnsTimeout(dns.resolveNs(domain));
    return records ?? [];
  } catch {
    return [];
  }
}

export async function loadDomainDnsGuidanceMap(
  companyId: string,
  domains: WebsiteDomain[]
): Promise<Record<string, DomainDnsGuidance>> {
  const target = await getPleskHostingTarget({ companyId });
  const pleskNs = target?.nameservers ?? [];
  const serverIp = target?.serverIp ?? null;

  const entries = await Promise.all(
    domains.map(async (domain) => {
      const publicNs = await getPublicNameserversForDomain(domain.domain);
      const guidance = buildExternalDnsGuidance({
        publicNameservers: publicNs,
        pleskNameservers: pleskNs,
        serverIp,
      });
      return [domain.id, guidance] as const;
    })
  );

  return Object.fromEntries(entries);
}

export function buildExternalDnsOverview(
  guidanceMap: Record<string, DomainDnsGuidance>
): string | null {
  const external = Object.values(guidanceMap).filter((item) => item.usesExternalDns);
  if (!external.length) return null;

  const nameservers = [
    ...new Set(external.flatMap((item) => item.publicNameservers.map(normalizeNameserver))),
  ];

  if (nameservers.length) {
    return `Connected domains use external DNS (${nameservers.join(", ")}). Update A and TXT records at that DNS provider — not in Plesk — then verify below.`;
  }

  return "Connected domains use external DNS. Update records at your domain's DNS provider (where nameservers point), not in Plesk, then verify below.";
}

export type DnsRecordForGuidance = Pick<
  WebsiteDnsRecord,
  "record_type" | "host" | "value" | "status"
>;

export function pendingDnsRecordsForGuidance(
  records: DnsRecordForGuidance[]
): DnsRecordForGuidance[] {
  return records.filter((record) => record.status !== "verified");
}
