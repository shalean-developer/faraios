import { describe, expect, it } from "vitest";

import { calculateBookingPrice } from "../lib/bookings/pricing-calculator";

describe("calculateBookingPrice", () => {
  it("calculates base + bedrooms + bathrooms", () => {
    const result = calculateBookingPrice({
      serviceBasePriceCents: 45000,
      bedrooms: 3,
      bathrooms: 2,
      pricingRule: {
        id: "1",
        company_id: "c1",
        service_id: null,
        base_price_cents: 0,
        price_per_bedroom_cents: 5000,
        price_per_bathroom_cents: 3000,
        service_fee_cents: 0,
        minimum_price_cents: 0,
        maximum_price_cents: null,
        frequency_discounts: {},
        vat_rate_percent: 0,
        custom_quote_enabled: false,
        active: true,
      },
    });

    expect(result.totalCents).toBe(45000 + 15000 + 6000);
  });

  it("applies frequency discount and VAT", () => {
    const result = calculateBookingPrice({
      serviceBasePriceCents: 10000,
      frequency: "Weekly",
      pricingRule: {
        id: "1",
        company_id: "c1",
        service_id: null,
        base_price_cents: 0,
        price_per_bedroom_cents: 0,
        price_per_bathroom_cents: 0,
        service_fee_cents: 1000,
        minimum_price_cents: 0,
        maximum_price_cents: null,
        frequency_discounts: { Weekly: 10 },
        vat_rate_percent: 15,
        custom_quote_enabled: false,
        active: true,
      },
    });

    expect(result.discountCents).toBe(1000);
    expect(result.serviceFeeCents).toBe(1000);
    expect(result.vatCents).toBeGreaterThan(0);
    expect(result.totalCents).toBeGreaterThan(10000);
  });

  it("enforces minimum price", () => {
    const result = calculateBookingPrice({
      serviceBasePriceCents: 5000,
      pricingRule: {
        id: "1",
        company_id: "c1",
        service_id: null,
        base_price_cents: 0,
        price_per_bedroom_cents: 0,
        price_per_bathroom_cents: 0,
        service_fee_cents: 0,
        minimum_price_cents: 10000,
        maximum_price_cents: null,
        frequency_discounts: {},
        vat_rate_percent: 0,
        custom_quote_enabled: false,
        active: true,
      },
    });

    expect(result.totalCents).toBe(10000);
  });
});
