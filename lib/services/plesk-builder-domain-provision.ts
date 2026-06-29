import { createHostingAccount } from "@/lib/hosting/plesk/provisioning";
import { domainsMatchForHosting } from "@/lib/hosting/plesk/dnsSyncUtils";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { normalizeDomain } from "@/lib/utils/normalize-domain";

export type EnsurePleskWebspaceResult =
  | { ok: true; serviceId: string; pleskSubscriptionId: string; created: boolean }
  | { ok: true; skipped: true; serviceId: string; pleskSubscriptionId: string }
  | { ok: false; error: string };

/**
 * Website builder "Connect domain" only stores DNS instructions in FaraiOS until a
 * Plesk webspace exists. Hosting checkout creates that webspace automatically;
 * this bridges builder-only connects to the same Plesk subscription.
 */
export async function ensurePleskWebspaceForBuilderDomain(input: {
  companyId: string;
  domain: string;
  companyName?: string | null;
  companyEmail?: string | null;
}): Promise<EnsurePleskWebspaceResult> {
  const normalized = normalizeDomain(input.domain);
  if (!normalized) {
    return { ok: false, error: "Invalid domain." };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: admin.error };
  }

  const { data: existingServices } = await admin.client
    .from("hosting_services")
    .select("id, domain_name, plesk_subscription_id, status")
    .eq("company_id", input.companyId)
    .in("status", ["active", "pending"])
    .not("plesk_subscription_id", "is", null)
    .order("created_at", { ascending: false });

  const linked = (existingServices ?? []).find(
    (row) =>
      domainsMatchForHosting(String(row.domain_name ?? ""), normalized) &&
      row.plesk_subscription_id
  );

  if (linked?.id && linked.plesk_subscription_id) {
    return {
      ok: true,
      skipped: true,
      serviceId: linked.id as string,
      pleskSubscriptionId: linked.plesk_subscription_id as string,
    };
  }

  const { data: plan } = await admin.client
    .from("hosting_plans")
    .select("id, slug, plesk_service_plan")
    .eq("slug", "shared-basic")
    .eq("is_active", true)
    .maybeSingle();

  if (!plan?.id) {
    return { ok: false, error: "Default hosting plan is not configured." };
  }

  const { data: server } = await admin.client
    .from("hosting_servers")
    .select("id")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: service, error: serviceError } = await admin.client
    .from("hosting_services")
    .insert({
      company_id: input.companyId,
      plan_id: plan.id,
      domain_name: normalized,
      server_id: server?.id ?? null,
      status: "pending",
      billing_cycle: "monthly",
    })
    .select("id")
    .single();

  if (serviceError || !service?.id) {
    return {
      ok: false,
      error: serviceError?.message ?? "Could not create hosting service record.",
    };
  }

  const serviceId = service.id as string;
  const provisioned = await createHostingAccount({
    companyId: input.companyId,
    orderId: serviceId,
    serviceId,
    domainName: normalized,
    planSlug: plan.slug as string,
    pleskServicePlan: (plan.plesk_service_plan as string) ?? (plan.slug as string),
    serverId: server?.id ?? null,
    companyName: input.companyName ?? undefined,
    companyEmail: input.companyEmail ?? undefined,
  });

  if (!provisioned.ok) {
    await admin.client
      .from("hosting_services")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", serviceId);
    return { ok: false, error: provisioned.error };
  }

  await admin.client
    .from("hosting_services")
    .update({
      status: "active",
      plesk_subscription_id: provisioned.pleskSubscriptionId,
      plesk_customer_id: provisioned.pleskCustomerId,
      username: provisioned.username,
      control_panel_url: provisioned.controlPanelUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);

  return {
    ok: true,
    serviceId,
    pleskSubscriptionId: provisioned.pleskSubscriptionId,
    created: true,
  };
}
