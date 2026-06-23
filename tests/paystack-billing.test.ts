import { describe, expect, it } from "vitest";
import { planAmountInKobo } from "../lib/billing/paystack";
import { pricingPlans } from "../lib/data/pricing";

describe("planAmountInKobo", () => {
  it("matches monthly pricing catalog amounts in smallest currency units", () => {
    for (const plan of pricingPlans) {
      expect(planAmountInKobo(plan.slug)).toBe(Math.round(plan.monthly_price * 100));
    }
  });

  it("defaults unknown plans to starter monthly pricing", () => {
    const starter = pricingPlans.find((p) => p.slug === "starter");
    expect(starter).toBeDefined();
    expect(planAmountInKobo("unknown-plan")).toBe(
      Math.round((starter?.monthly_price ?? 0) * 100)
    );
  });
});
