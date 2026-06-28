import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminHostingSettings } from "@/lib/hosting/plesk/config";
import { sanitizeServerRow } from "@/lib/services/hosting-plesk-admin";
import type {
  HostingOrderRow,
  HostingPlanRow,
  HostingProvisioningLogRow,
  HostingServerRow,
  HostingServiceRow,
  HostingServicePlanRow,
} from "@/types/hosting-automation";

export type AdminHostingOverviewData = {
  totalCustomers: number;
  totalDomains: number;
  totalServices: number;
  activeServices: number;
  suspendedServices: number;
  failedOrders: number;
  pendingOrders: number;
  totalRevenueCents: number;
  diskUsageMb: number;
  mailboxUsage: number;
  databaseUsage: number;
  apiConnectionStatus: string | null;
  recentOrders: HostingOrderRow[];
  recentLogs: HostingProvisioningLogRow[];
};

export async function getAdminHostingOverview(): Promise<AdminHostingOverviewData> {
  const admin = createAdminClient();

  const [services, orders, payments, logs, domains, usage, defaultServer, settings] =
    await Promise.all([
      admin.from("hosting_services").select("status, company_id"),
      admin
        .from("hosting_orders")
        .select("*, hosting_plans(name), companies(name, slug)")
        .order("created_at", { ascending: false })
        .limit(20),
      admin.from("hosting_payments").select("amount_cents").eq("status", "success"),
      admin
        .from("hosting_provisioning_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      admin.from("hosting_domains").select("id"),
      admin
        .from("hosting_usage_snapshots")
        .select("disk_used_mb, email_accounts_used, databases_used")
        .order("synced_at", { ascending: false })
        .limit(100),
      admin
        .from("hosting_servers")
        .select("last_connection_status")
        .eq("is_default", true)
        .maybeSingle(),
      getAdminHostingSettings(),
    ]);

  const serviceRows = services.data ?? [];
  const orderRows = (orders.data ?? []) as HostingOrderRow[];
  const usageRows = usage.data ?? [];
  const uniqueCustomers = new Set(serviceRows.map((s) => s.company_id));

  return {
    totalCustomers: uniqueCustomers.size,
    totalDomains: domains.data?.length ?? 0,
    totalServices: serviceRows.length,
    activeServices: serviceRows.filter((s) => s.status === "active").length,
    suspendedServices: serviceRows.filter((s) => s.status === "suspended").length,
    failedOrders: orderRows.filter((o) => o.status === "failed").length,
    pendingOrders: orderRows.filter((o) => o.status === "pending").length,
    totalRevenueCents: (payments.data ?? []).reduce((sum, p) => sum + (p.amount_cents ?? 0), 0),
    diskUsageMb: usageRows.reduce((sum, u) => sum + (u.disk_used_mb ?? 0), 0),
    mailboxUsage: usageRows.reduce((sum, u) => sum + (u.email_accounts_used ?? 0), 0),
    databaseUsage: usageRows.reduce((sum, u) => sum + (u.databases_used ?? 0), 0),
    apiConnectionStatus:
      (defaultServer.data?.last_connection_status as string | null) ??
      settings.lastConnectionStatus ??
      null,
    recentOrders: orderRows,
    recentLogs: (logs.data ?? []) as HostingProvisioningLogRow[],
  };
}

export async function getAdminHostingPlans(): Promise<HostingPlanRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_plans")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data ?? []) as HostingPlanRow[];
}

export async function getAdminHostingOrders() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_orders")
    .select("*, hosting_plans(name, slug), companies(name, slug)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAdminHostingServices() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_services")
    .select("*, hosting_plans(name, slug), companies(name, slug), hosting_servers(name)")
    .order("created_at", { ascending: false });
  return (data ?? []) as (HostingServiceRow & {
    companies?: { name: string; slug: string };
    hosting_servers?: { name: string };
  })[];
}

export async function getAdminHostingServers(): Promise<HostingServerRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_servers")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []).map((row) => sanitizeServerRow(row as Record<string, unknown>));
}

export async function getAdminServicePlans(serverId?: string): Promise<HostingServicePlanRow[]> {
  const admin = createAdminClient();
  let query = admin.from("hosting_service_plans").select("*").order("name");
  if (serverId) query = query.eq("server_id", serverId);
  const { data } = await query;
  return (data ?? []) as HostingServicePlanRow[];
}

export async function getAdminHostingDomains() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_domains")
    .select("*, companies(name, slug), hosting_services(domain_name, status)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAdminProvisioningLogs() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_provisioning_logs")
    .select("*, companies(name), hosting_orders(domain_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getAdminHostingSettingsPageData() {
  const [settings, servers] = await Promise.all([
    getAdminHostingSettings(),
    getAdminHostingServers(),
  ]);
  return { settings, servers };
}

function normalizeDomainName(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

function canRemoveHostingOrder(order: {
  status: string;
  payment_status: string;
}): boolean {
  if (order.status === "failed" || order.status === "cancelled") return true;
  if (order.status === "pending" && order.payment_status === "unpaid") return true;
  return false;
}

export async function removeHostingOrderRecords(
  orderId: string
): Promise<{ ok: true; domainName: string } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from("hosting_orders")
    .select("id, domain_name, status, payment_status, invoice_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) return { ok: false, error: orderError.message };
  if (!order) return { ok: false, error: "Hosting order not found." };
  if (!canRemoveHostingOrder(order)) {
    return {
      ok: false,
      error: "Only failed, cancelled, or unpaid pending orders can be removed.",
    };
  }

  const { data: service } = await admin
    .from("hosting_services")
    .select("id, status, plesk_subscription_id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (service?.plesk_subscription_id) {
    return {
      ok: false,
      error: "Terminate the provisioned service before removing this order.",
    };
  }

  const serviceId = service?.id ?? null;

  await admin.from("hosting_email_logs").delete().eq("order_id", orderId);
  await admin.from("hosting_provisioning_logs").delete().eq("order_id", orderId);

  if (serviceId) {
    await admin.from("hosting_mailboxes").delete().eq("service_id", serviceId);
    await admin.from("hosting_ftp_accounts").delete().eq("service_id", serviceId);
    await admin.from("hosting_databases").delete().eq("service_id", serviceId);
    await admin.from("hosting_dns_records").delete().eq("service_id", serviceId);
    await admin.from("hosting_usage_snapshots").delete().eq("service_id", serviceId);
    await admin.from("hosting_domains").delete().eq("service_id", serviceId);
    await admin.from("hosting_services").delete().eq("id", serviceId);
  }

  await admin.from("hosting_payments").delete().eq("order_id", orderId);
  await admin.from("hosting_orders").update({ invoice_id: null }).eq("id", orderId);

  if (order.invoice_id) {
    await admin.from("hosting_invoices").delete().eq("id", order.invoice_id);
  }

  const { error: deleteOrderError } = await admin.from("hosting_orders").delete().eq("id", orderId);
  if (deleteOrderError) return { ok: false, error: deleteOrderError.message };

  return { ok: true, domainName: order.domain_name };
}

export async function removeHostingOrderByDomain(
  domainName: string
): Promise<{ ok: true; domainName: string; orderId: string } | { ok: false; error: string }> {
  const normalized = normalizeDomainName(domainName);
  if (!normalized) return { ok: false, error: "Domain is required." };

  const admin = createAdminClient();
  const { data: orders, error } = await admin
    .from("hosting_orders")
    .select("id")
    .ilike("domain_name", normalized);

  if (error) return { ok: false, error: error.message };
  if (!orders?.length) return { ok: false, error: `No hosting order found for ${normalized}.` };

  let lastError: string | undefined;
  for (const order of orders) {
    const result = await removeHostingOrderRecords(order.id);
    if (result.ok) {
      return { ok: true, domainName: result.domainName, orderId: order.id };
    }
    lastError = result.error;
  }

  return { ok: false, error: lastError ?? "Failed to remove hosting order." };
}
