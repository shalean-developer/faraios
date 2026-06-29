import { createAdminClient } from "@/lib/supabase/admin";
import { getPleskCredentials } from "@/lib/hosting/plesk/config";
import { createPleskCustomer } from "@/lib/hosting/plesk/pleskCustomers";
import {
  changePleskServicePlan,
  createPleskSubscription,
  findPleskSubscriptionByDomain,
  isPleskDuplicateDomainError,
  suspendPleskSubscription,
  terminatePleskSubscription,
  unsuspendPleskSubscription,
} from "@/lib/hosting/plesk/pleskSubscriptions";
import { syncPleskUsage } from "@/lib/hosting/plesk/pleskUsage";
import { logPleskRequest } from "@/lib/hosting/plesk/pleskXmlClient";

type LogInput = {
  companyId?: string;
  orderId?: string;
  serviceId?: string;
  serverId?: string;
  action: string;
  status: "success" | "failed" | "pending";
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  errorMessage?: string;
};

async function logProvisioning(input: LogInput): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("hosting_provisioning_logs")
      .insert({
        company_id: input.companyId ?? null,
        order_id: input.orderId ?? null,
        service_id: input.serviceId ?? null,
        server_id: input.serverId ?? null,
        action: input.action,
        status: input.status,
        request_payload: input.requestPayload ?? null,
        response_payload: input.responsePayload ?? null,
        error_message: input.errorMessage ?? null,
      })
      .select("id")
      .single();

    if (error) return null;
    return data?.id ?? null;
  } catch {
    return null;
  }
}

function generateUsername(domain: string): string {
  const base = domain.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase() || "host";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}${suffix}`.slice(0, 16);
}

function generatePassword(): string {
  const chars =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  let pass = "";
  for (let i = 0; i < 16; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

export type CreateHostingAccountInput = {
  companyId: string;
  orderId: string;
  serviceId: string;
  domainName: string;
  planSlug: string;
  pleskServicePlan: string;
  serverId?: string | null;
  companyName?: string;
  companyEmail?: string;
};

export type CreateHostingAccountResult =
  | {
      ok: true;
      pleskSubscriptionId: string;
      pleskCustomerId: string;
      username: string;
      controlPanelUrl: string;
    }
  | { ok: false; error: string };

export async function createHostingAccount(
  input: CreateHostingAccountInput
): Promise<CreateHostingAccountResult> {
  const creds = await getPleskCredentials(input.serverId);
  if (!creds) {
    await logProvisioning({
      companyId: input.companyId,
      orderId: input.orderId,
      serviceId: input.serviceId,
      serverId: input.serverId ?? undefined,
      action: "create_account",
      status: "failed",
      requestPayload: { domain: input.domainName, plan: input.pleskServicePlan },
      errorMessage: "Plesk credentials not configured",
    });
    return { ok: false, error: "Plesk credentials not configured." };
  }

  const customerLogin = generateUsername(input.domainName);
  const customerPassword = generatePassword();
  const ftpLogin = generateUsername(`${input.domainName}-ftp`);
  const ftpPassword = generatePassword();

  const controlPanelUrl = creds.url.includes(":8443")
    ? creds.url
    : `${creds.url}:8443`;

  const existingSubscription = await findPleskSubscriptionByDomain(
    creds,
    input.domainName,
    input.serverId ?? creds.serverId ?? undefined
  );

  if (existingSubscription) {
    await logProvisioning({
      companyId: input.companyId,
      orderId: input.orderId,
      serviceId: input.serviceId,
      serverId: input.serverId ?? undefined,
      action: "link_existing_subscription",
      status: "success",
      requestPayload: { domain: input.domainName },
      responsePayload: {
        subscriptionId: existingSubscription.id,
        linkedExisting: true,
      },
    });

    return {
      ok: true,
      pleskSubscriptionId: existingSubscription.id,
      pleskCustomerId: existingSubscription.customerId ?? "",
      username: ftpLogin,
      controlPanelUrl,
    };
  }

  const customerResult = await createPleskCustomer(creds, {
    login: customerLogin,
    password: customerPassword,
    name: input.companyName ?? input.domainName,
    email: input.companyEmail,
    companyId: input.companyId,
    orderId: input.orderId,
    serverId: input.serverId ?? creds.serverId ?? undefined,
  });

  if (!customerResult.ok) {
    await logProvisioning({
      companyId: input.companyId,
      orderId: input.orderId,
      serviceId: input.serviceId,
      serverId: input.serverId ?? undefined,
      action: "create_account",
      status: "failed",
      errorMessage: customerResult.error,
    });
    return { ok: false, error: customerResult.error };
  }

  const subscriptionResult = await createPleskSubscription(creds, {
    domainName: input.domainName,
    customerId: customerResult.customer.id,
    planName: input.pleskServicePlan || input.planSlug,
    ftpLogin,
    ftpPassword,
    companyId: input.companyId,
    orderId: input.orderId,
    serviceId: input.serviceId,
    serverId: input.serverId ?? creds.serverId ?? undefined,
  });

  if (!subscriptionResult.ok) {
    if (isPleskDuplicateDomainError(subscriptionResult.error)) {
      const linked = await findPleskSubscriptionByDomain(
        creds,
        input.domainName,
        input.serverId ?? creds.serverId ?? undefined
      );

      if (linked) {
        await logProvisioning({
          companyId: input.companyId,
          orderId: input.orderId,
          serviceId: input.serviceId,
          serverId: input.serverId ?? undefined,
          action: "link_existing_subscription",
          status: "success",
          requestPayload: { domain: input.domainName },
          responsePayload: {
            subscriptionId: linked.id,
            linkedExisting: true,
          },
        });

        return {
          ok: true,
          pleskSubscriptionId: linked.id,
          pleskCustomerId: linked.customerId ?? customerResult.customer.id,
          username: ftpLogin,
          controlPanelUrl,
        };
      }
    }

    await logProvisioning({
      companyId: input.companyId,
      orderId: input.orderId,
      serviceId: input.serviceId,
      serverId: input.serverId ?? undefined,
      action: "create_account",
      status: "failed",
      errorMessage: subscriptionResult.error,
    });
    return { ok: false, error: subscriptionResult.error };
  }

  await logProvisioning({
    companyId: input.companyId,
    orderId: input.orderId,
    serviceId: input.serviceId,
    serverId: input.serverId ?? undefined,
    action: "create_account",
    status: "success",
    requestPayload: {
      domain: input.domainName,
      plan: input.pleskServicePlan,
      customerId: customerResult.customer.id,
    },
    responsePayload: {
      subscriptionId: subscriptionResult.subscription.id,
      ftpLogin: subscriptionResult.ftpLogin,
    },
  });

  return {
    ok: true,
    pleskSubscriptionId: subscriptionResult.subscription.id,
    pleskCustomerId: customerResult.customer.id,
    username: subscriptionResult.ftpLogin,
    controlPanelUrl,
  };
}

async function subscriptionAction(
  serviceId: string,
  action: "suspend" | "unsuspend" | "terminate" | "change_package" | "sync_usage",
  pleskSubscriptionId: string,
  extra?: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: service } = await admin
    .from("hosting_services")
    .select("company_id, order_id, server_id")
    .eq("id", serviceId)
    .maybeSingle();

  const creds = await getPleskCredentials(service?.server_id);
  if (!creds) {
    await logProvisioning({
      companyId: service?.company_id,
      orderId: service?.order_id ?? undefined,
      serviceId,
      serverId: service?.server_id ?? undefined,
      action,
      status: "failed",
      errorMessage: "Plesk credentials not configured",
    });
    return { ok: false, error: "Plesk credentials not configured." };
  }

  const context = {
    serviceId,
    serverId: service?.server_id ?? undefined,
    companyId: service?.company_id,
  };

  let result: { ok: true } | { ok: false; error: string };

  switch (action) {
    case "suspend":
      result = await suspendPleskSubscription(creds, pleskSubscriptionId, context);
      break;
    case "unsuspend":
      result = await unsuspendPleskSubscription(creds, pleskSubscriptionId, context);
      break;
    case "terminate":
      result = await terminatePleskSubscription(creds, pleskSubscriptionId, context);
      break;
    case "change_package":
      result = await changePleskServicePlan(
        creds,
        pleskSubscriptionId,
        String(extra?.planName ?? ""),
        context
      );
      break;
    case "sync_usage":
      result = await syncPleskUsage(
        creds,
        pleskSubscriptionId,
        serviceId,
        service?.server_id ?? undefined
      );
      break;
    default:
      return { ok: false, error: "Unknown action." };
  }

  if (!result.ok) {
    await logPleskRequest(
      { ...context, action },
      "failed",
      { pleskSubscriptionId, ...extra },
      undefined,
      result.error
    );
  }

  return result;
}

export async function suspendHostingService(
  serviceId: string,
  pleskSubscriptionId: string
) {
  return subscriptionAction(serviceId, "suspend", pleskSubscriptionId);
}

export async function unsuspendHostingService(
  serviceId: string,
  pleskSubscriptionId: string
) {
  return subscriptionAction(serviceId, "unsuspend", pleskSubscriptionId);
}

export async function terminateHostingService(
  serviceId: string,
  pleskSubscriptionId: string
) {
  return subscriptionAction(serviceId, "terminate", pleskSubscriptionId);
}

export async function changeHostingPackage(
  serviceId: string,
  pleskSubscriptionId: string,
  planName: string
) {
  return subscriptionAction(serviceId, "change_package", pleskSubscriptionId, {
    planName,
  });
}

export async function resetHostingPassword(
  serviceId: string,
  pleskSubscriptionId: string
) {
  const admin = createAdminClient();
  const { data: service } = await admin
    .from("hosting_services")
    .select("server_id, company_id")
    .eq("id", serviceId)
    .maybeSingle();

  const creds = await getPleskCredentials(service?.server_id);
  if (!creds) return { ok: false as const, error: "Plesk credentials not configured." };

  const { resetPleskFtpPassword } = await import("@/lib/hosting/plesk/pleskFtp");
  const { data: svc } = await admin
    .from("hosting_services")
    .select("username")
    .eq("id", serviceId)
    .maybeSingle();

  if (!svc?.username) return { ok: false as const, error: "FTP username not found." };

  const password = generatePassword();
  const result = await resetPleskFtpPassword(creds, {
    siteId: pleskSubscriptionId,
    username: svc.username,
    password,
    serviceId,
    serverId: service?.server_id ?? undefined,
  });

  return result.ok ? { ok: true as const } : result;
}

export async function syncHostingUsage(
  serviceId: string,
  pleskSubscriptionId: string
): Promise<
  | { ok: true; diskUsedMb: number; bandwidthUsedMb: number }
  | { ok: false; error: string }
> {
  const result = await subscriptionAction(serviceId, "sync_usage", pleskSubscriptionId);
  if (!result.ok) return result;

  const admin = createAdminClient();
  const { data: snapshot } = await admin
    .from("hosting_usage_snapshots")
    .select("disk_used_mb, bandwidth_used_mb")
    .eq("service_id", serviceId)
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ok: true,
    diskUsedMb: snapshot?.disk_used_mb ?? 0,
    bandwidthUsedMb: snapshot?.bandwidth_used_mb ?? 0,
  };
}

// Re-export core Plesk functions for API routes
export {
  testPleskConnection,
  importPleskServicePlans,
  detectApiType,
} from "@/lib/hosting/plesk/pleskServicePlans";
export { syncPleskSubscriptions } from "@/lib/hosting/plesk/pleskSubscriptions";
export { createPleskMailbox } from "@/lib/hosting/plesk/pleskMail";
export { createPleskFtpAccount } from "@/lib/hosting/plesk/pleskFtp";
export { createPleskDatabase } from "@/lib/hosting/plesk/pleskDatabases";
