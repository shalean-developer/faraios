/** Reverse-proxy settings for customer Plesk subscriptions → FaraiOS Node app on the same server. */

export type PleskProxyStyle = "apache" | "nginx" | "auto";

export function getFaraiosPleskProxyStyle(): PleskProxyStyle {
  const raw = process.env.FARAIOS_PLESK_PROXY_STYLE?.trim().toLowerCase();
  if (raw === "apache" || raw === "nginx") return raw;
  return "auto";
}

function isLocalAppOrigin(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/** Public FaraiOS app URL used as the reverse-proxy target from Plesk customer domains. */
export function getFaraiosPleskAppOrigin(): string | null {
  if (process.env.FARAIOS_PLESK_PROXY_ENABLED?.trim().toLowerCase() === "false") {
    return null;
  }

  const explicit = process.env.FARAIOS_PLESK_APP_ORIGIN?.trim();
  if (explicit && !isLocalAppOrigin(explicit)) {
    return explicit.replace(/\/$/, "");
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";
  if (appUrl && !isLocalAppOrigin(appUrl)) {
    return appUrl.replace(/\/$/, "");
  }

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  // Plesk LiteSpeed → FaraiOS on Vercel (Host header preserved for tenant routing).
  return "https://faraios.com";
}

export function isFaraiosPleskProxyEnabled(): boolean {
  if (process.env.FARAIOS_PLESK_PROXY_ENABLED?.trim().toLowerCase() === "false") {
    return false;
  }
  return Boolean(getFaraiosPleskAppOrigin());
}

/** Apache / LiteSpeed additional directives (ProxyPreserveHost keeps tenant Host header). */
export function buildFaraiosReverseProxyDirectives(originUrl: string): string {
  const origin = originUrl.replace(/\/$/, "");
  return [
    "ProxyPreserveHost On",
    `ProxyPass / ${origin}/`,
    `ProxyPassReverse / ${origin}/`,
  ].join("\n");
}

/** Nginx additional directives (common on Plesk Linux / LiteSpeed frontends). */
/** LiteSpeed / shared-hosting fallback when Plesk XML API accepts but does not persist additional-* properties. */
export function buildFaraiosHtaccessProxyDirectives(originUrl: string): string {
  const origin = originUrl.replace(/\/$/, "");
  return [
    "# FaraiOS on Vercel — proxy from Plesk LiteSpeed while preserving Host for tenant routing",
    "RewriteEngine On",
    "RewriteCond %{REQUEST_URI} !^/\\.well-known/",
    `RewriteRule ^(.*)$ ${origin}/$1 [P,L]`,
  ].join("\n");
}

export function buildFaraiosNginxProxyDirectives(originUrl: string): string {
  const origin = originUrl.replace(/\/$/, "");
  return [
    "location / {",
    `    proxy_pass ${origin};`,
    "    proxy_http_version 1.1;",
    "    proxy_set_header Host $host;",
    "    proxy_set_header X-Real-IP $remote_addr;",
    "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "    proxy_set_header X-Forwarded-Proto $scheme;",
    "}",
  ].join("\n");
}

export function buildPleskProxyPropertyAttempts(
  originUrl: string
): { name: string; value: string }[] {
  const style = getFaraiosPleskProxyStyle();
  const attempts: { name: string; value: string }[] = [];

  if (style === "nginx" || style === "auto") {
    attempts.push({
      name: "additional-nginx",
      value: buildFaraiosNginxProxyDirectives(originUrl),
    });
  }
  if (style === "apache" || style === "auto") {
    const apache = buildFaraiosReverseProxyDirectives(originUrl);
    attempts.push({ name: "additional-settings", value: apache });
    attempts.push({ name: "additional-directives", value: apache });
  }

  return attempts;
}

export function describeFaraiosPleskProxyManualFallback(
  domain: string,
  originUrl: string
): string {
  return `Plesk reseller API could not set reverse proxy for ${domain}. Upload httpdocs/.htaccess with a proxy to ${originUrl}, or in Plesk open ${domain} → Apache & nginx Settings and paste proxy directives with Host preserved.`;
}

export function describeFaraiosPleskProxySetup(originUrl: string | null): string {
  if (!originUrl) {
    return "Set FARAIOS_PLESK_APP_ORIGIN (e.g. http://127.0.0.1:3000) to wire customer domains to the FaraiOS app on this Plesk server.";
  }
  return `Customer web traffic is proxied to ${originUrl} with the original Host header so FaraiOS can serve the correct tenant site.`;
}
