import { describe, expect, it } from "vitest";

import { canEditInvoice, canEditQuote } from "../lib/financial/document-edit";
import {
  aggregateServicePaymentStats,
  averagePaymentCents,
  topServiceByPaidRevenue,
} from "../lib/financial/payment-revenue";
import {
  getBookingFormPreset,
  getOnboardingDefaults,
  getServiceTemplates,
  loadIndustryModule,
} from "../lib/industry-modules/loader";

describe("payment revenue helpers", () => {
  it("computes average from paid payments only", () => {
    expect(averagePaymentCents([{ amount_cents: 10000 }, { amount_cents: 20000 }])).toBe(15000);
    expect(averagePaymentCents([])).toBe(0);
  });

  it("attributes paid revenue to services via bookings", () => {
    const stats = aggregateServicePaymentStats(
      [
        { id: "b1", service_id: "svc-a" },
        { id: "b2", service_id: "svc-a" },
        { id: "b3", service_id: "svc-b" },
      ],
      [
        { amount_cents: 50000, status: "paid", booking_id: "b1" },
        { amount_cents: 25000, status: "paid", booking_id: "b3" },
        { amount_cents: 9999, status: "pending", booking_id: "b2" },
      ]
    );

    expect(stats["svc-a"].bookingCount).toBe(2);
    expect(stats["svc-a"].revenueCents).toBe(50000);
    expect(stats["svc-b"].revenueCents).toBe(25000);
  });

  it("finds top service by paid revenue", () => {
    const top = topServiceByPaidRevenue(
      [
        { id: "b1", service: "Deep clean" },
        { id: "b2", service: "Standard clean" },
      ],
      [
        { amount_cents: 120000, status: "paid", booking_id: "b1" },
        { amount_cents: 40000, status: "paid", booking_id: "b2" },
      ]
    );
    expect(top?.name).toBe("Deep clean");
    expect(top?.revenueCents).toBe(120000);
  });
});

describe("financial document edit rules", () => {
  it("allows quote edits before acceptance", () => {
    expect(canEditQuote("draft")).toBe(true);
    expect(canEditQuote("sent")).toBe(true);
    expect(canEditQuote("viewed")).toBe(true);
    expect(canEditQuote("accepted")).toBe(false);
    expect(canEditQuote("converted")).toBe(false);
  });

  it("allows invoice edits for drafts only", () => {
    expect(canEditInvoice("draft")).toBe(true);
    expect(canEditInvoice("issued")).toBe(false);
    expect(canEditInvoice("paid")).toBe(false);
  });
});

/** Phase A E2E readiness — industry journey presets for target businesses. */
describe("Phase A industry onboarding journeys", () => {
  const TARGET_BUSINESSES = [
    {
      name: "FaraiOS Cleaning Services",
      industrySlug: "cleaning",
      expectedField: "cleaning_type",
      expectedServiceKeyword: "Deep",
    },
    {
      name: "ProFix Electrical",
      industrySlug: "electrical",
      expectedField: "electrical_issue",
      expectedServiceKeyword: "Electrical",
    },
    {
      name: "MakTech",
      industrySlug: "technology",
      expectedField: "issue_type",
      expectedServiceKeyword: "Support",
    },
    {
      name: "Afrika Tour",
      industrySlug: "tourism",
      expectedField: "guests",
      expectedServiceKeyword: "Tour",
    },
  ] as const;

  it.each(TARGET_BUSINESSES)(
    "$name ($industrySlug) loads industry module with booking preset and services",
    ({ industrySlug, expectedField, expectedServiceKeyword }) => {
      const industryModule = loadIndustryModule(industrySlug);
      expect(industryModule.slug).toBe(industrySlug);

      const fields = getBookingFormPreset(industrySlug);
      expect(fields.some((f) => f.key === expectedField)).toBe(true);

      const services = getServiceTemplates(industrySlug);
      expect(services.length).toBeGreaterThan(0);
      expect(
        services.some((s) =>
          s.name.toLowerCase().includes(expectedServiceKeyword.toLowerCase())
        )
      ).toBe(true);

      const onboarding = getOnboardingDefaults(industrySlug);
      expect(onboarding.featureSlugs.length).toBeGreaterThan(0);
    }
  );
});
