import type {
  BookingFormExtra,
  BookingFormPricingRule,
  PriceBreakdownLine,
  ServiceAddon,
} from "@/types/booking-form";

export type PricingInput = {
  serviceBasePriceCents: number;
  bedrooms?: number;
  bathrooms?: number;
  frequency?: string;
  selectedAddons?: ServiceAddon[];
  selectedExtras?: Pick<BookingFormExtra, "id" | "name" | "price_cents">[];
  pricingRule?: BookingFormPricingRule | null;
};

export type PricingResult = {
  breakdown: PriceBreakdownLine[];
  subtotalCents: number;
  discountCents: number;
  serviceFeeCents: number;
  vatCents: number;
  totalCents: number;
  requiresCustomQuote: boolean;
};

function parseCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function calculateBookingPrice(input: PricingInput): PricingResult {
  const rule = input.pricingRule;
  const breakdown: PriceBreakdownLine[] = [];

  const baseCents =
    (rule?.base_price_cents ?? 0) > 0
      ? rule!.base_price_cents
      : input.serviceBasePriceCents;

  if (baseCents > 0) {
    breakdown.push({ label: "Base service", amountCents: baseCents });
  }

  const bedrooms = parseCount(input.bedrooms);
  const bathrooms = parseCount(input.bathrooms);
  const bedroomRate = rule?.price_per_bedroom_cents ?? 0;
  const bathroomRate = rule?.price_per_bathroom_cents ?? 0;

  if (bedrooms > 0 && bedroomRate > 0) {
    const amount = bedrooms * bedroomRate;
    breakdown.push({
      label: `${bedrooms} bedroom${bedrooms > 1 ? "s" : ""}`,
      amountCents: amount,
    });
  }

  if (bathrooms > 0 && bathroomRate > 0) {
    const amount = bathrooms * bathroomRate;
    breakdown.push({
      label: `${bathrooms} bathroom${bathrooms > 1 ? "s" : ""}`,
      amountCents: amount,
    });
  }

  for (const addon of input.selectedAddons ?? []) {
    if (addon.price_cents > 0) {
      breakdown.push({ label: addon.name, amountCents: addon.price_cents });
    }
  }

  for (const extra of input.selectedExtras ?? []) {
    if (extra.price_cents > 0) {
      breakdown.push({ label: extra.name, amountCents: extra.price_cents });
    }
  }

  const subtotalCents = breakdown.reduce((sum, line) => sum + line.amountCents, 0);

  let discountCents = 0;
  const frequency = input.frequency?.trim();
  if (frequency && rule?.frequency_discounts) {
    const pct = rule.frequency_discounts[frequency] ?? 0;
    if (pct > 0) {
      discountCents = Math.round((subtotalCents * pct) / 100);
      breakdown.push({
        label: `${frequency} discount (${pct}%)`,
        amountCents: -discountCents,
      });
    }
  }

  const afterDiscount = subtotalCents - discountCents;
  const serviceFeeCents = rule?.service_fee_cents ?? 0;
  if (serviceFeeCents > 0) {
    breakdown.push({ label: "Service fee", amountCents: serviceFeeCents });
  }

  const beforeVat = afterDiscount + serviceFeeCents;
  const vatRate = rule?.vat_rate_percent ?? 0;
  const vatCents = vatRate > 0 ? Math.round((beforeVat * vatRate) / 100) : 0;
  if (vatCents > 0) {
    breakdown.push({ label: `VAT (${vatRate}%)`, amountCents: vatCents });
  }

  let totalCents = beforeVat + vatCents;

  const minPrice = rule?.minimum_price_cents ?? 0;
  if (minPrice > 0 && totalCents < minPrice) {
    const adjustment = minPrice - totalCents;
    breakdown.push({ label: "Minimum price adjustment", amountCents: adjustment });
    totalCents = minPrice;
  }

  const maxPrice = rule?.maximum_price_cents;
  if (maxPrice != null && maxPrice > 0 && totalCents > maxPrice) {
    totalCents = maxPrice;
  }

  const requiresCustomQuote = Boolean(rule?.custom_quote_enabled && totalCents === 0);

  return {
    breakdown,
    subtotalCents,
    discountCents,
    serviceFeeCents,
    vatCents,
    totalCents,
    requiresCustomQuote,
  };
}

export function defaultPricingRule(companyId: string): Omit<BookingFormPricingRule, "id"> {
  return {
    company_id: companyId,
    service_id: null,
    base_price_cents: 0,
    price_per_bedroom_cents: 0,
    price_per_bathroom_cents: 0,
    service_fee_cents: 0,
    minimum_price_cents: 0,
    maximum_price_cents: null,
    frequency_discounts: {
      Weekly: 10,
      "Bi-weekly": 5,
      Monthly: 3,
    },
    vat_rate_percent: 15,
    custom_quote_enabled: false,
    active: true,
  };
}
