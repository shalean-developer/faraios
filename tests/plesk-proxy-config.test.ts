import { afterEach, describe, expect, it } from "vitest";

import {
  buildFaraiosHtaccessProxyDirectives,
  buildFaraiosReverseProxyDirectives,
  buildFaraiosNginxProxyDirectives,
  buildPleskProxyPropertyAttempts,
  getFaraiosPleskAppOrigin,
  isFaraiosPleskProxyEnabled,
} from "@/lib/hosting/plesk/pleskProxyConfig";

describe("pleskProxyConfig", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("builds Apache reverse-proxy directives with trailing slash on origin", () => {
    const directives = buildFaraiosReverseProxyDirectives("http://127.0.0.1:3000");
    expect(directives).toContain("ProxyPreserveHost On");
    expect(directives).toContain("ProxyPass / http://127.0.0.1:3000/");
    expect(directives).toContain("ProxyPassReverse / http://127.0.0.1:3000/");
  });

  it("prefers public FARAIOS_PLESK_APP_ORIGIN over localhost", () => {
    process.env.FARAIOS_PLESK_APP_ORIGIN = "https://faraios.com";
    expect(getFaraiosPleskAppOrigin()).toBe("https://faraios.com");
  });

  it("falls back to localhost when only local origin is configured", () => {
    process.env.FARAIOS_PLESK_APP_ORIGIN = "http://127.0.0.1:7080/";
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getFaraiosPleskAppOrigin()).toBe("http://127.0.0.1:7080");
  });

  it("defaults to faraios.com when no origin env is set", () => {
    delete process.env.FARAIOS_PLESK_APP_ORIGIN;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.FARAIOS_PLESK_PROXY_ENABLED;
    expect(getFaraiosPleskAppOrigin()).toBe("https://faraios.com");
    expect(isFaraiosPleskProxyEnabled()).toBe(true);
  });

  it("disables proxy when FARAIOS_PLESK_PROXY_ENABLED=false", () => {
    process.env.FARAIOS_PLESK_PROXY_ENABLED = "false";
    expect(getFaraiosPleskAppOrigin()).toBeNull();
    expect(isFaraiosPleskProxyEnabled()).toBe(false);
  });

  it("builds nginx proxy attempts in auto mode", () => {
    delete process.env.FARAIOS_PLESK_PROXY_STYLE;
    const attempts = buildPleskProxyPropertyAttempts("http://127.0.0.1:3000");
    expect(attempts.some((a) => a.name === "additional-nginx")).toBe(true);
    expect(attempts.some((a) => a.name === "additional-settings")).toBe(true);
    expect(buildFaraiosNginxProxyDirectives("http://127.0.0.1:3000")).toContain("proxy_set_header Host $host");
  });

  it("builds .htaccess proxy fallback for LiteSpeed hosts", () => {
    const htaccess = buildFaraiosHtaccessProxyDirectives("https://faraios.com");
    expect(htaccess).toContain("RewriteEngine On");
    expect(htaccess).toContain("https://faraios.com/");
  });
});
