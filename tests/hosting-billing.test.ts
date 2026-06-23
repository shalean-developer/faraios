import { describe, expect, it } from "vitest";
import { hostingPlanAmountInKobo } from "../lib/billing/hosting-paystack";
import { hostingPlans } from "../lib/data/hosting";

describe("hostingPlanAmountInKobo", () => {
  it("matches hosting catalog amounts in smallest currency units", () => {
    for (const plan of hostingPlans) {
      expect(hostingPlanAmountInKobo(plan.slug)).toBe(
        Math.round(plan.monthly_price * 100)
      );
    }
  });

  it("defaults unknown plans to shared-basic pricing", () => {
    const basic = hostingPlans.find((p) => p.slug === "shared-basic");
    expect(basic).toBeDefined();
    expect(hostingPlanAmountInKobo("unknown-plan")).toBe(
      Math.round((basic?.monthly_price ?? 0) * 100)
    );
  });
});
