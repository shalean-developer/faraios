import { escapeXml, getAllXmlBlocks, getXmlText, pleskXmlRequest } from "@/lib/hosting/plesk/pleskXmlClient";
import type { PleskCredentials, PleskCustomer } from "@/lib/hosting/plesk/pleskTypes";

export async function findPleskCustomerByLogin(
  creds: PleskCredentials,
  login: string,
  serverId?: string
): Promise<PleskCustomer | null> {
  const inner = `<customer><get><filter><login>${escapeXml(login)}</login></filter><dataset><gen_info/></dataset></get></customer>`;
  const result = await pleskXmlRequest(creds, inner, {
    serverId,
    action: "find_customer",
  });
  if (!result.ok) return null;

  const block = getAllXmlBlocks(result.rawXml, "result")[0];
  if (!block || getXmlText(block, "status") === "error") return null;

  const id = getXmlText(block, "id");
  const customerLogin = getXmlText(block, "login") ?? login;
  if (!id) return null;

  return { id, login: customerLogin, name: getXmlText(block, "pname") ?? undefined };
}

export async function createPleskCustomer(
  creds: PleskCredentials,
  input: {
    login: string;
    password: string;
    name: string;
    email?: string;
    companyId?: string;
    orderId?: string;
    serverId?: string;
  }
): Promise<{ ok: true; customer: PleskCustomer } | { ok: false; error: string }> {
  const existing = await findPleskCustomerByLogin(creds, input.login, input.serverId);
  if (existing) return { ok: true, customer: existing };

  const email = input.email ? `<email>${escapeXml(input.email)}</email>` : "";
  const inner = `<customer><add><gen_info><pname>${escapeXml(input.name)}</pname><login>${escapeXml(input.login)}</login><passwd>${escapeXml(input.password)}</passwd>${email}</gen_info></add></customer>`;

  const result = await pleskXmlRequest(creds, inner, {
    companyId: input.companyId,
    orderId: input.orderId,
    serverId: input.serverId,
    action: "create_customer",
  });

  if (!result.ok) return { ok: false, error: result.error };

  const block = getAllXmlBlocks(result.rawXml, "result")[0];
  const id = block ? getXmlText(block, "id") : null;
  if (!id) return { ok: false, error: "Customer created but ID not returned." };

  return { ok: true, customer: { id, login: input.login, name: input.name } };
}
