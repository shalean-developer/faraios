import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isResendSandboxMode,
  resolveResendRecipients,
} from "@/lib/email/resend";

describe("resend sandbox helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.BOOKING_FROM_EMAIL;
    delete process.env.RESEND_SANDBOX;
    delete process.env.RESEND_SANDBOX_TO;
  });

  it("detects resend.dev from addresses as sandbox mode", () => {
    process.env.BOOKING_FROM_EMAIL = "onboarding@resend.dev";
    expect(isResendSandboxMode()).toBe(true);
  });

  it("redirects all dev mail when RESEND_SANDBOX_TO is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.BOOKING_FROM_EMAIL = "noreply@faraios.com";
    process.env.RESEND_SANDBOX_TO = "developer@example.com";

    expect(isResendSandboxMode()).toBe(true);
    expect(resolveResendRecipients("customer@example.com").recipients).toEqual([
      "developer@example.com",
    ]);
  });
});
