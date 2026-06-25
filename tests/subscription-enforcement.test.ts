import { describe, expect, it } from "vitest";

import {
  canAccessFeature,
  normalizeSubscriptionStatus,
} from "@/lib/subscriptions/access";
import { canAccessDashboardPath } from "@/lib/subscriptions/route-access";
import { minimumPlanForFeature, planMemberLimit } from "@/lib/subscriptions/plan-entitlements";
import { isSelfServePlan, normalizePlanSlug } from "@/lib/data/pricing";
import { planAmountInKobo } from "@/lib/billing/paystack";

describe("normalizeSubscriptionStatus", () => {
  it("maps legacy inactive to pending_payment", () => {
    expect(normalizeSubscriptionStatus("inactive")).toBe("pending_payment");
  });

  it("maps legacy trial to trialing", () => {
    expect(normalizeSubscriptionStatus("trial")).toBe("trialing");
  });
});

describe("normalizePlanSlug", () => {
  it("maps legacy premium slug to pro", () => {
    expect(normalizePlanSlug("premium")).toBe("pro");
  });
});

describe("canAccessFeature", () => {
  const activeStarter = { plan: "starter", subscription_status: "active" };
  const activeBusiness = { plan: "business", subscription_status: "active" };
  const activePro = { plan: "pro", subscription_status: "active" };
  const pendingStarter = { plan: "starter", subscription_status: "pending_payment" };

  it("allows starter base features when active", () => {
    expect(canAccessFeature(activeStarter, "bookings")).toBe(true);
    expect(canAccessFeature(activeStarter, "customers")).toBe(true);
  });

  it("blocks business tools on starter", () => {
    expect(canAccessFeature(activeStarter, "quotes")).toBe(false);
    expect(canAccessFeature(activeStarter, "invoices")).toBe(false);
    expect(canAccessFeature(activeStarter, "payments")).toBe(false);
  });

  it("blocks legacy websites hub on starter", () => {
    expect(canAccessFeature(activeStarter, "seo")).toBe(false);
    expect(canAccessFeature(activeStarter, "leads")).toBe(false);
    expect(canAccessFeature(activeStarter, "websites")).toBe(false);
    expect(canAccessFeature(activeStarter, "websiteBuilder")).toBe(true);
  });

  it("allows business revenue features on business plan", () => {
    expect(canAccessFeature(activeBusiness, "quotes")).toBe(true);
    expect(canAccessFeature(activeBusiness, "invoices")).toBe(true);
    expect(canAccessFeature(activeBusiness, "payments")).toBe(true);
    expect(canAccessFeature(activeBusiness, "reports")).toBe(true);
  });

  it("blocks pro tools on business plan", () => {
    expect(canAccessFeature(activeBusiness, "seo")).toBe(false);
    expect(canAccessFeature(activeBusiness, "automations")).toBe(false);
    expect(canAccessFeature(activeBusiness, "websites")).toBe(false);
    expect(canAccessFeature(activeBusiness, "websiteBuilder")).toBe(true);
  });

  it("allows pro tools on pro plan", () => {
    expect(canAccessFeature(activePro, "automations")).toBe(true);
    expect(canAccessFeature(activePro, "seo")).toBe(true);
    expect(canAccessFeature(activePro, "websites")).toBe(true);
    expect(canAccessFeature(activePro, "aiInsights")).toBe(true);
  });

  it("restricts pending payment to overview, billing, subscription, and settings", () => {
    expect(canAccessFeature(pendingStarter, "overview")).toBe(true);
    expect(canAccessFeature(pendingStarter, "subscription")).toBe(true);
    expect(canAccessFeature(pendingStarter, "billing")).toBe(true);
    expect(canAccessFeature(pendingStarter, "settings")).toBe(true);
    expect(canAccessFeature(pendingStarter, "bookings")).toBe(false);
    expect(canAccessFeature(pendingStarter, "seo")).toBe(false);
  });
});

describe("canAccessDashboardPath", () => {
  const slug = "acme-cleaning";
  const company = { plan: "starter", subscription_status: "pending_payment" };

  it("allows billing page while payment is pending", () => {
    expect(
      canAccessDashboardPath(company, slug, `/${slug}/dashboard/billing`)
    ).toBe(true);
  });

  it("blocks seo routes while payment is pending", () => {
    expect(canAccessDashboardPath(company, slug, `/${slug}/dashboard/seo`)).toBe(
      false
    );
  });

  it("blocks quotes for starter users", () => {
    expect(
      canAccessDashboardPath(
        { plan: "starter", subscription_status: "active" },
        slug,
        `/${slug}/dashboard/quotes`
      )
    ).toBe(false);
  });

  it("blocks automations for business users", () => {
    expect(
      canAccessDashboardPath(
        { plan: "business", subscription_status: "active" },
        slug,
        `/${slug}/dashboard/automations`
      )
    ).toBe(false);
  });
});

describe("planMemberLimit", () => {
  it("returns V7 team caps", () => {
    expect(planMemberLimit("starter")).toBe(1);
    expect(planMemberLimit("business")).toBe(3);
    expect(planMemberLimit("pro")).toBe(10);
    expect(planMemberLimit("enterprise")).toBe(Infinity);
  });
});

describe("minimumPlanForFeature", () => {
  it("maps features to required plans", () => {
    expect(minimumPlanForFeature("quotes")).toBe("business");
    expect(minimumPlanForFeature("seo")).toBe("pro");
    expect(minimumPlanForFeature("customRoles")).toBe("enterprise");
  });
});

describe("planAmountInKobo", () => {
  it("charges correct amounts for self-serve plans", () => {
    expect(planAmountInKobo("starter")).toBe(9900);
    expect(planAmountInKobo("business")).toBe(19900);
    expect(planAmountInKobo("pro")).toBe(39900);
  });

  it("returns zero for enterprise", () => {
    expect(planAmountInKobo("enterprise")).toBe(0);
    expect(isSelfServePlan("enterprise")).toBe(false);
  });
});
