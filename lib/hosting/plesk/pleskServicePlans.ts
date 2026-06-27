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
  const adminInner = `<server><get><stat/></get></server>`;
  const adminResult = await pleskXmlRequest(creds, adminInner, {
    serverId,
    action: "test_connection",
  });

  if (adminResult.ok) {
    const protocolVersion =
      getXmlText(adminResult.rawXml, "version") ??
      getXmlText(adminResult.rawXml, "plesk_version") ??
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

  // Reseller logins cannot call server.get — verify with webspace API instead.
  if (adminResult.connectionStatus === "permission_denied") {
    const resellerInner =
      `<webspace><get><filter/><dataset><gen_info/></dataset></get></webspace>`;
    const resellerResult = await pleskXmlRequest(creds, resellerInner, {
      serverId,
      action: "test_connection_reseller",
    });

    if (resellerResult.ok) {
      const subscriptions = getAllXmlBlocks(resellerResult.rawXml, "result").filter(
        (block) => getXmlText(block, "status") === "ok"
      );
      const count = subscriptions.length;
      return {
        status: "connected",
        message:
          count > 0
            ? `Connected (reseller API). ${count} subscription${count === 1 ? "" : "s"} visible.`
            : "Connected (reseller API). No subscriptions found yet.",
        apiType: "xml",
      };
    }

    return {
      status: resellerResult.connectionStatus ?? "network_error",
      message: resellerResult.error,
      apiType: "xml",
    };
  }

  return {
    status: adminResult.connectionStatus ?? "network_error",
    message: adminResult.error,
    apiType: "xml",
  };
}

const BYTE_LIMIT_NAMES = new Set(["disk_space", "max_traffic"]);
const BYTES_PER_GB = 1024 ** 3;

function parseLimitValue(raw: string, limitName: string): number | undefined {
  if (!raw || raw === "-1") return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return undefined;
  if (BYTE_LIMIT_NAMES.has(limitName.toLowerCase())) {
    return Math.max(1, Math.ceil(parsed / BYTES_PER_GB));
  }
  return parsed;
}

function parseServicePlanBlock(block: string): PleskServicePlan | null {
  const id = getXmlText(block, "id");
  const name = getXmlText(block, "name");
  if (!id || !name) return null;

  const parseLimit = (limitName: string): number | undefined => {
    const limitBlocks = getAllXmlBlocks(block, "limit");
    for (const lb of limitBlocks) {
      if (getXmlText(lb, "name")?.toLowerCase() === limitName.toLowerCase()) {
        const val = getXmlText(lb, "value");
        if (val) return parseLimitValue(val, limitName);
      }
    }
    return undefined;
  };

  return {
    id,
    name,
    storageLimitGb: parseLimit("disk_space"),
    bandwidthLimitGb: parseLimit("max_traffic"),
    domainLimit: parseLimit("max_site") ?? parseLimit("max_dom"),
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
