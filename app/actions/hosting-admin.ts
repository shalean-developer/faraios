"use server";

import { revalidatePath } from "next/cache";
import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import {
  deleteHostingServerRecord,
  runImportPleskServicePlans,
  runPleskTestConnection,
  runSyncPleskSubscriptions,
  saveHostingServerRecord,
} from "@/lib/services/hosting-plesk-admin";
import {
  adminAddDnsRecord,
  adminCreateDatabase,
  adminCreateFtpAccount,
  adminCreateMailbox,
  adminDeleteDnsRecord,
} from "@/lib/services/hosting-resources";
import {
  changeHostingPackage,
  resetHostingPassword,
  suspendHostingService,
  terminateHostingService,
  unsuspendHostingService,
} from "@/lib/hosting/plesk/provisioning";
import {
  notifyServiceSuspended,
  notifyServiceUnsuspended,
} from "@/lib/services/hosting-notifications";
import {
  provisionHostingOrder,
  retryFailedProvisioning,
} from "@/lib/services/hosting-automation";

type AdminResult = { ok: true } | { ok: false; error: string };

async function requirePlatformAdmin(): Promise<AdminResult | null> {
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }
  return null;
}

export async function adminRetryProvisioningAction(orderId: string): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await retryFailedProvisioning(orderId);
  revalidatePath("/admin/hosting/provisioning-logs");
  revalidatePath("/admin/hosting/orders");
  return result.ok ? { ok: true } : result;
}

export async function adminManualProvisionAction(orderId: string): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await provisionHostingOrder(orderId);
  revalidatePath("/admin/hosting/services");
  return result.ok ? { ok: true } : result;
}

export async function adminSuspendHostingServiceAction(serviceId: string): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { data: service } = await admin.client
    .from("hosting_services")
    .select("*")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service?.plesk_subscription_id) {
    return { ok: false, error: "Service not found or not provisioned." };
  }

  const result = await suspendHostingService(serviceId, service.plesk_subscription_id);
  if (!result.ok) return result;

  await admin.client
    .from("hosting_services")
    .update({ status: "suspended", suspended_at: new Date().toISOString() })
    .eq("id", serviceId);

  await notifyServiceSuspended(service.company_id, service.domain_name);
  revalidatePath("/admin/hosting/services");
  return { ok: true };
}

export async function adminUnsuspendHostingServiceAction(serviceId: string): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { data: service } = await admin.client
    .from("hosting_services")
    .select("*")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service?.plesk_subscription_id) {
    return { ok: false, error: "Service not found or not provisioned." };
  }

  const result = await unsuspendHostingService(serviceId, service.plesk_subscription_id);
  if (!result.ok) return result;

  await admin.client
    .from("hosting_services")
    .update({ status: "active", suspended_at: null })
    .eq("id", serviceId);

  await notifyServiceUnsuspended(service.company_id, service.domain_name);
  revalidatePath("/admin/hosting/services");
  return { ok: true };
}

export async function adminTerminateHostingServiceAction(serviceId: string): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { data: service } = await admin.client
    .from("hosting_services")
    .select("*")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service?.plesk_subscription_id) {
    return { ok: false, error: "Service not found or not provisioned." };
  }

  const result = await terminateHostingService(serviceId, service.plesk_subscription_id);
  if (!result.ok) return result;

  await admin.client
    .from("hosting_services")
    .update({
      status: "terminated",
      terminated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);

  revalidatePath("/admin/hosting/services");
  return { ok: true };
}

export async function adminChangeHostingPackageAction(input: {
  serviceId: string;
  planName: string;
}): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { data: service } = await admin.client
    .from("hosting_services")
    .select("*")
    .eq("id", input.serviceId)
    .maybeSingle();

  if (!service?.plesk_subscription_id) {
    return { ok: false, error: "Service not found or not provisioned." };
  }

  const result = await changeHostingPackage(
    input.serviceId,
    service.plesk_subscription_id,
    input.planName
  );
  revalidatePath("/admin/hosting/services");
  return result.ok ? { ok: true } : result;
}

export async function adminResetHostingPasswordAction(serviceId: string): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { data: service } = await admin.client
    .from("hosting_services")
    .select("plesk_subscription_id")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service?.plesk_subscription_id) {
    return { ok: false, error: "Service not found or not provisioned." };
  }

  const result = await resetHostingPassword(serviceId, service.plesk_subscription_id);
  return result.ok ? { ok: true } : result;
}

export async function adminSaveHostingPlanAction(input: {
  id?: string;
  slug: string;
  name: string;
  description?: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  storageLimitGb: number;
  bandwidthLimitGb: number;
  emailAccountLimit: number;
  databaseLimit: number;
  domainLimit: number;
  sslIncluded: boolean;
  backupOption: string;
  pleskServicePlan?: string;
  pleskPlanId?: string;
  subdomainLimit?: number;
  ftpAccountLimit?: number;
  isActive: boolean;
  isPopular: boolean;
}): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const row = {
    slug: input.slug.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    monthly_price_cents: input.monthlyPriceCents,
    yearly_price_cents: input.yearlyPriceCents,
    storage_limit_gb: input.storageLimitGb,
    bandwidth_limit_gb: input.bandwidthLimitGb,
    email_account_limit: input.emailAccountLimit,
    database_limit: input.databaseLimit,
    domain_limit: input.domainLimit,
    ssl_included: input.sslIncluded,
    backup_option: input.backupOption,
    plesk_service_plan: input.pleskServicePlan?.trim() || input.slug,
    plesk_plan_id: input.pleskPlanId?.trim() || null,
    subdomain_limit: input.subdomainLimit ?? 10,
    ftp_account_limit: input.ftpAccountLimit ?? 5,
    is_active: input.isActive,
    is_popular: input.isPopular,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await admin.client.from("hosting_plans").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin.client.from("hosting_plans").insert(row);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/hosting/plans");
  return { ok: true };
}

export async function adminSaveHostingServerAction(input: {
  id?: string;
  name: string;
  hostname: string;
  pleskUrl: string;
  xmlApiEndpoint?: string;
  apiUsername?: string;
  apiSecret?: string;
  isDefault: boolean;
  isActive: boolean;
  defaultNameservers: string[];
  notes?: string;
}): Promise<AdminResult & { id?: string; message?: string }> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await saveHostingServerRecord(input);
  if (!result.ok) return result;

  revalidatePath("/admin/hosting/servers");
  return { ok: true, id: result.id };
}

export async function adminDeleteHostingServerAction(serverId: string): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await deleteHostingServerRecord(serverId);
  if (!result.ok) return result;

  revalidatePath("/admin/hosting/servers");
  revalidatePath("/admin/hosting/settings");
  return { ok: true };
}

export async function adminTestPleskConnectionAction(serverId: string): Promise<
  AdminResult & { status?: string; message?: string }
> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await runPleskTestConnection(serverId);
  revalidatePath("/admin/hosting/servers");
  revalidatePath("/admin/hosting/provisioning-logs");

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, status: result.status, message: result.message };
}

export async function adminImportPleskServicePlansAction(serverId: string): Promise<
  AdminResult & { count?: number }
> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await runImportPleskServicePlans(serverId);
  revalidatePath("/admin/hosting/service-plans");
  revalidatePath("/admin/hosting/plans");

  if (!result.ok) return result;
  return { ok: true, count: result.count };
}

export async function adminSyncPleskSubscriptionsAction(serverId: string): Promise<
  AdminResult & { count?: number; synced?: number }
> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await runSyncPleskSubscriptions(serverId);
  revalidatePath("/admin/hosting/services");
  revalidatePath("/admin/hosting/domains");

  if (!result.ok) return result;
  return { ok: true, count: result.count, synced: result.synced };
}

export async function adminCreateMailboxAction(input: {
  serviceId: string;
  mailboxName: string;
  quotaMb?: number;
}): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await adminCreateMailbox(input);
  revalidatePath("/admin/hosting/mailboxes");
  return result.ok ? { ok: true } : result;
}

export async function adminCreateFtpAction(input: {
  serviceId: string;
  username: string;
  homeDirectory?: string;
}): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await adminCreateFtpAccount(input);
  revalidatePath("/admin/hosting/ftp");
  return result.ok ? { ok: true } : result;
}

export async function adminCreateDatabaseAction(input: {
  serviceId: string;
  dbName: string;
  dbUser?: string;
}): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await adminCreateDatabase(input);
  revalidatePath("/admin/hosting/databases");
  return result.ok ? { ok: true } : result;
}

export async function adminAddDnsRecordAction(input: {
  serviceId: string;
  type: string;
  host: string;
  value: string;
  priority?: number;
  ttl?: number;
}): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await adminAddDnsRecord(input.serviceId, {
    type: input.type,
    host: input.host,
    value: input.value,
    priority: input.priority,
    ttl: input.ttl,
  });
  revalidatePath("/admin/hosting/dns");
  return result.ok ? { ok: true } : result;
}

export async function adminDeleteDnsRecordAction(
  serviceId: string,
  recordId: string
): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await adminDeleteDnsRecord(serviceId, recordId);
  revalidatePath("/admin/hosting/dns");
  return result.ok ? { ok: true } : result;
}

export async function adminUpdateHostingSettingsAction(input: {
  pleskUrl: string;
  pleskUsername: string;
  pleskSecret?: string;
  defaultServerId?: string;
  defaultNameservers: string[];
  welcomeEmailTemplate: string;
}): Promise<AdminResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { data: existing } = await admin.client
    .from("platform_settings")
    .select("integration_settings")
    .eq("id", 1)
    .maybeSingle();

  const currentSettings =
    (existing?.integration_settings as Record<string, unknown>) ?? {};
  const currentPlesk = (currentSettings.plesk as Record<string, unknown>) ?? {};

  const secret = input.pleskSecret?.trim() || String(currentPlesk.secret ?? "").trim();
  if (!input.pleskUrl?.trim() || !input.pleskUsername.trim() || !secret) {
    return { ok: false, error: "Plesk URL, username, and secret are required." };
  }

  const integration_settings = {
    ...currentSettings,
    plesk: {
      url: input.pleskUrl.trim(),
      username: input.pleskUsername.trim(),
      secret,
      xml_endpoint: input.pleskUrl.trim().replace(/\/$/, "") + "/enterprise/control/agent.php",
      default_server_id: input.defaultServerId ?? null,
      default_nameservers: input.defaultNameservers,
      welcome_email_template: input.welcomeEmailTemplate,
    },
  };

  const { error } = await admin.client
    .from("platform_settings")
    .update({ integration_settings, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/hosting/settings");
  return { ok: true };
}
