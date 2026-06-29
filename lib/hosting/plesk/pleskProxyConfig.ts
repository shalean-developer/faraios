/** Reverse-proxy settings for customer Plesk subscriptions → FaraiOS Node app on the same server. */

export type PleskProxyStyle = "apache" | "nginx" | "auto";

export function getFaraiosPleskProxyStyle(): PleskProxyStyle {
  const raw = process.env.FARAIOS_PLESK_PROXY_STYLE?.trim().toLowerCase();
  if (raw === "apache" || raw === "nginx") return raw;
  return "auto";
}

export function getFaraiosPleskAppOrigin(): string | null {
  const explicit = process.env.FARAIOS_PLESK_APP_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  if (process.env.FARAIOS_PLESK_PROXY_ENABLED?.trim().toLowerCase() === "false") {
    return null;
  }

  const port =
    process.env.FARAIOS_PLESK_APP_PORT?.trim() ||
    process.env.PORT?.trim() ||
    "3000";

  return `http://127.0.0.1:${port}`;
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
  return `Plesk reseller API could not set reverse proxy for ${domain}. In Plesk open ${domain} → Apache & nginx Settings → Additional nginx directives (or Apache/LiteSpeed), paste a proxy to ${originUrl} with Host preserved.`;
}

export function describeFaraiosPleskProxySetup(originUrl: string | null): string {
  if (!originUrl) {
    return "Set FARAIOS_PLESK_APP_ORIGIN (e.g. http://127.0.0.1:3000) to wire customer domains to the FaraiOS app on this Plesk server.";
  }
  return `Customer web traffic is proxied to ${originUrl} with the original Host header so FaraiOS can serve the correct tenant site.`;
}
