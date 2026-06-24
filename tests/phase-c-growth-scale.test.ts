import { describe, expect, it } from "vitest";

import { normalizeBillingPlan, planAmountInKobo } from "../lib/billing/paystack";
import { roleDisplayLabel } from "../lib/team/role-display";
import { isSearchConsoleConfigured } from "../lib/services/search-console";

describe("Phase C — SaaS billing", () => {
  it("normalizes workspace plan slugs for Paystack", () => {
    expect(normalizeBillingPlan("business")).toBe("business");
    expect(planAmountInKobo("starter")).toBe(9900);
  });
});

describe("Phase C — custom roles", () => {
  it("formats custom role labels for team UI", () => {
    expect(
      roleDisplayLabel("custom_dispatcher", [
        { roleKey: "custom_dispatcher", label: "Dispatcher" },
      ])
    ).toBe("Dispatcher");
    expect(roleDisplayLabel("admin", [])).toBe("Admin");
  });
});

describe("Phase C — Search Console", () => {
  it("reports whether OAuth env vars are present", () => {
    expect(typeof isSearchConsoleConfigured()).toBe("boolean");
  });
});
