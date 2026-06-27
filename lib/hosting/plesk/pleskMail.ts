import { escapeXml, getAllXmlBlocks, getXmlText, pleskXmlRequest } from "@/lib/hosting/plesk/pleskXmlClient";
import type { PleskCredentials, PleskMailbox } from "@/lib/hosting/plesk/pleskTypes";

export async function listPleskMailboxes(
  creds: PleskCredentials,
  siteId: string,
  serverId?: string
): Promise<{ ok: true; mailboxes: PleskMailbox[] } | { ok: false; error: string }> {
  const inner = `<mail><get><filter><site-id>${escapeXml(siteId)}</site-id></filter><mailbox/></get></mail>`;
  const result = await pleskXmlRequest(creds, inner, { serverId, action: "list_mailboxes" });
  if (!result.ok) return { ok: false, error: result.error };

  const mailboxes: PleskMailbox[] = [];
  for (const block of getAllXmlBlocks(result.rawXml, "result")) {
    if (getXmlText(block, "status") === "error") continue;
    const name = getXmlText(block, "name") ?? getXmlText(block, "mailname");
    if (!name) continue;
    mailboxes.push({
      id: getXmlText(block, "id") ?? undefined,
      name,
      email: name,
      quotaMb: parseInt(getXmlText(block, "quota") ?? "1024", 10) || 1024,
    });
  }

  return { ok: true, mailboxes };
}

export async function createPleskMailbox(
  creds: PleskCredentials,
  input: {
    siteId: string;
    mailboxName: string;
    password: string;
    quotaMb?: number;
    serviceId?: string;
    companyId?: string;
    serverId?: string;
  }
): Promise<{ ok: true; mailbox: PleskMailbox } | { ok: false; error: string }> {
  const quota = input.quotaMb ?? 1024;
  const inner = `<mail><create><filter><site-id>${escapeXml(input.siteId)}</site-id></filter><mailname><name>${escapeXml(input.mailboxName)}</name><password>${escapeXml(input.password)}</password><mailbox><quota>${quota}</quota></mailbox></mailname></create></mail>`;

  const result = await pleskXmlRequest(creds, inner, {
    serviceId: input.serviceId,
    companyId: input.companyId,
    serverId: input.serverId,
    action: "create_mailbox",
  });

  if (!result.ok) return { ok: false, error: result.error };

  return {
    ok: true,
    mailbox: {
      name: input.mailboxName,
      email: input.mailboxName,
      quotaMb: quota,
    },
  };
}

export async function resetPleskMailboxPassword(
  creds: PleskCredentials,
  input: {
    siteId: string;
    mailboxName: string;
    password: string;
    serviceId?: string;
    serverId?: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inner = `<mail><update><set><filter><site-id>${escapeXml(input.siteId)}</site-id><name>${escapeXml(input.mailboxName)}</name></filter><values><password>${escapeXml(input.password)}</password></values></set></update></mail>`;

  const result = await pleskXmlRequest(creds, inner, {
    serviceId: input.serviceId,
    serverId: input.serverId,
    action: "reset_mailbox_password",
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function deletePleskMailbox(
  creds: PleskCredentials,
  siteId: string,
  mailboxName: string,
  serverId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inner = `<mail><remove><filter><site-id>${escapeXml(siteId)}</site-id><name>${escapeXml(mailboxName)}</name></filter></remove></mail>`;
  const result = await pleskXmlRequest(creds, inner, { serverId, action: "delete_mailbox" });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
