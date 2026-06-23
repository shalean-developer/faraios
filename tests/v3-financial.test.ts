import { describe, expect, it } from "vitest";

import { computeLineItemTotals } from "@/lib/financial/line-items";
import { computeDepositAmountCents } from "@/lib/financial/status";

describe("computeLineItemTotals", () => {
  it("sums line items and applies discount and tax", () => {
    const result = computeLineItemTotals(
      [
        { description: "Service A", quantity: 2, unitPriceCents: 10000 },
        { description: "Addon", quantity: 1, unitPriceCents: 5000 },
      ],
      2000,
      1000
    );
    expect(result.subtotalCents).toBe(25000);
    expect(result.discountCents).toBe(2000);
    expect(result.taxCents).toBe(1000);
    expect(result.totalCents).toBe(24000);
    expect(result.lineItems).toHaveLength(2);
  });
});

describe("computeDepositAmountCents", () => {
  it("returns full amount for full deposit type", () => {
    expect(computeDepositAmountCents(10000, "full", 100)).toBe(10000);
  });

  it("returns percentage of total", () => {
    expect(computeDepositAmountCents(10000, "percentage", 50)).toBe(5000);
  });

  it("returns fixed amount capped at total", () => {
    expect(computeDepositAmountCents(10000, "fixed", 50000)).toBe(10000);
    expect(computeDepositAmountCents(10000, "fixed", 2500)).toBe(2500);
  });
});
