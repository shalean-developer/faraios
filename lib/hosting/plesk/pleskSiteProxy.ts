import {
  buildPleskProxyPropertyAttempts,
  describeFaraiosPleskProxyManualFallback,
} from "@/lib/hosting/plesk/pleskProxyConfig";
import { deployPleskHttpdocsProxyViaFtp } from "@/lib/hosting/plesk/pleskFtpProxy";
import { escapeXml, pleskXmlRequest } from "@/lib/hosting/plesk/pleskXmlClient";
import type { PleskCredentials } from "@/lib/hosting/plesk/pleskTypes";

export type SetPleskReverseProxyInput = {
  siteId: string;
  domain: string;
  originUrl: string;
  tenantSubdomainHost?: string | null;
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

async function readSiteHostingProperty(
  creds: PleskCredentials,
  siteId: string,
  propertyName: string,
  serverId?: string
): Promise<string | null> {
  const inner = `<site><get><filter><id>${escapeXml(siteId)}</id></filter><dataset><hosting/></dataset></get></site>`;
  const result = await pleskXmlRequest(creds, inner, {
    action: "get_faraios_reverse_proxy",
    serverId,
  });
  if (!result.ok || !result.rawXml) return null;

  const re = new RegExp(
    `<name>${propertyName}</name>\\s*<value>([\\s\\S]*?)</value>`,
    "i"
  );
  const match = result.rawXml.match(re);
  return match?.[1]?.trim() || null;
}

async function tryDisableNginxProxyMode(
  creds: PleskCredentials,
  input: SetPleskReverseProxyInput,
  filterXml: string
): Promise<void> {
  const inner = buildSiteSetPacket(filterXml, "nginx-proxy-mode", "false");
  await pleskXmlRequest(creds, inner, {
    action: "disable_nginx_proxy_mode",
    serverId: input.serverId,
    serviceId: input.serviceId,
    companyId: input.companyId,
  });
}

async function trySiteHostingProperty(
  creds: PleskCredentials,
  input: SetPleskReverseProxyInput,
  filterXml: string,
  propertyName: string,
  propertyValue: string
): Promise<{ ok: true; verified: boolean } | { ok: false; error: string }> {
  const inner = buildSiteSetPacket(filterXml, propertyName, propertyValue);
  const result = await pleskXmlRequest(creds, inner, {
    action: "set_faraios_reverse_proxy",
    serverId: input.serverId,
    serviceId: input.serviceId,
    companyId: input.companyId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error || "Site hosting update failed." };
  }

  const persisted = await readSiteHostingProperty(
    creds,
    input.siteId,
    propertyName,
    input.serverId
  );

  return { ok: true, verified: Boolean(persisted) };
}

/**
 * Reseller Plesk (LiteSpeed) cannot persist additional Apache/nginx directives via XML API.
 * The reliable path is httpdocs/.htaccess uploaded over FTP + disabling the default index.html.
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

  for (const filterXml of filters) {
    await tryDisableNginxProxyMode(creds, input, filterXml);
    for (const attempt of attempts) {
      const result = await trySiteHostingProperty(
        creds,
        input,
        filterXml,
        attempt.name,
        attempt.value
      );
      if (result.ok && result.verified) {
        return { ok: true, property: attempt.name };
      }
    }
  }

  const ftpResult = await deployPleskHttpdocsProxyViaFtp({
    domain: input.domain,
    siteId: input.siteId,
    originUrl: input.originUrl,
    tenantSubdomainHost: input.tenantSubdomainHost,
    creds,
    serverId: input.serverId,
  });

  if (ftpResult.ok) {
    return { ok: true, property: `httpdocs/.htaccess (${ftpResult.method} via ftp)` };
  }

  return {
    ok: false,
    error: `${describeFaraiosPleskProxyManualFallback(input.domain, input.originUrl)} FTP: ${ftpResult.error}`,
  };
}
