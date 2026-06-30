import { describe, expect, it } from "vitest";

import { complementaryHostingDomain } from "@/lib/hosting/plesk/pleskSiteAliases";

describe("pleskSiteAliases", () => {
  it("returns www variant for apex domains", () => {
    expect(complementaryHostingDomain("example.com")).toBe("www.example.com");
  });

  it("returns apex for www domains", () => {
    expect(complementaryHostingDomain("www.example.com")).toBe("example.com");
  });

  it("normalizes input", () => {
    expect(complementaryHostingDomain("HTTPS://WWW.Example.COM/")).toBe("example.com");
  });
});
