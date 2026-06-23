import { describe, expect, it } from "vitest";

import {
  connectionStatusColor,
  connectionStatusLabel,
} from "@/lib/websites/status";
import { parseUtmFromUrl, detectDeviceType } from "@/lib/services/website-tracking";
import { previewSubdomainForSlug } from "@/lib/constants/tenant-domain";

describe("V4 website status", () => {
  it("labels connection statuses", () => {
    expect(connectionStatusLabel("live")).toBe("Live");
    expect(connectionStatusLabel("verification_pending")).toBe("Verification pending");
  });

  it("returns color classes for statuses", () => {
    expect(connectionStatusColor("live")).toContain("emerald");
    expect(connectionStatusColor("error")).toContain("red");
  });
});

describe("V4 tracking helpers", () => {
  it("parses UTM params from URL", () => {
    const utm = parseUtmFromUrl(
      "https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=spring"
    );
    expect(utm.utmSource).toBe("google");
    expect(utm.utmMedium).toBe("cpc");
    expect(utm.utmCampaign).toBe("spring");
  });

  it("detects mobile device type", () => {
    expect(detectDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)")).toBe("mobile");
    expect(detectDeviceType("Mozilla/5.0 (Windows NT 10.0)")).toBe("desktop");
  });
});

describe("V4 tenant domain", () => {
  it("builds preview subdomain from slug", () => {
    expect(previewSubdomainForSlug("shalean")).toMatch(/shalean\./);
  });
});
