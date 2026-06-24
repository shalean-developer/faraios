import { describe, expect, it } from "vitest";

import { mapWebsiteDomainToHostingStatus } from "@/lib/services/hosting-domain";

describe("mapWebsiteDomainToHostingStatus", () => {
  it("maps verified domain with active ssl", () => {
    expect(mapWebsiteDomainToHostingStatus("verified", "active")).toEqual({
      domain_status: "verified",
      ssl_status: "active",
    });
  });

  it("maps pending verification", () => {
    expect(mapWebsiteDomainToHostingStatus("pending", "not_started")).toEqual({
      domain_status: "pending",
      ssl_status: "pending",
    });
  });

  it("maps failed states", () => {
    expect(mapWebsiteDomainToHostingStatus("failed", "failed")).toEqual({
      domain_status: "failed",
      ssl_status: "failed",
    });
  });
});
