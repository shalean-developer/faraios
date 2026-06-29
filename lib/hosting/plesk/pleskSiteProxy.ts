import {
  buildPleskProxyPropertyAttempts,
  describeFaraiosPleskProxyManualFallback,
} from "@/lib/hosting/plesk/pleskProxyConfig";
import { escapeXml, pleskXmlRequest } from "@/lib/hosting/plesk/pleskXmlClient";
import type { PleskCredentials } from "@/lib/hosting/plesk/pleskTypes";

export type SetPleskReverseProxyInput = {
  siteId: string;
  domain: string;
  originUrl: string;
  serverId?: string;
  serviceId?: string;
  companyId?: string;
};

function buildHostingPropertyXml(name: string, value: string): string {
  return `<property><name>${escapeXml(name)}</name><value>${escapeXml(value)}</value></property>`;
}

function buildSiteSetPacket(filterXml: string, propertyName: string, propertyValue: string): string {
  const propertyXml = buildHostingPropertyXml(propertyName, propertyValue);
  const hostingXml = `<hosting><vrt_hst>${propertyXml}</vrt_hst></hosting>`;
  return `<site><set><filter>${filterXml}</filter><values>${hostingXml}</values></set></site>`;
}

async function trySiteHostingProperty(
  creds: PleskCredentials,
  input: SetPleskReverseProxyInput,
  filterXml: string,
  propertyName: string,
  propertyValue: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inner = buildSiteSetPacket(filterXml, propertyName, propertyValue);
  const result = await pleskXmlRequest(creds, inner, {
    action: "set_faraios_reverse_proxy",
    serverId: input.serverId,
    serviceId: input.serviceId,
    companyId: input.companyId,
  });

  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error || "Site hosting update failed." };
}

/**
 * Reseller accounts cannot set `<hosting>` on webspace.set (mail only).
 * Use site.set on the domain instead.
 */
export async function setPleskWebspaceReverseProxy(
  creds: PleskCredentials,
  input: SetPleskReverseProxyInput
): Promise<{ ok: true; property: string } | { ok: false; error: string }> {
  const attempts = buildPleskProxyPropertyAttempts(input.originUrl);
  const filters = [
    `<id>${escapeXml(input.siteId)}</id>`,
    `<name>${escapeXml(input.domain)}</name>`,
  ];

  const errors: string[] = [];

  for (const filterXml of filters) {
    for (const attempt of attempts) {
      const result = await trySiteHostingProperty(
        creds,
        input,
        filterXml,
        attempt.name,
        attempt.value
      );
      if (result.ok) {
        return { ok: true, property: attempt.name };
      }
      errors.push(`${attempt.name} (${filterXml}): ${result.error}`);
    }
  }

  return {
    ok: false,
    error: `${describeFaraiosPleskProxyManualFallback(input.domain, input.originUrl)} Last API errors: ${errors.slice(-2).join("; ")}`,
  };
}
