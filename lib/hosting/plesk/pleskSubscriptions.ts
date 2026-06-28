import { escapeXml, getAllXmlBlocks, getXmlText, pleskXmlRequest } from "@/lib/hosting/plesk/pleskXmlClient";
import { getPleskDefaultIpAddress } from "@/lib/hosting/plesk/pleskIp";
import type { PleskCredentials, PleskSubscription } from "@/lib/hosting/plesk/pleskTypes";

function parseSubscriptionBlock(block: string): PleskSubscription | null {
  const id = getXmlText(block, "id");
  const domainName = getXmlText(block, "name") ?? getXmlText(block, "domain-name");
  if (!id || !domainName) return null;
  return {
    id,
    domainName,
    customerId: getXmlText(block, "owner-id") ?? undefined,
    planName: getXmlText(block, "plan-name") ?? undefined,
    status: getXmlText(block, "status") ?? undefined,
  };
}

export async function syncPleskSubscriptions(
  creds: PleskCredentials,
  serverId?: string
): Promise<{ ok: true; subscriptions: PleskSubscription[] } | { ok: false; error: string }> {
  const inner = `<webspace><get><filter/><dataset><gen_info/><hosting/></dataset></get></webspace>`;
  const result = await pleskXmlRequest(creds, inner, {
    serverId,
    action: "sync_subscriptions",
  });

  if (!result.ok) return { ok: false, error: result.error };

  const subscriptions: PleskSubscription[] = [];
  for (const block of getAllXmlBlocks(result.rawXml, "result")) {
    if (getXmlText(block, "status") === "error") continue;
    const dataBlock = getAllXmlBlocks(block, "data")[0] ?? block;
    const sub = parseSubscriptionBlock(dataBlock);
    if (sub) subscriptions.push(sub);
  }

  return { ok: true, subscriptions };
}

export async function createPleskSubscription(
  creds: PleskCredentials,
  input: {
    domainName: string;
    customerId: string;
    planName: string;
    ftpLogin: string;
    ftpPassword: string;
    companyId?: string;
    orderId?: string;
    serviceId?: string;
    serverId?: string;
  }
): Promise<
  | { ok: true; subscription: PleskSubscription; ftpLogin: string }
  | { ok: false; error: string }
> {
  const ipAddress =
    (await getPleskDefaultIpAddress(creds, input.serverId)) ?? "127.0.0.1";

  // Plesk requires hosting before plan-name, and a real IP — not the literal "shared".
  const inner = `<webspace><add><gen_setup><name>${escapeXml(input.domainName)}</name><owner-id>${escapeXml(input.customerId)}</owner-id><htype>vrt_hst</htype><ip_address>${escapeXml(ipAddress)}</ip_address></gen_setup><hosting><vrt_hst><property><name>ftp_login</name><value>${escapeXml(input.ftpLogin)}</value></property><property><name>ftp_password</name><value>${escapeXml(input.ftpPassword)}</value></property><ip_address>${escapeXml(ipAddress)}</ip_address></vrt_hst></hosting><plan-name>${escapeXml(input.planName)}</plan-name></add></webspace>`;

  const result = await pleskXmlRequest(creds, inner, {
    companyId: input.companyId,
    orderId: input.orderId,
    serviceId: input.serviceId,
    serverId: input.serverId,
    action: "create_subscription",
  });

  if (!result.ok) return { ok: false, error: result.error };

  const block = getAllXmlBlocks(result.rawXml, "result")[0];
  const id = block ? getXmlText(block, "id") : null;
  if (!id) return { ok: false, error: "Subscription created but ID not returned." };

  return {
    ok: true,
    subscription: {
      id,
      domainName: input.domainName,
      customerId: input.customerId,
      planName: input.planName,
    },
    ftpLogin: input.ftpLogin,
  };
}

export async function suspendPleskSubscription(
  creds: PleskCredentials,
  subscriptionId: string,
  context: { serviceId?: string; serverId?: string; companyId?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inner = `<webspace><set><filter><id>${escapeXml(subscriptionId)}</id></filter><values><gen_setup><status>16</status></gen_setup></values></set></webspace>`;
  const result = await pleskXmlRequest(creds, inner, {
    ...context,
    action: "suspend_subscription",
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function unsuspendPleskSubscription(
  creds: PleskCredentials,
  subscriptionId: string,
  context: { serviceId?: string; serverId?: string; companyId?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inner = `<webspace><set><filter><id>${escapeXml(subscriptionId)}</id></filter><values><gen_setup><status>0</status></gen_setup></values></set></webspace>`;
  const result = await pleskXmlRequest(creds, inner, {
    ...context,
    action: "unsuspend_subscription",
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function terminatePleskSubscription(
  creds: PleskCredentials,
  subscriptionId: string,
  context: { serviceId?: string; serverId?: string; companyId?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inner = `<webspace><del><filter><id>${escapeXml(subscriptionId)}</id></filter></del></webspace>`;
  const result = await pleskXmlRequest(creds, inner, {
    ...context,
    action: "terminate_subscription",
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function changePleskServicePlan(
  creds: PleskCredentials,
  subscriptionId: string,
  planName: string,
  context: { serviceId?: string; serverId?: string; companyId?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inner = `<webspace><switch-subscription><filter><id>${escapeXml(subscriptionId)}</id></filter><plan-name>${escapeXml(planName)}</plan-name></switch-subscription></webspace>`;
  const result = await pleskXmlRequest(creds, inner, {
    ...context,
    action: "change_service_plan",
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
