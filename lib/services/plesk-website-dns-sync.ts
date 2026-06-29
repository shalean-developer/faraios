import { syncFaraiosDomainDnsToPlesk } from "@/lib/hosting/plesk/syncFaraiosDomainDns";
import { getPleskHostingTarget } from "@/lib/hosting/plesk/target";
import { syncServiceDnsRecords } from "@/lib/services/hosting-resources";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { normalizeDomain } from "@/lib/utils/normalize-domain";

export type PushWebsiteDomainDnsResult =
  | { ok: true; synced: string[]; mirroredServiceId?: string }
  | { ok: false; error: string };

/**
 * Push required FaraiOS DNS records (A + _faraios TXT) to Plesk, then mirror
 * the zone into hosting_dns_records when a matching service exists.
 */
export async function pushWebsiteDomainDnsToPlesk(input: {
  companyId: string;
  domain: string;
  verificationToken?: string | null;
  serverId?: string | null;
  pleskSubscriptionId?: string | null;
}): Promise<PushWebsiteDomainDnsResult> {
  const domain = normalizeDomain(input.domain);
  if (!domain) {
    return { ok: false, error: "Invalid domain." };
  }

  const target = await getPleskHostingTarget({
    companyId: input.companyId,
    serverId: input.serverId,
  });

  if (!target?.serverIp) {
    return {
      ok: false,
      error:
        "Plesk server IP is not configured. Set FARAIOS_PLESK_SERVER_IP or configure a hosting server in Admin → Hosting.",
    };
  }

  const syncResult = await syncFaraiosDomainDnsToPlesk({
    companyId: input.companyId,
    domain,
    serverIp: target.serverIp,
    verificationToken: input.verificationToken ?? null,
    serverId: input.serverId,
    pleskSubscriptionId: input.pleskSubscriptionId,
  });

  if (!syncResult.ok) {
    return { ok: false, error: syncResult.error };
  }

  const admin = tryCreateAdminClient();
  if (admin.ok) {
    let serviceQuery = admin.client
      .from("hosting_services")
      .select("id")
      .eq("company_id", input.companyId)
      .eq("status", "active")
      .not("plesk_subscription_id", "is", null);

    if (input.pleskSubscriptionId) {
      serviceQuery = serviceQuery.eq("plesk_subscription_id", input.pleskSubscriptionId);
    } else {
      serviceQuery = serviceQuery.ilike("domain_name", domain);
    }

    const { data: service } = await serviceQuery
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (service?.id) {
      await syncServiceDnsRecords(service.id as string);
      return { ok: true, synced: syncResult.synced, mirroredServiceId: service.id as string };
    }
  }

  return { ok: true, synced: syncResult.synced };
}

export async function forceSyncHostingServiceDnsToPlesk(
  serviceId: string
): Promise<PushWebsiteDomainDnsResult> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: admin.error };
  }

  const { data: service, error } = await admin.client
    .from("hosting_services")
    .select("id, company_id, domain_name, server_id, plesk_subscription_id, status")
    .eq("id", serviceId)
    .maybeSingle();

  if (error || !service) {
    return { ok: false, error: error?.message ?? "Hosting service not found." };
  }

  if (service.status !== "active" || !service.plesk_subscription_id) {
    return { ok: false, error: "Service is not active or not provisioned in Plesk." };
  }

  const { data: domainRow } = await admin.client
    .from("website_domains")
    .select("verification_token")
    .eq("company_id", service.company_id)
    .ilike("domain", service.domain_name as string)
    .maybeSingle();

  return pushWebsiteDomainDnsToPlesk({
    companyId: service.company_id as string,
    domain: service.domain_name as string,
    verificationToken: (domainRow?.verification_token as string | null) ?? null,
    serverId: service.server_id as string | null,
    pleskSubscriptionId: service.plesk_subscription_id as string,
  });
}
