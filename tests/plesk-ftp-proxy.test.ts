import { describe, expect, it } from "vitest";

import {
  buildFaraiosPhpProxyHtaccess,
  buildFaraiosPhpProxyScript,
  looksLikeFaraiosTenantSite,
} from "@/lib/hosting/plesk/pleskFtpProxy";

describe("pleskFtpProxy", () => {
  it("detects FaraiOS tenant HTML", () => {
    const body = '<html><script src="/_next/static/chunks/app.js"></script></html>';
    expect(looksLikeFaraiosTenantSite(200, body)).toBe(true);
  });

  it("rejects Plesk default page", () => {
    expect(looksLikeFaraiosTenantSite(200, "Domain Default page")).toBe(false);
  });

  it("rejects Vercel 403 forbidden page", () => {
    expect(looksLikeFaraiosTenantSite(403, "<title>403: Forbidden</title>")).toBe(false);
  });

  it("rejects LiteSpeed 503", () => {
    expect(looksLikeFaraiosTenantSite(503, "503 Service Unavailable")).toBe(false);
  });

  it("builds PHP proxy with tenant upstream host", () => {
    const script = buildFaraiosPhpProxyScript(
      "https://acme.faraios.com",
      "acme.faraios.com"
    );
    expect(script).toContain('"https://acme.faraios.com"');
    expect(script).toContain('"acme.faraios.com"');
    expect(script).toContain("X-Forwarded-Host");
  });

  it("builds PHP htaccess with DirectoryIndex index.php", () => {
    expect(buildFaraiosPhpProxyHtaccess()).toContain("DirectoryIndex index.php");
  });
});
