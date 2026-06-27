import { createAdminClient } from "@/lib/supabase/admin";
import { getPleskCredentials, encryptServerSecret } from "@/lib/hosting/plesk/config";
import { defaultXmlEndpoint } from "@/lib/hosting/plesk/pleskXmlClient";
import {
  testPleskConnection,
  importPleskServicePlans,
} from "@/lib/hosting/plesk/pleskServicePlans";
import { syncPleskSubscriptions } from "@/lib/hosting/plesk/pleskSubscriptions";
import type { PleskCredentials } from "@/lib/hosting/plesk/pleskTypes";
import type { HostingServerRow } from "@/types/hosting-automation";

export function sanitizeServerRow(
  server: Record<string, unknown>
): HostingServerRow {
  return {
    id: String(server.id),
    name: String(server.name),
    hostname: String(server.hostname),
    plesk_url: String(server.plesk_url),
    xml_api_endpoint: server.xml_api_endpoint ? String(server.xml_api_endpoint) : null,
    api_username: server.api_username ? String(server.api_username) : null,
    has_api_secret: Boolean(server.api_secret_encrypted),
    api_type: String(server.api_type ?? "xml"),
    is_default: Boolean(server.is_default),
    is_active: Boolean(server.is_active),
    default_nameservers: (server.default_nameservers as string[]) ?? [],
    last_connection_status: server.last_connection_status
      ? String(server.last_connection_status)
      : null,
    last_connection_at: server.last_connection_at ? String(server.last_connection_at) : null,
    last_connection_message: server.last_connection_message
      ? String(server.last_connection_message)
      : null,
    notes: server.notes ? String(server.notes) : null,
  };
}

export function buildCredentialsFromInput(input: {
  pleskUrl: string;
  xmlApiEndpoint?: string;
  apiUsername: string;
  apiSecret: string;
  serverId?: string;
  defaultNameservers?: string[];
}): PleskCredentials {
  const url = input.pleskUrl.replace(/\/$/, "");
  return {
    url,
    xmlEndpoint: input.xmlApiEndpoint?.trim() || defaultXmlEndpoint(url),
    username: input.apiUsername,
    secret: input.apiSecret,
    serverId: input.serverId,
    defaultNameservers: input.defaultNameservers ?? [],
  };
}

export async function runPleskTestConnection(
  serverId: string
): Promise<{ ok: true; status: string; message: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: server } = await admin
    .from("hosting_servers")
    .select("*")
    .eq("id", serverId)
    .maybeSingle();

  if (!server) return { ok: false, error: "Server not found." };

  const creds = await getPleskCredentials(serverId);
  if (!creds) return { ok: false, error: "Server credentials not configured." };

  const result = await testPleskConnection(creds, serverId);
  const now = new Date().toISOString();

  await admin
    .from("hosting_servers")
    .update({
      last_connection_status: result.status,
      last_connection_at: now,
      last_connection_message: result.message,
      api_type: result.apiType,
      updated_at: now,
    })
    .eq("id", serverId);

  if (result.status !== "connected") {
    return { ok: false, error: result.message };
  }

  return { ok: true, status: result.status, message: result.message };
}

export async function runImportPleskServicePlans(serverId: string) {
  const creds = await getPleskCredentials(serverId);
  if (!creds) return { ok: false as const, error: "Server credentials not configured." };

  const result = await importPleskServicePlans(creds, serverId);
  if (!result.ok) return result;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  for (const plan of result.plans) {
    await admin.from("hosting_service_plans").upsert(
      {
        server_id: serverId,
        plesk_plan_id: plan.id,
        name: plan.name,
        storage_limit_gb: plan.storageLimitGb ?? null,
        bandwidth_limit_gb: plan.bandwidthLimitGb ?? null,
        domain_limit: plan.domainLimit ?? null,
        subdomain_limit: plan.subdomainLimit ?? null,
        mailbox_limit: plan.mailboxLimit ?? null,
        ftp_account_limit: plan.ftpAccountLimit ?? null,
        database_limit: plan.databaseLimit ?? null,
        is_active: true,
        synced_at: now,
        updated_at: now,
      },
      { onConflict: "server_id,plesk_plan_id" }
    );
  }

  return { ok: true as const, count: result.plans.length };
}

export async function runSyncPleskSubscriptions(serverId: string) {
  const creds = await getPleskCredentials(serverId);
  if (!creds) return { ok: false as const, error: "Server credentials not configured." };

  const result = await syncPleskSubscriptions(creds, serverId);
  if (!result.ok) return result;

  const admin = createAdminClient();
  let synced = 0;

  for (const sub of result.subscriptions) {
    const { data: existing } = await admin
      .from("hosting_services")
      .select("id")
      .eq("plesk_subscription_id", sub.id)
      .maybeSingle();

    if (existing) {
      await admin
        .from("hosting_services")
        .update({
          plesk_domain_id: sub.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      synced++;
      continue;
    }

    const { data: domainRow } = await admin
      .from("hosting_domains")
      .select("company_id, service_id")
      .eq("domain_name", sub.domainName)
      .maybeSingle();

    if (domainRow?.service_id) {
      await admin
        .from("hosting_services")
        .update({
          plesk_subscription_id: sub.id,
          plesk_customer_id: sub.customerId ?? null,
          server_id: serverId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", domainRow.service_id);
      synced++;
    }
  }

  return { ok: true as const, count: result.subscriptions.length, synced };
}

export async function saveHostingServerRecord(input: {
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
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const url = input.pleskUrl.trim().replace(/\/$/, "");

  const row: Record<string, unknown> = {
    name: input.name.trim(),
    hostname: input.hostname.trim(),
    plesk_url: url,
    xml_api_endpoint: input.xmlApiEndpoint?.trim() || defaultXmlEndpoint(url),
    api_type: "xml",
    is_default: input.isDefault,
    is_active: input.isActive,
    default_nameservers: input.defaultNameservers,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.apiUsername?.trim()) {
    row.api_username = input.apiUsername.trim();
  }

  if (input.apiSecret?.trim()) {
    row.api_secret_encrypted = encryptServerSecret(input.apiSecret.trim());
  }

  if (input.isDefault) {
    await admin.from("hosting_servers").update({ is_default: false }).neq("id", input.id ?? "");
  }

  if (input.id) {
    if (!input.apiSecret?.trim()) {
      const { data: existing } = await admin
        .from("hosting_servers")
        .select("api_secret_encrypted, api_username")
        .eq("id", input.id)
        .maybeSingle();
      if (!existing?.api_secret_encrypted && !input.apiSecret) {
        return { ok: false, error: "API secret is required for new credentials." };
      }
    }

    const { error } = await admin.from("hosting_servers").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: input.id };
  }

  if (!input.apiUsername?.trim() || !input.apiSecret?.trim()) {
    return { ok: false, error: "API username and secret are required." };
  }

  const { data, error } = await admin.from("hosting_servers").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };
  return { ok: true, id: data.id };
}
