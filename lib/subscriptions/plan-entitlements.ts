import { normalizePlanSlug } from "@/lib/data/pricing";

export const PLAN_ENTITLEMENTS = {
  starter: {
    maxTeamMembers: 1,
    leads: false,
    quotes: false,
    invoices: false,
    payments: false,
    seo: false,
    campaigns: false,
    reviews: false,
    reports: false,
    automations: false,
    aiInsights: false,
    businessHealth: false,
    customRoles: false,
    websites: false,
    tasks: false,
  },
  business: {
    maxTeamMembers: 5,
    leads: true,
    quotes: true,
    invoices: true,
    payments: true,
    seo: true,
    campaigns: true,
    reviews: true,
    reports: true,
    automations: false,
    aiInsights: false,
    businessHealth: false,
    customRoles: false,
    websites: true,
    tasks: true,
  },
  premium: {
    maxTeamMembers: Infinity,
    leads: true,
    quotes: true,
    invoices: true,
    payments: true,
    seo: true,
    campaigns: true,
    reviews: true,
    reports: true,
    automations: true,
    aiInsights: true,
    businessHealth: true,
    customRoles: true,
    websites: true,
    tasks: true,
  },
} as const;

export type SubscriptionPlanSlug = keyof typeof PLAN_ENTITLEMENTS;
export type PlanEntitlements = (typeof PLAN_ENTITLEMENTS)[SubscriptionPlanSlug];
export type EntitlementFeature = Exclude<
  keyof (typeof PLAN_ENTITLEMENTS)["starter"],
  "maxTeamMembers"
>;

export function getPlanEntitlements(
  plan: string | null | undefined
): PlanEntitlements {
  const slug = normalizePlanSlug(plan) as SubscriptionPlanSlug;
  return PLAN_ENTITLEMENTS[slug];
}

export function planMemberLimit(plan: string | null | undefined): number {
  return getPlanEntitlements(plan).maxTeamMembers;
}

export function minimumPlanForFeature(
  feature: EntitlementFeature
): SubscriptionPlanSlug {
  const order: SubscriptionPlanSlug[] = ["starter", "business", "premium"];
  for (const slug of order) {
    if (PLAN_ENTITLEMENTS[slug][feature]) return slug;
  }
  return "premium";
}

export function planLabelForUpgrade(feature: EntitlementFeature): string {
  const plan = minimumPlanForFeature(feature);
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}
