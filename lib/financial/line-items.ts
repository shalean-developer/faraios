import type { LineItemInput } from "@/types/financial";

export type ComputedTotals = {
  subtotalCents: number;
  lineItems: Array<{
    service_id: string | null;
    description: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
    sort_order: number;
  }>;
};

export function computeLineItemTotals(
  items: LineItemInput[],
  discountCents = 0,
  taxCents = 0
): ComputedTotals & { totalCents: number; discountCents: number; taxCents: number } {
  const lineItems = items.map((item, index) => {
    const quantity = Math.max(0.01, item.quantity);
    const unitPrice = Math.max(0, item.unitPriceCents);
    const totalCents = Math.round(quantity * unitPrice);
    return {
      service_id: item.serviceId ?? null,
      description: item.description.trim(),
      quantity,
      unit_price_cents: unitPrice,
      total_cents: totalCents,
      sort_order: index,
    };
  });

  const subtotalCents = lineItems.reduce((sum, li) => sum + li.total_cents, 0);
  const safeDiscount = Math.min(subtotalCents, Math.max(0, discountCents));
  const safeTax = Math.max(0, taxCents);
  const totalCents = Math.max(0, subtotalCents - safeDiscount + safeTax);

  return {
    subtotalCents,
    discountCents: safeDiscount,
    taxCents: safeTax,
    totalCents,
    lineItems,
  };
}
