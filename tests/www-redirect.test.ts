import { describe, expect, it } from "vitest";

import {
  buildWwwRedirectTargetHost,
  parseDomainHosts,
} from "@/lib/website-builder/www-redirect";

describe("www redirect domain parsing", () => {
  it("parses dotted apex domains", () => {
    expect(parseDomainHosts("teamedlick.co.za")).toEqual({
      apex: "teamedlick.co.za",
      www: "www.teamedlick.co.za",
    });
  });

  it("redirects www to apex for dotted domains", () => {
    expect(
      buildWwwRedirectTargetHost("www.teamedlick.co.za", "www_to_apex", "teamedlick.co.za")
    ).toBe("teamedlick.co.za");
  });

  it("redirects apex to www for dotted domains", () => {
    expect(
      buildWwwRedirectTargetHost("teamedlick.co.za", "apex_to_www", "teamedlick.co.za")
    ).toBe("www.teamedlick.co.za");
  });
});
