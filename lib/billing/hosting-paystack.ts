import {
  getHostingPlan,
  normalizeHostingPlanSlug,
} from "@/lib/data/hosting";

/** Hosting subscription amount in the smallest currency unit (kobo / cents). */
export function hostingPlanAmountInKobo(
  plan: string | null | undefined
): number {
  const record = getHostingPlan(normalizeHostingPlanSlug(plan));
  return Math.round(record.monthly_price * 100);
}

export function normalizeHostingBillingPlan(
  plan: string | null | undefined
): string {
  return normalizeHostingPlanSlug(plan);
}
