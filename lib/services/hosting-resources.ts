import { createAdminClient } from "@/lib/supabase/admin";
import { getPleskCredentials } from "@/lib/hosting/plesk/config";
import {
  addPleskDnsRecord,
  deletePleskDnsRecord,
  getPleskDnsRecords,
  updatePleskDnsRecord,
} from "@/lib/hosting/plesk/pleskDns";
import {
  createPleskDatabase,
  createPleskDatabaseUser,
  listPleskDatabases,
} from "@/lib/hosting/plesk/pleskDatabases";
import {
  createPleskFtpAccount,
  listPleskFtpAccounts,
  resetPleskFtpPassword,
} from "@/lib/hosting/plesk/pleskFtp";
import {
  createPleskMailbox,
  listPleskMailboxes,
  resetPleskMailboxPassword,
} from "@/lib/hosting/plesk/pleskMail";
import type { PleskDnsRecord } from "@/lib/hosting/plesk/pleskTypes";

async function getServiceContext(serviceId: string) {
  const admin = createAdminClient();
  const { data: service } = await admin
    .from("hosting_services")
    .select("*, hosting_plans(*)")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service?.plesk_subscription_id) return null;

  const creds = await getPleskCredentials(service.server_id);
  if (!creds) return null;

  return {
    service,
    creds,
    siteId: service.plesk_subscription_id,
    serverId: service.server_id ?? undefined,
  };
}

export async function syncServiceDnsRecords(serviceId: string) {
  const ctx = await getServiceContext(serviceId);
  if (!ctx) return { ok: false as const, error: "Service not provisioned." };

  const result = await getPleskDnsRecords(ctx.creds, ctx.siteId, ctx.serverId);
  if (!result.ok) return result;

  const admin = createAdminClient();
  const seenPleskIds = new Set<string>();

  for (const rec of result.records) {
    const row = {
      company_id: ctx.service.company_id,
      service_id: serviceId,
      domain_name: ctx.service.domain_name,
      record_type: rec.type,
      host: rec.host,
      value: rec.value,
      priority: rec.priority ?? null,
      ttl: rec.ttl ?? 3600,
      plesk_record_id: rec.id ?? null,
      status: "active",
      updated_at: new Date().toISOString(),
    };

    if (rec.id) {
      seenPleskIds.add(rec.id);
      const { data: existing } = await admin
        .from("hosting_dns_records")
        .select("id")
        .eq("service_id", serviceId)
        .eq("plesk_record_id", rec.id)
        .maybeSingle();

      if (existing?.id) {
        await admin.from("hosting_dns_records").update(row).eq("id", existing.id);
      } else {
        await admin.from("hosting_dns_records").insert(row);
      }
      continue;
    }

    await admin.from("hosting_dns_records").insert(row);
  }

  const { data: existingRows } = await admin
    .from("hosting_dns_records")
    .select("id, plesk_record_id")
    .eq("service_id", serviceId);

  for (const row of existingRows ?? []) {
    const pleskId = row.plesk_record_id as string | null;
    if (pleskId && !seenPleskIds.has(pleskId)) {
      await admin.from("hosting_dns_records").delete().eq("id", row.id);
    }
  }

  const { data } = await admin
    .from("hosting_dns_records")
    .select("*")
    .eq("service_id", serviceId)
    .order("record_type");

  return { ok: true as const, records: data ?? [] };
}

export async function adminAddDnsRecord(
  serviceId: string,
  record: Omit<PleskDnsRecord, "id">
) {
  const ctx = await getServiceContext(serviceId);
  if (!ctx) return { ok: false as const, error: "Service not provisioned." };

  const result = await addPleskDnsRecord(ctx.creds, {
    siteId: ctx.siteId,
    record,
    serverId: ctx.serverId,
  });
  if (!result.ok) return result;

  const admin = createAdminClient();
  await admin.from("hosting_dns_records").insert({
    company_id: ctx.service.company_id,
    service_id: serviceId,
    domain_name: ctx.service.domain_name,
    record_type: record.type,
    host: record.host,
    value: record.value,
    priority: record.priority ?? null,
    ttl: record.ttl ?? 3600,
    plesk_record_id: result.recordId ?? null,
    status: "active",
  });

  return { ok: true as const };
}

export async function adminUpdateDnsRecord(
  serviceId: string,
  recordId: string,
  record: Omit<PleskDnsRecord, "id">
) {
  const ctx = await getServiceContext(serviceId);
  if (!ctx) return { ok: false as const, error: "Service not provisioned." };

  const admin = createAdminClient();
  const { data: dbRecord } = await admin
    .from("hosting_dns_records")
    .select("plesk_record_id")
    .eq("id", recordId)
    .eq("service_id", serviceId)
    .maybeSingle();

  if (!dbRecord?.plesk_record_id) {
    return { ok: false as const, error: "DNS record not found." };
  }

  const result = await updatePleskDnsRecord(ctx.creds, {
    siteId: ctx.siteId,
    recordId: dbRecord.plesk_record_id,
    record,
    serverId: ctx.serverId,
  });
  if (!result.ok) return result;

  await admin
    .from("hosting_dns_records")
    .update({
      host: record.host,
      value: record.value,
      priority: record.priority ?? null,
      ttl: record.ttl ?? 3600,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recordId);

  return { ok: true as const };
}

export async function adminDeleteDnsRecord(serviceId: string, recordId: string) {
  const ctx = await getServiceContext(serviceId);
  if (!ctx) return { ok: false as const, error: "Service not provisioned." };

  const admin = createAdminClient();
  const { data: dbRecord } = await admin
    .from("hosting_dns_records")
    .select("plesk_record_id")
    .eq("id", recordId)
    .maybeSingle();

  if (dbRecord?.plesk_record_id) {
    await deletePleskDnsRecord(ctx.creds, ctx.siteId, dbRecord.plesk_record_id, ctx.serverId);
  }

  await admin.from("hosting_dns_records").delete().eq("id", recordId);
  return { ok: true as const };
}

function generatePassword(): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  let pass = "";
  for (let i = 0; i < 16; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

export async function adminCreateMailbox(input: {
  serviceId: string;
  mailboxName: string;
  password?: string;
  quotaMb?: number;
}) {
  const ctx = await getServiceContext(input.serviceId);
  if (!ctx) return { ok: false as const, error: "Service not provisioned." };

  const password = input.password ?? generatePassword();
  const email = input.mailboxName.includes("@")
    ? input.mailboxName
    : `${input.mailboxName}@${ctx.service.domain_name}`;

  const result = await createPleskMailbox(ctx.creds, {
    siteId: ctx.siteId,
    mailboxName: input.mailboxName.split("@")[0],
    password,
    quotaMb: input.quotaMb ?? 1024,
    serviceId: input.serviceId,
    companyId: ctx.service.company_id,
    serverId: ctx.serverId,
  });
  if (!result.ok) return result;

  const admin = createAdminClient();
  await admin.from("hosting_mailboxes").insert({
    company_id: ctx.service.company_id,
    service_id: input.serviceId,
    email_address: email,
    mailbox_name: input.mailboxName.split("@")[0],
    quota_mb: input.quotaMb ?? 1024,
    status: "active",
  });

  return { ok: true as const, email };
}

export async function adminCreateFtpAccount(input: {
  serviceId: string;
  username: string;
  password?: string;
  homeDirectory?: string;
}) {
  const ctx = await getServiceContext(input.serviceId);
  if (!ctx) return { ok: false as const, error: "Service not provisioned." };

  const password = input.password ?? generatePassword();
  const result = await createPleskFtpAccount(ctx.creds, {
    siteId: ctx.siteId,
    username: input.username,
    password,
    homeDirectory: input.homeDirectory,
    serviceId: input.serviceId,
    companyId: ctx.service.company_id,
    serverId: ctx.serverId,
  });
  if (!result.ok) return result;

  const admin = createAdminClient();
  await admin.from("hosting_ftp_accounts").insert({
    company_id: ctx.service.company_id,
    service_id: input.serviceId,
    username: input.username,
    home_directory: input.homeDirectory ?? null,
    status: "active",
  });

  return { ok: true as const, username: input.username };
}

export async function adminCreateDatabase(input: {
  serviceId: string;
  dbName: string;
  dbUser?: string;
  dbPassword?: string;
}) {
  const ctx = await getServiceContext(input.serviceId);
  if (!ctx) return { ok: false as const, error: "Service not provisioned." };

  const result = await createPleskDatabase(ctx.creds, {
    siteId: ctx.siteId,
    dbName: input.dbName,
    serviceId: input.serviceId,
    companyId: ctx.service.company_id,
    serverId: ctx.serverId,
  });
  if (!result.ok) return result;

  if (input.dbUser && result.database.id) {
    await createPleskDatabaseUser(ctx.creds, {
      dbId: result.database.id,
      login: input.dbUser,
      password: input.dbPassword ?? generatePassword(),
      serviceId: input.serviceId,
      serverId: ctx.serverId,
    });
  }

  const admin = createAdminClient();
  await admin.from("hosting_databases").insert({
    company_id: ctx.service.company_id,
    service_id: input.serviceId,
    db_name: input.dbName,
    db_user: input.dbUser ?? null,
    db_type: "mysql",
    plesk_db_id: result.database.id ?? null,
    status: "active",
  });

  return { ok: true as const, dbName: input.dbName };
}

export async function getServiceMailboxes(serviceId: string, companyId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_mailboxes")
    .select("*")
    .eq("service_id", serviceId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const ctx = await getServiceContext(serviceId);
  if (ctx) {
    const remote = await listPleskMailboxes(ctx.creds, ctx.siteId, ctx.serverId);
    if (remote.ok && remote.mailboxes.length > (data?.length ?? 0)) {
      for (const mb of remote.mailboxes) {
        const email = mb.email.includes("@")
          ? mb.email
          : `${mb.name}@${ctx.service.domain_name}`;
        const exists = data?.some((d) => d.email_address === email);
        if (!exists) {
          await admin.from("hosting_mailboxes").insert({
            company_id: companyId,
            service_id: serviceId,
            email_address: email,
            mailbox_name: mb.name,
            quota_mb: mb.quotaMb ?? 1024,
            status: "active",
          });
        }
      }
      const { data: refreshed } = await admin
        .from("hosting_mailboxes")
        .select("*")
        .eq("service_id", serviceId)
        .eq("company_id", companyId);
      return refreshed ?? [];
    }
  }

  return data ?? [];
}

export async function getServiceFtpAccounts(serviceId: string, companyId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_ftp_accounts")
    .select("*")
    .eq("service_id", serviceId)
    .eq("company_id", companyId);

  const ctx = await getServiceContext(serviceId);
  if (ctx) {
    const remote = await listPleskFtpAccounts(ctx.creds, ctx.siteId, ctx.serverId);
    if (remote.ok) {
      for (const acc of remote.accounts) {
        const exists = data?.some((d) => d.username === acc.name);
        if (!exists) {
          await admin.from("hosting_ftp_accounts").insert({
            company_id: companyId,
            service_id: serviceId,
            username: acc.name,
            home_directory: acc.homeDirectory ?? null,
            status: "active",
          });
        }
      }
      const { data: refreshed } = await admin
        .from("hosting_ftp_accounts")
        .select("*")
        .eq("service_id", serviceId)
        .eq("company_id", companyId);
      return refreshed ?? [];
    }
  }

  return data ?? [];
}

export async function getServiceDatabases(serviceId: string, companyId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_databases")
    .select("*")
    .eq("service_id", serviceId)
    .eq("company_id", companyId);

  const ctx = await getServiceContext(serviceId);
  if (ctx) {
    const remote = await listPleskDatabases(ctx.creds, ctx.siteId, ctx.serverId);
    if (remote.ok) {
      for (const db of remote.databases) {
        const exists = data?.some((d) => d.db_name === db.name);
        if (!exists) {
          await admin.from("hosting_databases").insert({
            company_id: companyId,
            service_id: serviceId,
            db_name: db.name,
            db_type: db.type ?? "mysql",
            plesk_db_id: db.id ?? null,
            status: "active",
          });
        }
      }
      const { data: refreshed } = await admin
        .from("hosting_databases")
        .select("*")
        .eq("service_id", serviceId)
        .eq("company_id", companyId);
      return refreshed ?? [];
    }
  }

  return data ?? [];
}

export async function resetMailboxPasswordForService(
  serviceId: string,
  mailboxName: string,
  password?: string
) {
  const ctx = await getServiceContext(serviceId);
  if (!ctx) return { ok: false as const, error: "Service not provisioned." };

  const newPassword = password ?? generatePassword();
  const result = await resetPleskMailboxPassword(ctx.creds, {
    siteId: ctx.siteId,
    mailboxName: mailboxName.split("@")[0],
    password: newPassword,
    serviceId,
    serverId: ctx.serverId,
  });

  return result.ok ? { ok: true as const, password: newPassword } : result;
}

export async function resetFtpPasswordForService(
  serviceId: string,
  username: string,
  password?: string
) {
  const ctx = await getServiceContext(serviceId);
  if (!ctx) return { ok: false as const, error: "Service not provisioned." };

  const newPassword = password ?? generatePassword();
  const result = await resetPleskFtpPassword(ctx.creds, {
    siteId: ctx.siteId,
    username,
    password: newPassword,
    serviceId,
    serverId: ctx.serverId,
  });

  return result.ok ? { ok: true as const, password: newPassword } : result;
}

/** Fast DB-only reads for company dashboard pages (no Plesk sync on load). */
export async function listCompanyDnsRecords(companyId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_dns_records")
    .select("*")
    .eq("company_id", companyId)
    .order("record_type")
    .order("host");
  return data ?? [];
}

export async function listCompanyMailboxes(companyId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_mailboxes")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listCompanyFtpAccounts(companyId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_ftp_accounts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listCompanyDatabases(companyId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_databases")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export type HostingServiceResourceSummary = {
  domains: number;
  dnsRecords: number;
  mailboxes: number;
  ftpAccounts: number;
  databases: number;
  openTickets: number;
};

export async function getServiceResourceSummary(
  serviceId: string,
  companyId: string
): Promise<HostingServiceResourceSummary> {
  const admin = createAdminClient();

  const [domains, dnsRecords, mailboxes, ftpAccounts, databases, tickets] = await Promise.all([
    admin
      .from("hosting_domains")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("service_id", serviceId),
    admin
      .from("hosting_dns_records")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("service_id", serviceId),
    admin
      .from("hosting_mailboxes")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("service_id", serviceId),
    admin
      .from("hosting_ftp_accounts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("service_id", serviceId),
    admin
      .from("hosting_databases")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("service_id", serviceId),
    admin
      .from("hosting_support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("service_id", serviceId)
      .eq("status", "open"),
  ]);

  return {
    domains: domains.count ?? 0,
    dnsRecords: dnsRecords.count ?? 0,
    mailboxes: mailboxes.count ?? 0,
    ftpAccounts: ftpAccounts.count ?? 0,
    databases: databases.count ?? 0,
    openTickets: tickets.count ?? 0,
  };
}
