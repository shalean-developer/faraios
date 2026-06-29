import { describe, expect, it } from "vitest";

import { probeDomainSslActive } from "@/lib/hosting/ssl-probe";

describe("probeDomainSslActive", () => {
  it("returns true for a domain with a valid public certificate", async () => {
    const active = await probeDomainSslActive("example.com");
    expect(active).toBe(true);
  }, 15_000);
});
