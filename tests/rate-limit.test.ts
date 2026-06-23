import { describe, expect, it } from "vitest";
import { getClientIp, rateLimit } from "../lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the configured limit", () => {
    const key = `test-${Date.now()}-allow`;
    expect(rateLimit(key, 2, 60_000)).toEqual({ ok: true });
    expect(rateLimit(key, 2, 60_000)).toEqual({ ok: true });
  });

  it("blocks requests after the limit is exceeded", () => {
    const key = `test-${Date.now()}-block`;
    expect(rateLimit(key, 1, 60_000)).toEqual({ ok: true });
    const blocked = rateLimit(key, 1, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });
});

describe("getClientIp", () => {
  it("reads the first forwarded-for address", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("203.0.113.1");
  });
});
