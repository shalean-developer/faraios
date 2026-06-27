import { describe, expect, it } from "vitest";

import {
  buildBillingPaymentRows,
  resolveBillingDates,
  type BillingOverview,
} from "../lib/billing/billing-shared";

describe("resolveBillingDates", () => {
  it("falls back to company created_at for active workspaces missing metadata", () => {
    const resolved = resolveBillingDates(
      {
        subscription_status: "active",
        created_at: "2026-01-15T10:00:00.000Z",
      },
      null,
      [],
      []
    );

    expect(resolved.subscriptionStartedAt).toBe("2026-01-15T10:00:00.000Z");
    expect(resolved.nextBillingDate).toBe("2026-02-14T10:00:00.000Z");
  });

  it("prefers stored company billing dates when present", () => {
    const resolved = resolveBillingDates(
      {
        subscription_status: "active",
        subscription_started_at: "2026-03-01T00:00:00.000Z",
        next_billing_date: "2026-04-01T00:00:00.000Z",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      null,
      [],
      []
    );

    expect(resolved.subscriptionStartedAt).toBe("2026-03-01T00:00:00.000Z");
    expect(resolved.nextBillingDate).toBe("2026-04-01T00:00:00.000Z");
  });

  it("derives dates from payment history", () => {
    const resolved = resolveBillingDates(
      { subscription_status: "active" },
      null,
      [
        {
          id: "pay-1",
          company_id: "co-1",
          user_id: null,
          plan_id: "plan_starter",
          plan_slug: "starter",
          amount: 49900,
          currency: "ZAR",
          status: "success",
          paystack_reference: "ref-1",
          paid_at: "2026-05-10T12:00:00.000Z",
          created_at: "2026-05-10T12:00:00.000Z",
        },
      ],
      []
    );

    expect(resolved.subscriptionStartedAt).toBe("2026-05-10T12:00:00.000Z");
    expect(resolved.nextBillingDate).toBe("2026-06-09T12:00:00.000Z");
  });
});

describe("buildBillingPaymentRows", () => {
  it("merges v7 and legacy payments without duplicate references", () => {
    const billing: BillingOverview = {
      subscription: null,
      resolvedDates: {
        subscriptionStartedAt: null,
        nextBillingDate: null,
      },
      payments: [
        {
          id: "v7-1",
          company_id: "co-1",
          user_id: null,
          plan_id: "plan_starter",
          plan_slug: "starter",
          amount: 49900,
          currency: "ZAR",
          status: "success",
          paystack_reference: "shared-ref",
          paid_at: "2026-05-10T12:00:00.000Z",
          created_at: "2026-05-10T12:00:00.000Z",
        },
      ],
      legacyPayments: [
        {
          id: "legacy-1",
          plan_slug: "starter",
          amount_cents: 49900,
          currency: "ZAR",
          paystack_reference: "shared-ref",
          status: "success",
          paid_at: "2026-05-09T12:00:00.000Z",
        },
        {
          id: "legacy-2",
          plan_slug: "business",
          amount_cents: 99900,
          currency: "ZAR",
          paystack_reference: "legacy-only",
          status: "success",
          paid_at: "2026-04-01T12:00:00.000Z",
        },
      ],
    };

    const rows = buildBillingPaymentRows(billing);

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.reference)).toEqual(["shared-ref", "legacy-only"]);
    expect(rows[0]?.amount).toBe(499);
  });

  it("shows a subscription summary row when billing is active but payment tables are empty", () => {
    const billing: BillingOverview = {
      subscription: null,
      resolvedDates: {
        subscriptionStartedAt: "2026-03-01T00:00:00.000Z",
        nextBillingDate: "2026-04-01T00:00:00.000Z",
      },
      payments: [],
      legacyPayments: [],
    };

    const rows = buildBillingPaymentRows(billing, {
      plan: "business",
      subscription_status: "active",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.plan).toBe("business");
    expect(rows[0]?.amount).toBe(199);
    expect(rows[0]?.status).toBe("active");
  });
});
