import { describe, expect, it } from "vitest";

import { ensureTenantSubdomainOnVercel } from "@/lib/services/vercel-tenant-domain";

describe("ensureTenantSubdomainOnVercel", () => {
  it("skips when subdomain is empty", async () => {
    const result = await ensureTenantSubdomainOnVercel("");
    expect(result).toEqual({ ok: true, skipped: true, reason: "no_subdomain" });
  });

  it("skips when Vercel is not configured", async () => {
    const previousToken = process.env.VERCEL_TOKEN;
    const previousProject = process.env.FARAIOS_VERCEL_PROJECT_ID;
    delete process.env.VERCEL_TOKEN;
    delete process.env.FARAIOS_VERCEL_PROJECT_ID;

    const result = await ensureTenantSubdomainOnVercel("acme");

    process.env.VERCEL_TOKEN = previousToken;
    process.env.FARAIOS_VERCEL_PROJECT_ID = previousProject;

    expect(result).toEqual({ ok: true, skipped: true, reason: "vercel_not_configured" });
  });
});
