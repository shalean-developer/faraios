import { describe, expect, it } from "vitest";

import {
  WEBSITE_PUBLISH_SUCCESS_PATH,
  publishStateComesAfter,
} from "@/lib/website-builder/publish-lifecycle";

describe("website publish lifecycle", () => {
  it("keeps live behind every readiness gate", () => {
    expect(WEBSITE_PUBLISH_SUCCESS_PATH.at(-1)).toBe("live");
    expect(publishStateComesAfter("live", "validating_origin")).toBe(true);
    expect(publishStateComesAfter("live", "validating_domain")).toBe(true);
    expect(publishStateComesAfter("live", "validating_ssl")).toBe(true);
    expect(publishStateComesAfter("live", "smoke_testing")).toBe(true);
  });

  it("does not treat an earlier validation stage as live-ready", () => {
    expect(publishStateComesAfter("validating_domain", "validating_ssl")).toBe(false);
    expect(publishStateComesAfter("validating_ssl", "smoke_testing")).toBe(false);
  });
});
