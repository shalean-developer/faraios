import { describe, expect, it } from "vitest";

const states = [
  "publish_requested",
  "validating_origin",
  "validating_domain",
  "validating_ssl",
  "smoke_testing",
  "live",
] as const;

describe("website publish lifecycle", () => {
  it("does not reach live before readiness stages", () => {
    expect(states.at(-1)).toBe("live");
    expect(states.indexOf("live")).toBeGreaterThan(states.indexOf("validating_origin"));
    expect(states.indexOf("live")).toBeGreaterThan(states.indexOf("validating_domain"));
    expect(states.indexOf("live")).toBeGreaterThan(states.indexOf("validating_ssl"));
    expect(states.indexOf("live")).toBeGreaterThan(states.indexOf("smoke_testing"));
  });
});
