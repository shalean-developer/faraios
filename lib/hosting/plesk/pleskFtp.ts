import { escapeXml, getAllXmlBlocks, getXmlText, pleskXmlRequest } from "@/lib/hosting/plesk/pleskXmlClient";
import type { PleskCredentials, PleskFtpAccount } from "@/lib/hosting/plesk/pleskTypes";

export async function listPleskFtpAccounts(
  creds: PleskCredentials,
  siteId: string,
  serverId?: string
): Promise<{ ok: true; accounts: PleskFtpAccount[] } | { ok: false; error: string }> {
  const inner = `<site><ftp_users><get><filter><site-id>${escapeXml(siteId)}</site-id></filter></get></ftp_users></site>`;
  const result = await pleskXmlRequest(creds, inner, { serverId, action: "list_ftp_accounts" });
  if (!result.ok) return { ok: false, error: result.error };

  const accounts: PleskFtpAccount[] = [];
  for (const block of getAllXmlBlocks(result.rawXml, "result")) {
    if (getXmlText(block, "status") === "error") continue;
    const name = getXmlText(block, "name");
    if (!name) continue;
    accounts.push({
      id: getXmlText(block, "id") ?? undefined,
      name,
      homeDirectory: getXmlText(block, "home") ?? undefined,
    });
  }

  return { ok: true, accounts };
}

export async function createPleskFtpAccount(
  creds: PleskCredentials,
  input: {
    siteId: string;
    username: string;
    password: string;
    homeDirectory?: string;
    serviceId?: string;
    companyId?: string;
    serverId?: string;
  }
): Promise<{ ok: true; account: PleskFtpAccount } | { ok: false; error: string }> {
  const home = input.homeDirectory
    ? `<home>${escapeXml(input.homeDirectory)}</home>`
    : "";
  const inner = `<site><ftp_users><add><filter><site-id>${escapeXml(input.siteId)}</site-id></filter><name>${escapeXml(input.username)}</name><password>${escapeXml(input.password)}</password>${home}</add></ftp_users></site>`;

  const result = await pleskXmlRequest(creds, inner, {
    serviceId: input.serviceId,
    companyId: input.companyId,
    serverId: input.serverId,
    action: "create_ftp_account",
  });

  if (!result.ok) return { ok: false, error: result.error };

  return {
    ok: true,
    account: {
      name: input.username,
      homeDirectory: input.homeDirectory,
    },
  };
}

export async function resetPleskFtpPassword(
  creds: PleskCredentials,
  input: {
    siteId: string;
    username: string;
    password: string;
    serviceId?: string;
    serverId?: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inner = `<site><ftp_users><set><filter><site-id>${escapeXml(input.siteId)}</site-id><name>${escapeXml(input.username)}</name></filter><values><password>${escapeXml(input.password)}</password></values></set></ftp_users></site>`;

  const result = await pleskXmlRequest(creds, inner, {
    serviceId: input.serviceId,
    serverId: input.serverId,
    action: "reset_ftp_password",
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function deletePleskFtpAccount(
  creds: PleskCredentials,
  siteId: string,
  username: string,
  serverId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inner = `<site><ftp_users><del><filter><site-id>${escapeXml(siteId)}</site-id><name>${escapeXml(username)}</name></filter></del></ftp_users></site>`;
  const result = await pleskXmlRequest(creds, inner, { serverId, action: "delete_ftp_account" });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
