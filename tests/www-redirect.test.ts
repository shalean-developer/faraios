import { describe, expect, it } from "vitest";

import {
  buildWwwRedirectTargetHost,
  describeWwwRedirect,
  parseDomainHosts,
} from "@/lib/website-builder/www-redirect";

describe("www redirect", () => {
  it("parses apex and www hosts from a domain", () => {
    expect(parseDomainHosts("www.shalean.com")).toEqual({
      apex: "shalean.com",
      www: "www.shalean.com",
    });
  });

  it("redirects www to apex", () => {
    expect(
      buildWwwRedirectTargetHost("www.shalean.com", "www_to_apex", "shalean.com")
    ).toBe("shalean.com");
  });

  it("redirects apex to www", () => {
    expect(
      buildWwwRedirectTargetHost("shalean.com", "apex_to_www", "shalean.com")
    ).toBe("www.shalean.com");
  });

  it("does not redirect when mode is none", () => {
    expect(
      buildWwwRedirectTargetHost("www.shalean.com", "none", "shalean.com")
    ).toBeNull();
  });

  it("describes the active redirect", () => {
    expect(describeWwwRedirect("www_to_apex", "shalean.com")).toContain(
      "www.shalean.com"
    );
    expect(describeWwwRedirect("www_to_apex", "shalean.com")).toContain("shalean.com");
  });
});
