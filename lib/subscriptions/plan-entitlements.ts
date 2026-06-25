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
    recurringBookings: false,
    multiBranch: false,
    customIntegrations: false,
  },
  business: {
    maxTeamMembers: 3,
    leads: false,
    quotes: true,
    invoices: true,
    payments: true,
    seo: false,
    campaigns: false,
    reviews: false,
    reports: true,
    automations: false,
    aiInsights: false,
    businessHealth: false,
    customRoles: false,
    websites: false,
    tasks: true,
    recurringBookings: false,
    multiBranch: false,
    customIntegrations: false,
  },
  pro: {
    maxTeamMembers: 10,
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
    customRoles: false,
    websites: true,
    tasks: true,
    recurringBookings: true,
    multiBranch: false,
    customIntegrations: false,
  },
  enterprise: {
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
    recurringBookings: true,
    multiBranch: true,
    customIntegrations: true,
  },
} as const;

export type SubscriptionPlanSlug = keyof typeof PLAN_ENTITLEMENTS;
export type PlanEntitlements = (typeof PLAN_ENTITLEMENTS)[SubscriptionPlanSlug];
export type EntitlementFeature = Exclude<
  keyof (typeof PLAN_ENTITLEMENTS)["starter"],
  "maxTeamMembers"
>;

const PLAN_ORDER: SubscriptionPlanSlug[] = [
  "starter",
  "business",
  "pro",
  "enterprise",
];

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
  for (const slug of PLAN_ORDER) {
    if (PLAN_ENTITLEMENTS[slug][feature]) return slug;
  }
  return "enterprise";
}

export function planLabelForUpgrade(feature: EntitlementFeature): string {
  const plan = minimumPlanForFeature(feature);
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}
