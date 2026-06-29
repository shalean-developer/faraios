import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PleskConnectionStatus,
  PleskCredentials,
  PleskLogContext,
  PleskXmlResult,
} from "@/lib/hosting/plesk/pleskTypes";

const PACKET_VERSION = "1.6.9.0";

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildPacket(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><packet version="${PACKET_VERSION}">${inner}</packet>`;
}

export function getXmlText(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${tag}>`, "i");
  const match = xml.match(re);
  if (!match) return null;
  return (match[1] ?? match[2] ?? "").trim() || null;
}

export function getAllXmlBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "gi");
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

export function getXmlError(xml: string): { code: string; text: string } | null {
  const status = getXmlText(xml, "status");
  if (status !== "error") return null;
  const code = getXmlText(xml, "errcode") ?? getXmlText(xml, "errtext") ?? "unknown";
  const text = getXmlText(xml, "errtext") ?? getXmlText(xml, "text") ?? "Unknown Plesk error";
  return { code, text };
}

function mapHttpError(status: number, body: string): PleskConnectionStatus {
  if (status === 401 || status === 403) return "authentication_failed";
  if (status === 404) return "wrong_endpoint";
  if (body.toLowerCase().includes("api") && body.toLowerCase().includes("disabled")) {
    return "api_disabled";
  }
  if (status === 403) return "permission_denied";
  return "wrong_endpoint";
}

function mapXmlError(error: { code: string; text: string }): PleskConnectionStatus {
  const text = error.text.toLowerCase();
  const code = error.code.toLowerCase();
  if (text.includes("auth") || text.includes("login") || text.includes("password") || code === "1023") {
    return "authentication_failed";
  }
  if (text.includes("permission") || text.includes("denied") || text.includes("access")) {
    return "permission_denied";
  }
  if (text.includes("api") && text.includes("disabled")) {
    return "api_disabled";
  }
  return "permission_denied";
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...payload };
  for (const key of Object.keys(sanitized)) {
    if (/pass(word)?|secret|token/i.test(key)) {
      sanitized[key] = "[redacted]";
    }
  }
  return sanitized;
}

export async function logPleskRequest(
  context: PleskLogContext,
  status: "success" | "failed" | "pending",
  requestPayload?: Record<string, unknown>,
  responsePayload?: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("hosting_provisioning_logs").insert({
      company_id: context.companyId ?? null,
      order_id: context.orderId ?? null,
      service_id: context.serviceId ?? null,
      server_id: context.serverId ?? null,
      action: context.action,
      status,
      request_payload: requestPayload ? sanitizePayload(requestPayload) : null,
      response_payload: responsePayload ?? null,
      error_message: errorMessage ?? null,
    });
  } catch (err) {
    console.error("[plesk-xml] log failed", err instanceof Error ? err.message : err);
  }
}

export async function pleskXmlRequest(
  creds: PleskCredentials,
  innerXml: string,
  logContext?: PleskLogContext
): Promise<PleskXmlResult> {
  const packet = buildPacket(innerXml);
  const endpoint = creds.xmlEndpoint;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "HTTP_AUTH_LOGIN": creds.username,
        "HTTP_AUTH_PASSWD": creds.secret,
        "Content-Type": "text/xml",
      },
      body: packet,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const rawXml = await res.text();

    if (!rawXml.trim().startsWith("<?xml") && !rawXml.includes("<packet")) {
      const connectionStatus = mapHttpError(res.status, rawXml);
      if (logContext) {
        await logPleskRequest(
          logContext,
          "failed",
          { endpoint, packetPreview: innerXml.slice(0, 200) },
          { httpStatus: res.status },
          connectionStatus
        );
      }
      return {
        ok: false,
        error: `Invalid response from Plesk (${res.status})`,
        connectionStatus,
        rawXml,
      };
    }

    const xmlError = getXmlError(rawXml);
    if (xmlError) {
      const connectionStatus = mapXmlError(xmlError);
      if (logContext) {
        await logPleskRequest(
          logContext,
          "failed",
          { endpoint, packetPreview: innerXml.slice(0, 200) },
          { errcode: xmlError.code, errtext: xmlError.text },
          xmlError.text
        );
      }
      return {
        ok: false,
        error: xmlError.text,
        errorCode: xmlError.code,
        connectionStatus,
        rawXml,
      };
    }

    if (!res.ok) {
      const connectionStatus = mapHttpError(res.status, rawXml);
      if (logContext) {
        await logPleskRequest(
          logContext,
          "failed",
          { endpoint },
          { httpStatus: res.status },
          connectionStatus
        );
      }
      return { ok: false, error: `HTTP ${res.status}`, connectionStatus, rawXml };
    }

    if (logContext) {
      await logPleskRequest(logContext, "success", { endpoint }, { ok: true });
    }

    return { ok: true, data: { rawXml }, rawXml };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    if (logContext) {
      await logPleskRequest(logContext, "failed", { endpoint }, undefined, message);
    }
    return {
      ok: false,
      error: message,
      connectionStatus: "network_error",
    };
  }
}

export function defaultXmlEndpoint(baseUrl: string): string {
  const url = baseUrl.replace(/\/$/, "");
  if (url.includes("/enterprise/control/agent.php")) return url;
  return `${url}/enterprise/control/agent.php`;
}
