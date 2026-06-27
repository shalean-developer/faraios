import { escapeXml, getAllXmlBlocks, getXmlText, pleskXmlRequest } from "@/lib/hosting/plesk/pleskXmlClient";
import type { PleskCredentials, PleskDatabase } from "@/lib/hosting/plesk/pleskTypes";

export async function listPleskDatabases(
  creds: PleskCredentials,
  siteId: string,
  serverId?: string
): Promise<{ ok: true; databases: PleskDatabase[] } | { ok: false; error: string }> {
  const inner = `<database><get-db><filter><webspace-id>${escapeXml(siteId)}</webspace-id></filter></get-db></database>`;
  const result = await pleskXmlRequest(creds, inner, { serverId, action: "list_databases" });
  if (!result.ok) return { ok: false, error: result.error };

  const databases: PleskDatabase[] = [];
  for (const block of getAllXmlBlocks(result.rawXml, "result")) {
    if (getXmlText(block, "status") === "error") continue;
    const name = getXmlText(block, "name");
    if (!name) continue;
    databases.push({
      id: getXmlText(block, "id") ?? undefined,
      name,
      type: getXmlText(block, "type") ?? "mysql",
    });
  }

  return { ok: true, databases };
}

export async function createPleskDatabase(
  creds: PleskCredentials,
  input: {
    siteId: string;
    dbName: string;
    dbType?: string;
    serviceId?: string;
    companyId?: string;
    serverId?: string;
  }
): Promise<{ ok: true; database: PleskDatabase } | { ok: false; error: string }> {
  const dbType = input.dbType ?? "mysql";
  const inner = `<database><add-db><webspace-id>${escapeXml(input.siteId)}</webspace-id><name>${escapeXml(input.dbName)}</name><type>${escapeXml(dbType)}</type></add-db></database>`;

  const result = await pleskXmlRequest(creds, inner, {
    serviceId: input.serviceId,
    companyId: input.companyId,
    serverId: input.serverId,
    action: "create_database",
  });

  if (!result.ok) return { ok: false, error: result.error };

  const block = getAllXmlBlocks(result.rawXml, "result")[0];
  return {
    ok: true,
    database: {
      id: block ? getXmlText(block, "id") ?? undefined : undefined,
      name: input.dbName,
      type: dbType,
    },
  };
}

export async function createPleskDatabaseUser(
  creds: PleskCredentials,
  input: {
    dbId: string;
    login: string;
    password: string;
    serviceId?: string;
    serverId?: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inner = `<database><add-db-user><db-id>${escapeXml(input.dbId)}</db-id><login>${escapeXml(input.login)}</login><password>${escapeXml(input.password)}</password></add-db-user></database>`;

  const result = await pleskXmlRequest(creds, inner, {
    serviceId: input.serviceId,
    serverId: input.serverId,
    action: "create_database_user",
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function deletePleskDatabase(
  creds: PleskCredentials,
  dbId: string,
  serverId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inner = `<database><del-db><filter><id>${escapeXml(dbId)}</id></filter></del-db></database>`;
  const result = await pleskXmlRequest(creds, inner, { serverId, action: "delete_database" });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
