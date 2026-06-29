import { getPleskCredentials } from "@/lib/hosting/plesk/config";
import { findPleskSubscriptionByDomain } from "@/lib/hosting/plesk/pleskSubscriptions";
import { domainsMatchForHosting } from "@/lib/hosting/plesk/dnsSyncUtils";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { normalizeDomain } from "@/lib/utils/normalize-domain";

export type DomainHostingReadiness =
  | {
      ready: true;
      serviceId: string;
      pleskSubscriptionId: string;
      serverId: string | null;
    }
  | {
      ready: false;
      requiresHosting: true;
      message: string;
    };

export async function getDomainHostingReadiness(
  companyId: string,
  domain: string
): Promise<DomainHostingReadiness> {
  const normalized = normalizeDomain(domain);
  if (!normalized) {
    return {
      ready: false,
      requiresHosting: true,
      message: "Enter a valid domain name.",
    };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return {
      ready: false,
      requiresHosting: true,
      message: "Hosting could not be verified. Try again or contact support.",
    };
  }

  const { data: services } = await admin.client
    .from("hosting_services")
    .select("id, domain_name, plesk_subscription_id, server_id, status")
    .eq("company_id", companyId)
    .eq("status", "active")
    .not("plesk_subscription_id", "is", null)
    .order("created_at", { ascending: false });

  const service = (services ?? []).find((row) =>
    domainsMatchForHosting(String(row.domain_name ?? ""), normalized)
  );

  if (service?.id && service.plesk_subscription_id) {
    const creds = await getPleskCredentials((service.server_id as string | null) ?? null);
    if (creds) {
      const pleskSub = await findPleskSubscriptionByDomain(
        creds,
        normalized,
        (service.server_id as string | null) ?? creds.serverId ?? undefined
      );
      if (!pleskSub) {
        return {
          ready: false,
          requiresHosting: true,
          message:
            "This domain is not registered in Plesk yet. Purchase FaraiOS hosting to provision it automatically.",
        };
      }
    }

    return {
      ready: true,
      serviceId: service.id as string,
      pleskSubscriptionId: service.plesk_subscription_id as string,
      serverId: (service.server_id as string | null) ?? null,
    };
  }

  return {
    ready: false,
    requiresHosting: true,
    message:
      "This domain needs a FaraiOS hosting plan before it can go live. Choose a plan below — Plesk setup and DNS sync run automatically after payment.",
  };
}

export async function listActiveHostingPlans() {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("hosting_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return data ?? [];
}
