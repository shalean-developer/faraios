import { describe, expect, it } from "vitest";

import {
  canAccessFeature,
  normalizeSubscriptionStatus,
} from "@/lib/subscriptions/access";
import { canAccessDashboardPath } from "@/lib/subscriptions/route-access";
import { planMemberLimit } from "@/lib/subscriptions/plan-entitlements";

describe("normalizeSubscriptionStatus", () => {
  it("maps legacy inactive to pending_payment", () => {
    expect(normalizeSubscriptionStatus("inactive")).toBe("pending_payment");
  });

  it("maps legacy trial to trialing", () => {
    expect(normalizeSubscriptionStatus("trial")).toBe("trialing");
  });
});

describe("canAccessFeature", () => {
  const activeStarter = { plan: "starter", subscription_status: "active" };
  const pendingStarter = { plan: "starter", subscription_status: "pending_payment" };

  it("allows starter base features when active", () => {
    expect(canAccessFeature(activeStarter, "bookings")).toBe(true);
    expect(canAccessFeature(activeStarter, "customers")).toBe(true);
  });

  it("blocks growth features on starter", () => {
    expect(canAccessFeature(activeStarter, "seo")).toBe(false);
    expect(canAccessFeature(activeStarter, "leads")).toBe(false);
  });

  it("allows business growth features on business plan", () => {
    expect(
      canAccessFeature({ plan: "business", subscription_status: "active" }, "seo")
    ).toBe(true);
  });

  it("allows premium-only automations on premium", () => {
    expect(
      canAccessFeature({ plan: "premium", subscription_status: "active" }, "automations")
    ).toBe(true);
    expect(
      canAccessFeature({ plan: "business", subscription_status: "active" }, "automations")
    ).toBe(false);
  });

  it("restricts pending payment to overview, subscription, and settings", () => {
    expect(canAccessFeature(pendingStarter, "overview")).toBe(true);
    expect(canAccessFeature(pendingStarter, "subscription")).toBe(true);
    expect(canAccessFeature(pendingStarter, "settings")).toBe(true);
    expect(canAccessFeature(pendingStarter, "bookings")).toBe(false);
    expect(canAccessFeature(pendingStarter, "seo")).toBe(false);
  });
});

describe("canAccessDashboardPath", () => {
  const slug = "acme-cleaning";
  const company = { plan: "starter", subscription_status: "pending_payment" };

  it("allows subscription page while payment is pending", () => {
    expect(
      canAccessDashboardPath(company, slug, `/${slug}/dashboard/subscription`)
    ).toBe(true);
  });

  it("blocks seo routes while payment is pending", () => {
    expect(canAccessDashboardPath(company, slug, `/${slug}/dashboard/seo`)).toBe(
      false
    );
  });
});

describe("planMemberLimit", () => {
  it("returns plan-specific team caps", () => {
    expect(planMemberLimit("starter")).toBe(1);
    expect(planMemberLimit("business")).toBe(5);
    expect(planMemberLimit("premium")).toBe(Infinity);
  });
});
