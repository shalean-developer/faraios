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
