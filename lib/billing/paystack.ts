import { isSelfServePlan, normalizePlanSlug, pricingPlans } from "@/lib/data/pricing";

export const PAYSTACK_BASE_URL = "https://api.paystack.co";

/** Monthly subscription amount in the smallest currency unit (kobo / cents). */
export function planAmountInKobo(plan: string | null | undefined): number {
  const slug = normalizePlanSlug(plan);
  if (!isSelfServePlan(slug)) {
    return 0;
  }
  const record = pricingPlans.find((p) => p.slug === slug);
  const monthly = record?.monthly_price ?? pricingPlans[0].monthly_price;
  return Math.round(monthly * 100);
}

export function normalizeBillingPlan(plan: string | null | undefined): string {
  return normalizePlanSlug(plan);
}

/**
 * Extract a Paystack transaction reference from pasted input:
 * plain reference, query string, or full return URL.
 */
export function parsePaystackPaymentReference(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    if (trimmed.includes("://")) {
      const url = new URL(trimmed);
      return (
        url.searchParams.get("reference")?.trim() ||
        url.searchParams.get("trxref")?.trim() ||
        ""
      );
    }

    if (trimmed.includes("=")) {
      const query = trimmed.startsWith("?") ? trimmed.slice(1) : trimmed;
      const params = new URLSearchParams(query);
      return (
        params.get("reference")?.trim() ||
        params.get("trxref")?.trim() ||
        ""
      );
    }
  } catch {
    // fall through
  }

  return trimmed;
}
