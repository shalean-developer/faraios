import { describe, expect, it } from "vitest";

import {
  resolveWebsiteLiveUrl,
  tenantSubdomainHost,
} from "@/lib/services/website-public-url";

describe("website public url", () => {
  it("uses custom domain when connected", () => {
    expect(
      resolveWebsiteLiveUrl({
        websiteId: "abc",
        domain: "https://www.example.com/path",
        subdomain: "legacy",
      })
    ).toEqual({
      href: "https://www.example.com",
      hostLabel: "www.example.com",
      source: "custom",
    });
  });

  it("falls back to preview when no custom domain", () => {
    expect(
      resolveWebsiteLiveUrl({
        websiteId: "abc",
        domain: null,
        subdomain: "rejuvenation-mobile-massage",
      })
    ).toEqual({
      href: "/preview/abc",
      hostLabel: "rejuvenation-mobile-massage.faraios.com",
      source: "preview",
    });
  });

  it("builds tenant subdomain host", () => {
    expect(tenantSubdomainHost("rejuvenation-mobile-massage")).toBe(
      "rejuvenation-mobile-massage.faraios.com"
    );
  });
});
