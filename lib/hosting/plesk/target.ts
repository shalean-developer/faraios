import { promises as dns } from "dns";

import { getPleskCredentials } from "@/lib/hosting/plesk/config";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { DnsRecordInstruction } from "@/lib/hosting/providers/types";

export type PleskHostingTarget = {
  serverIp: string;
  serverHostname: string | null;
  nameservers: string[];
  serverId: string | null;
};

function parseNameservers(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function resolveServerIp(hostname: string): Promise<string | null> {
  try {
    const records = await dns.resolve4(hostname.replace(/\.$/, ""));
    return records[0] ?? null;
  } catch {
    return null;
  }
}

async function targetFromServerRow(
  server: {
    id: string;
    hostname: string;
    default_nameservers?: string[] | null;
  },
  explicitIp?: string | null
): Promise<PleskHostingTarget | null> {
  const configuredIp = explicitIp?.trim();
  const serverIp =
    configuredIp ||
    (await resolveServerIp(server.hostname)) ||
    process.env.FARAIOS_PLESK_SERVER_IP?.trim() ||
    null;

  if (!serverIp) return null;

  return {
    serverIp,
    serverHostname: server.hostname.replace(/\.$/, ""),
    nameservers: server.default_nameservers ?? [],
    serverId: server.id,
  };
}

export async function getPleskHostingTarget(input?: {
  companyId?: string | null;
  serverId?: string | null;
}): Promise<PleskHostingTarget | null> {
  const envIp = process.env.FARAIOS_PLESK_SERVER_IP?.trim();
  const envHostname = process.env.FARAIOS_PLESK_SERVER_HOSTNAME?.trim() || null;
  const envNameservers = parseNameservers(process.env.PLESK_DEFAULT_NAMESERVERS);

  if (envIp && !input?.companyId && !input?.serverId) {
    return {
      serverIp: envIp,
      serverHostname: envHostname,
      nameservers: envNameservers,
      serverId: process.env.PLESK_DEFAULT_SERVER_ID?.trim() || null,
    };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    if (envIp) {
      return {
        serverIp: envIp,
        serverHostname: envHostname,
        nameservers: envNameservers,
        serverId: process.env.PLESK_DEFAULT_SERVER_ID?.trim() || null,
      };
    }
    return null;
  }

  if (input?.companyId) {
    const { data: service } = await admin.client
      .from("hosting_services")
      .select("server_id")
      .eq("company_id", input.companyId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (service?.server_id) {
      const { data: server } = await admin.client
        .from("hosting_servers")
        .select("id, hostname, default_nameservers")
        .eq("id", service.server_id)
        .eq("is_active", true)
        .maybeSingle();

      if (server) {
        const target = await targetFromServerRow(server as {
          id: string;
          hostname: string;
          default_nameservers?: string[] | null;
        }, envIp);
        if (target) return target;
      }
    }
  }

  const serverId = input?.serverId ?? process.env.PLESK_DEFAULT_SERVER_ID?.trim() ?? null;

  if (serverId) {
    const { data: server } = await admin.client
      .from("hosting_servers")
      .select("id, hostname, default_nameservers")
      .eq("id", serverId)
      .eq("is_active", true)
      .maybeSingle();

    if (server) {
      const target = await targetFromServerRow(server as {
        id: string;
        hostname: string;
        default_nameservers?: string[] | null;
      }, envIp);
      if (target) return target;
    }
  }

  const { data: defaultServer } = await admin.client
    .from("hosting_servers")
    .select("id, hostname, default_nameservers")
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();

  if (defaultServer) {
    const target = await targetFromServerRow(defaultServer as {
      id: string;
      hostname: string;
      default_nameservers?: string[] | null;
    }, envIp);
    if (target) return target;
  }

  const creds = await getPleskCredentials();
  if (envIp) {
    return {
      serverIp: envIp,
      serverHostname: envHostname ?? creds?.url.replace(/^https?:\/\//, "").split("/")[0] ?? null,
      nameservers: envNameservers.length ? envNameservers : creds?.defaultNameservers ?? [],
      serverId: process.env.PLESK_DEFAULT_SERVER_ID?.trim() || null,
    };
  }

  return null;
}

export function buildPleskDomainDnsRecords(
  _domain: string,
  target: PleskHostingTarget
): DnsRecordInstruction[] {
  return [
    { recordType: "A", host: "@", value: target.serverIp },
    { recordType: "A", host: "www", value: target.serverIp },
  ];
}

export function describePleskDnsInstructions(target: PleskHostingTarget | null): string {
  if (!target?.serverIp) {
    return "Connect your domain to load DNS records for your FaraiOS Plesk server.";
  }

  const nameserverHint =
    target.nameservers.length > 0
      ? ` Or point your domain to nameservers ${target.nameservers.join(", ")} and manage DNS in Plesk.`
      : "";

  return `Point A records for @ and www to ${target.serverIp}.${nameserverHint} Then verify DNS below.`;
}
