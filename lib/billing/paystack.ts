import { normalizePlanSlug, pricingPlans } from "@/lib/data/pricing";

export const PAYSTACK_BASE_URL = "https://api.paystack.co";

/** Monthly subscription amount in the smallest currency unit (kobo / cents). */
export function planAmountInKobo(plan: string | null | undefined): number {
  const slug = normalizePlanSlug(plan);
  const record = pricingPlans.find((p) => p.slug === slug);
  const monthly = record?.monthly_price ?? pricingPlans[0].monthly_price;
  return Math.round(monthly * 100);
}

export function normalizeBillingPlan(plan: string | null | undefined): string {
  return normalizePlanSlug(plan);
}
