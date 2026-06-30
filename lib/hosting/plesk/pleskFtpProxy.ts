import { getAllXmlBlocks, getXmlText, pleskXmlRequest } from "@/lib/hosting/plesk/pleskXmlClient";
import { buildFaraiosHtaccessProxyDirectives } from "@/lib/hosting/plesk/pleskProxyConfig";
import type { PleskCredentials } from "@/lib/hosting/plesk/pleskTypes";

export type PleskFtpCredentials = {
  login: string;
  password: string;
};

export type PleskHttpdocsProxyMethod = "htaccess" | "php" | "php-tenant";

/** True when the HTTP response looks like a FaraiOS tenant site (not Plesk default / proxy errors). */
export function looksLikeFaraiosTenantSite(status: number, body: string): boolean {
  if (status < 200 || status >= 500) return false;
  if (status === 403 && body.includes("403: Forbidden")) return false;
  if (
    body.includes("Domain Default page") ||
    body.includes("What is Plesk") ||
    body.includes("Plesk Default page")
  ) {
    return false;
  }
  if (body.includes("503 Service") && body.includes("Unavailable")) return false;
  if (status >= 400) return false;
  return (
    body.includes("_next/static") ||
    body.includes("next-router") ||
    body.includes("FaraiOS") ||
    body.includes("__next_f")
  );
}

export function buildFaraiosPhpProxyScript(originUrl: string, tenantHost?: string): string {
  const origin = originUrl.replace(/\/$/, "");
  const upstreamHost = tenantHost?.trim() || null;
  return `<?php
// FaraiOS reverse proxy (PHP fallback when LiteSpeed [P] proxy is unavailable on the vhost)
$origin = ${JSON.stringify(origin)};
$tenantHost = ${upstreamHost ? JSON.stringify(upstreamHost) : "null"};
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$url = $origin . $uri;
$clientHost = $_SERVER['HTTP_HOST'] ?? '';
$upstreamHostHeader = $tenantHost ?: $clientHost;

$headers = [
  'Host: ' . $upstreamHostHeader,
  'X-Forwarded-Host: ' . $clientHost,
  'X-Forwarded-Proto: ' . ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http'),
  'User-Agent: Mozilla/5.0 (compatible; FaraiOS-Plesk-Proxy/1.0)',
  'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
];
if (!empty($_SERVER['HTTP_ACCEPT'])) {
  $headers[] = 'Accept: ' . $_SERVER['HTTP_ACCEPT'];
}
if (!empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
  $headers[] = 'Accept-Language: ' . $_SERVER['HTTP_ACCEPT_LANGUAGE'];
}
if (!empty($_SERVER['REMOTE_ADDR'])) {
  $headers[] = 'X-Forwarded-For: ' . $_SERVER['REMOTE_ADDR'];
  $headers[] = 'X-Real-IP: ' . $_SERVER['REMOTE_ADDR'];
}

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HEADER => true,
  CURLOPT_FOLLOWLOCATION => false,
  CURLOPT_HTTPHEADER => $headers,
  CURLOPT_CUSTOMREQUEST => $_SERVER['REQUEST_METHOD'] ?? 'GET',
  CURLOPT_TIMEOUT => 30,
]);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET' && !empty(file_get_contents('php://input'))) {
  curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

$response = curl_exec($ch);
if ($response === false) {
  http_response_code(502);
  header('Content-Type: text/plain; charset=utf-8');
  echo 'FaraiOS proxy error: ' . curl_error($ch);
  curl_close($ch);
  exit;
}

$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

http_response_code($status);
$rawHeaders = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
foreach (preg_split('/\\r?\\n/', $rawHeaders) as $line) {
  if ($line === '' || stripos($line, 'HTTP/') === 0) {
    continue;
  }
  if (stripos($line, 'Transfer-Encoding:') === 0) {
    continue;
  }
  header($line, false);
}
echo $body;
`;
}

export function buildFaraiosPhpProxyHtaccess(): string {
  return [
    "# FaraiOS PHP proxy entrypoint (LiteSpeed [P] fallback)",
    "DirectoryIndex index.php",
    "RewriteEngine On",
    "RewriteCond %{REQUEST_URI} !^/\\.well-known/",
    "RewriteCond %{REQUEST_FILENAME} !-f",
    "RewriteRule ^ index.php [L]",
  ].join("\n");
}

export async function getPleskSiteFtpCredentials(
  creds: PleskCredentials,
  siteId: string,
  serverId?: string
): Promise<PleskFtpCredentials | null> {
  const inner = `<site><get><filter><id>${siteId}</id></filter><dataset><hosting/></dataset></get></site>`;
  const result = await pleskXmlRequest(creds, inner, {
    serverId,
    action: "get_site_ftp_credentials",
  });

  if (!result.ok || !result.rawXml) return null;

  for (const block of getAllXmlBlocks(result.rawXml, "property")) {
    const name = getXmlText(block, "name");
    const value = getXmlText(block, "value");
    if (name === "ftp_login" && value) {
      const passwordBlock = result.rawXml.match(
        /<name>ftp_password<\/name>\s*<value>([\s\S]*?)<\/value>/i
      );
      const password = passwordBlock?.[1]?.trim();
      if (password) return { login: value, password };
    }
  }

  const login = result.rawXml.match(/<name>ftp_login<\/name>\s*<value>([^<]+)<\/value>/i)?.[1];
  const password = result.rawXml.match(/<name>ftp_password<\/name>\s*<value>([^<]+)<\/value>/i)?.[1];
  if (!login || !password) return null;
  return { login, password };
}

export async function verifyDomainProxy(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${domain}/`, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    const body = await res.text();
    return looksLikeFaraiosTenantSite(res.status, body);
  } catch {
    return false;
  }
}

type FtpSession = {
  client: import("basic-ftp").Client;
  uploadText: (filename: string, content: string) => Promise<void>;
  ensureHttpdocs: () => Promise<void>;
  disablePleskDefaultIndex: () => Promise<void>;
  removeIndexPhp: () => Promise<void>;
};

async function openPleskFtpSession(input: {
  domain: string;
  ftpCreds: PleskFtpCredentials;
}): Promise<FtpSession> {
  const { Client } = await import("basic-ftp");
  const client = new Client();

  await client.access({
    host: input.domain,
    user: input.ftpCreds.login,
    password: input.ftpCreds.password,
    secure: true,
    secureOptions: { rejectUnauthorized: false },
  });

  async function uploadText(filename: string, content: string) {
    const { Readable } = await import("stream");
    await client.uploadFrom(Readable.from([content]), filename);
  }

  return {
    client,
    uploadText,
    async ensureHttpdocs() {
      await client.cd("httpdocs");
    },
    async disablePleskDefaultIndex() {
      await client.cd("httpdocs");
      const listing = await client.list();
      const defaultIndex = listing.find((entry) => entry.name === "index.html");
      if (defaultIndex) {
        await client.rename("index.html", "index.html.plesk-default.bak");
      }
    },
    async removeIndexPhp() {
      await client.cd("httpdocs");
      try {
        await client.remove("index.php");
      } catch {
        /* not present */
      }
    },
  };
}

/**
 * Deploy httpdocs proxy files using the same cascade as manual fixes:
 * 1) LiteSpeed .htaccess [P] → faraios.com (teamedlick pattern)
 * 2) PHP proxy → faraios.com with customer Host
 * 3) PHP proxy → tenant subdomain (rejuvenation pattern when [P] fails)
 */
export async function deployPleskHttpdocsProxyViaFtp(input: {
  domain: string;
  siteId: string;
  originUrl: string;
  tenantSubdomainHost?: string | null;
  creds: PleskCredentials;
  serverId?: string;
}): Promise<{ ok: true; method: PleskHttpdocsProxyMethod } | { ok: false; error: string }> {
  const ftpCreds = await getPleskSiteFtpCredentials(input.creds, input.siteId, input.serverId);
  if (!ftpCreds) {
    return { ok: false, error: "Could not read FTP credentials from Plesk." };
  }

  try {
    await import("basic-ftp");
  } catch {
    return { ok: false, error: "FTP client (basic-ftp) is not installed." };
  }

  const litespeedHtaccess = buildFaraiosHtaccessProxyDirectives(input.originUrl);
  const phpHtaccess = buildFaraiosPhpProxyHtaccess();
  const phpProxy = buildFaraiosPhpProxyScript(input.originUrl);
  const tenantHost = input.tenantSubdomainHost?.trim() || null;
  const tenantOrigin = tenantHost ? `https://${tenantHost}` : null;
  const tenantPhpProxy = tenantHost
    ? buildFaraiosPhpProxyScript(`https://${tenantHost}`, tenantHost)
    : null;

  let session: FtpSession | null = null;

  try {
    session = await openPleskFtpSession({ domain: input.domain, ftpCreds });

    await session.disablePleskDefaultIndex();
    await session.ensureHttpdocs();
    await session.uploadText(".htaccess", litespeedHtaccess);
    await session.removeIndexPhp();

    if (await verifyDomainProxy(input.domain)) {
      return { ok: true, method: "htaccess" };
    }

    await session.ensureHttpdocs();
    await session.uploadText(".htaccess", phpHtaccess);
    await session.uploadText("index.php", phpProxy);

    if (await verifyDomainProxy(input.domain)) {
      return { ok: true, method: "php" };
    }

    if (tenantPhpProxy && tenantOrigin) {
      await session.ensureHttpdocs();
      await session.uploadText(".htaccess", phpHtaccess);
      await session.uploadText("index.php", tenantPhpProxy);

      if (await verifyDomainProxy(input.domain)) {
        return { ok: true, method: "php-tenant" };
      }
    }

    return {
      ok: false,
      error:
        "Proxy files uploaded but the domain still does not serve FaraiOS content. Check Vercel domain registration and retry Verify DNS.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "FTP upload failed.";
    return { ok: false, error: message };
  } finally {
    session?.client.close();
  }
}
