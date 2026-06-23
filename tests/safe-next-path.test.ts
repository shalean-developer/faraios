import { describe, expect, it } from "vitest";

import { authCallbackUrl, authHref, safeNextPath } from "../lib/auth/safe-next-path";

describe("safeNextPath", () => {
  it("returns /app for missing or unsafe paths", () => {
    expect(safeNextPath(null)).toBe("/app");
    expect(safeNextPath(undefined)).toBe("/app");
    expect(safeNextPath("")).toBe("/app");
    expect(safeNextPath("//evil.com")).toBe("/app");
    expect(safeNextPath("https://evil.com")).toBe("/app");
  });

  it("allows same-origin relative paths", () => {
    expect(safeNextPath("/onboarding?plan=business")).toBe(
      "/onboarding?plan=business"
    );
  });
});

describe("authHref", () => {
  it("omits next query when redirect is default", () => {
    expect(authHref("/auth/sign-up", "/app")).toBe("/auth/sign-up");
  });

  it("preserves next query for onboarding links", () => {
    expect(authHref("/auth/sign-up", "/onboarding?plan=business")).toBe(
      "/auth/sign-up?next=%2Fonboarding%3Fplan%3Dbusiness"
    );
  });
});

describe("authCallbackUrl", () => {
  it("builds callback URLs with encoded next paths", () => {
    expect(authCallbackUrl("/onboarding?plan=starter")).toBe(
      "/auth/callback?next=%2Fonboarding%3Fplan%3Dstarter"
    );
  });
});
