import {
  getAllXmlBlocks,
  getXmlText,
  pleskXmlRequest,
} from "@/lib/hosting/plesk/pleskXmlClient";
import type { PleskCredentials, PleskServicePlan } from "@/lib/hosting/plesk/pleskTypes";

export type TestConnectionResult = {
  status: "connected" | "authentication_failed" | "api_disabled" | "wrong_endpoint" | "permission_denied" | "network_error";
  message: string;
  protocolVersion?: string;
  apiType: "xml";
};

export async function testPleskConnection(
  creds: PleskCredentials,
  serverId?: string
): Promise<TestConnectionResult> {
  const inner = `<server><get><stat/></get></server>`;
  const result = await pleskXmlRequest(creds, inner, {
    serverId,
    action: "test_connection",
  });

  if (!result.ok) {
    return {
      status: result.connectionStatus ?? "network_error",
      message: result.error,
      apiType: "xml",
    };
  }

  const protocolVersion =
    getXmlText(result.rawXml, "version") ??
    getXmlText(result.rawXml, "plesk_version") ??
    undefined;

  return {
    status: "connected",
    message: protocolVersion
      ? `Connected. Plesk version: ${protocolVersion}`
      : "Connected. Remote XML API is active.",
    protocolVersion,
    apiType: "xml",
  };
}

function parseServicePlanBlock(block: string): PleskServicePlan | null {
  const id = getXmlText(block, "id");
  const name = getXmlText(block, "name");
  if (!id || !name) return null;

  const parseLimit = (name: string): number | undefined => {
    const limitBlocks = getAllXmlBlocks(block, "limit");
    for (const lb of limitBlocks) {
      if (getXmlText(lb, "name")?.toLowerCase() === name.toLowerCase()) {
        const val = getXmlText(lb, "value");
        if (val && val !== "-1") return parseInt(val, 10);
      }
    }
    return undefined;
  };

  return {
    id,
    name,
    storageLimitGb: parseLimit("disk_space"),
    bandwidthLimitGb: parseLimit("max_traffic"),
    domainLimit: parseLimit("max_dom"),
    subdomainLimit: parseLimit("max_subdom"),
    mailboxLimit: parseLimit("max_box"),
    ftpAccountLimit: parseLimit("max_subftp_users"),
    databaseLimit: parseLimit("max_db"),
  };
}

export async function importPleskServicePlans(
  creds: PleskCredentials,
  serverId?: string
): Promise<{ ok: true; plans: PleskServicePlan[] } | { ok: false; error: string }> {
  const inner = `<service-plan><get><filter/></get></service-plan>`;
  const result = await pleskXmlRequest(creds, inner, {
    serverId,
    action: "import_service_plans",
  });

  if (!result.ok) return { ok: false, error: result.error };

  const blocks = getAllXmlBlocks(result.rawXml, "result");
  const plans: PleskServicePlan[] = [];

  for (const block of blocks) {
    if (getXmlText(block, "status") === "error") continue;
    const planBlock = getAllXmlBlocks(block, "data")[0] ?? block;
    const plan = parseServicePlanBlock(planBlock);
    if (plan) plans.push(plan);
  }

  if (plans.length === 0) {
    const altBlocks = getAllXmlBlocks(result.rawXml, "service-plan");
    for (const block of altBlocks) {
      const plan = parseServicePlanBlock(block);
      if (plan) plans.push(plan);
    }
  }

  return { ok: true, plans };
}

export async function detectApiType(
  creds: PleskCredentials
): Promise<"xml" | "rest" | "unknown"> {
  const test = await testPleskConnection(creds);
  if (test.status === "connected") return "xml";
  return "unknown";
}
