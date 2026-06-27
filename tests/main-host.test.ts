import { describe, expect, it } from "vitest";

import {
  getMainAppDomain,
  isDocumentNavigationRequest,
  isMainHost,
} from "@/lib/hosting/main-host";

describe("main host helpers", () => {
  it("treats localhost as the main app host", () => {
    expect(isMainHost("localhost:3000")).toBe(true);
    expect(isMainHost("127.0.0.1:3000")).toBe(true);
  });

  it("detects document navigation requests", () => {
    expect(
      isDocumentNavigationRequest({
        method: "GET",
        headers: {
          get: (name) => (name === "accept" ? "text/html" : null),
        },
      })
    ).toBe(true);

    expect(
      isDocumentNavigationRequest({
        method: "GET",
        headers: {
          get: (name) => {
            if (name === "RSC") return "1";
            if (name === "accept") return "text/html";
            return null;
          },
        },
      })
    ).toBe(false);
  });

  it("reads app host from NEXT_PUBLIC_APP_URL when set", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.faraios.com";
    expect(getMainAppDomain()).toBe("app.faraios.com");
    expect(isMainHost("app.faraios.com")).toBe(true);
    process.env.NEXT_PUBLIC_APP_URL = previous;
  });
});
