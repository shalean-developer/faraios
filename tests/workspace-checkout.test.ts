import { describe, expect, it } from "vitest";

import {
  getWorkspaceCheckoutBreakdown,
  resolveWorkspaceCheckoutIncludeSetupFee,
  workspaceCheckoutAmountInKobo,
  workspaceCheckoutAmountOptionsInKobo,
} from "../lib/billing/workspace-checkout";

describe("getWorkspaceCheckoutBreakdown", () => {
  it("includes setup fee on first checkout by default", () => {
    const breakdown = getWorkspaceCheckoutBreakdown({
      plan: "business",
      setupFeeWaived: false,
      setupFeePaid: false,
      subscriptionActive: false,
    });

    expect(breakdown.monthlyPrice).toBe(199);
    expect(breakdown.setupFeeAmount).toBe(3500);
    expect(breakdown.total).toBe(3699);
    expect(breakdown.setupFeeEligible).toBe(true);
  });

  it("charges monthly only when the user removes the setup fee", () => {
    const breakdown = getWorkspaceCheckoutBreakdown({
      plan: "starter",
      setupFeeWaived: false,
      setupFeePaid: false,
      subscriptionActive: false,
      includeSetupFee: false,
    });

    expect(breakdown.setupFeeAmount).toBe(0);
    expect(breakdown.total).toBe(99);
  });

  it("skips setup fee when platform setting is off", () => {
    const breakdown = getWorkspaceCheckoutBreakdown({
      plan: "business",
      setupFeeEnabled: false,
      setupFeeWaived: false,
      setupFeePaid: false,
      subscriptionActive: false,
    });

    expect(breakdown.setupFeeEligible).toBe(false);
    expect(breakdown.total).toBe(199);
  });

  it("skips setup fee when admin waived it", () => {
    const breakdown = getWorkspaceCheckoutBreakdown({
      plan: "pro",
      setupFeeWaived: true,
      setupFeePaid: false,
      subscriptionActive: false,
    });

    expect(breakdown.setupFeeEligible).toBe(false);
    expect(breakdown.total).toBe(399);
  });

  it("charges monthly only on renewals", () => {
    const breakdown = getWorkspaceCheckoutBreakdown({
      plan: "business",
      setupFeeWaived: false,
      setupFeePaid: false,
      subscriptionActive: true,
    });

    expect(breakdown.setupFeeEligible).toBe(false);
    expect(breakdown.total).toBe(199);
  });
});

describe("workspaceCheckoutAmountInKobo", () => {
  it("returns smallest currency units for checkout totals", () => {
    expect(
      workspaceCheckoutAmountInKobo({
        plan: "starter",
        setupFeeWaived: false,
        setupFeePaid: false,
        subscriptionActive: false,
      })
    ).toBe(209900);

    expect(
      workspaceCheckoutAmountInKobo({
        plan: "starter",
        setupFeeWaived: false,
        setupFeePaid: false,
        subscriptionActive: false,
        includeSetupFee: false,
      })
    ).toBe(9900);
  });
});

describe("resolveWorkspaceCheckoutIncludeSetupFee", () => {
  it("infers setup fee inclusion from the paid amount", () => {
    const checkoutInput = {
      plan: "business",
      setupFeeWaived: false,
      setupFeePaid: false,
      subscriptionActive: false,
    };

    expect(
      resolveWorkspaceCheckoutIncludeSetupFee({
        paidAmountKobo: 19900,
        checkoutInput,
      })
    ).toBe(false);

    expect(
      resolveWorkspaceCheckoutIncludeSetupFee({
        paidAmountKobo: 369900,
        checkoutInput,
      })
    ).toBe(true);
  });

  it("accepts only one valid amount when setup is not eligible", () => {
    const options = workspaceCheckoutAmountOptionsInKobo({
      plan: "business",
      setupFeeWaived: false,
      setupFeePaid: false,
      subscriptionActive: true,
    });

    expect(options).toEqual([19900]);
  });
});
