import { normalizePlanSlug } from "@/lib/data/pricing";

export const PAYSTACK_BASE_URL = "https://api.paystack.co";

export function planAmountInKobo(plan: string | null | undefined): number {
  const slug = normalizePlanSlug(plan);
  switch (slug) {
    case "business":
      return 1500000;
    case "premium":
      return 3000000;
    case "starter":
    default:
      return 500000;
  }
}

export function normalizeBillingPlan(plan: string | null | undefined): string {
  return normalizePlanSlug(plan);
}
