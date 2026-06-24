import { normalizePlanSlug } from "@/lib/data/pricing";
import {
  getPlanEntitlements,
  type EntitlementFeature,
  type PlanEntitlements,
} from "@/lib/subscriptions/plan-entitlements";
import type {
  SubscriptionCompanyFields,
  SubscriptionStatus,
} from "@/lib/subscriptions/types";

const LEGACY_STATUS_MAP: Record<string, SubscriptionStatus> = {
  inactive: "pending_payment",
  trial: "trialing",
  suspended: "expired",
};

export function normalizeSubscriptionStatus(
  raw: string | null | undefined
): SubscriptionStatus {
  const value = (raw ?? "pending_payment").toLowerCase().trim();
  if (value in LEGACY_STATUS_MAP) {
    return LEGACY_STATUS_MAP[value]!;
  }
  const allowed: SubscriptionStatus[] = [
    "trialing",
    "pending_payment",
    "active",
    "past_due",
    "cancelled",
    "expired",
  ];
  return allowed.includes(value as SubscriptionStatus)
    ? (value as SubscriptionStatus)
    : "pending_payment";
}

export function isActiveSubscriptionStatus(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

export function isRestrictedSubscriptionStatus(
  status: SubscriptionStatus
): boolean {
  return (
    status === "pending_payment" ||
    status === "past_due" ||
    status === "cancelled" ||
    status === "expired"
  );
}

/** Features always available on an active workspace subscription. */
export const BASE_SUBSCRIPTION_FEATURES = [
  "overview",
  "bookings",
  "calendar",
  "customers",
  "services",
  "team",
] as const;

export type BaseSubscriptionFeature = (typeof BASE_SUBSCRIPTION_FEATURES)[number];

/** Routes allowed when payment is pending or the subscription has lapsed. */
export const RESTRICTED_ACCESS_FEATURES = [
  "overview",
  "subscription",
  "settings",
] as const;

export type RestrictedAccessFeature =
  (typeof RESTRICTED_ACCESS_FEATURES)[number];

export type AccessFeatureKey =
  | BaseSubscriptionFeature
  | RestrictedAccessFeature
  | EntitlementFeature
  | "hosting"
  | "support"
  | "featureRequests";

function isBaseFeature(feature: AccessFeatureKey): feature is BaseSubscriptionFeature {
  return (BASE_SUBSCRIPTION_FEATURES as readonly string[]).includes(feature as string);
}

function isRestrictedOnlyFeature(
  feature: AccessFeatureKey
): feature is RestrictedAccessFeature {
  return (RESTRICTED_ACCESS_FEATURES as readonly string[]).includes(feature as string);
}

function entitlementValue(
  entitlements: PlanEntitlements,
  feature: EntitlementFeature
): boolean {
  return Boolean(entitlements[feature]);
}

/**
 * Central subscription + plan gate used by UI, server actions, and API routes.
 */
export function canAccessFeature(
  company: SubscriptionCompanyFields,
  feature: AccessFeatureKey
): boolean {
  const status = normalizeSubscriptionStatus(company.subscription_status);

  if (isRestrictedSubscriptionStatus(status)) {
    return isRestrictedOnlyFeature(feature);
  }

  if (!isActiveSubscriptionStatus(status)) {
    return false;
  }

  if (isRestrictedOnlyFeature(feature) || feature === "support" || feature === "featureRequests") {
    return true;
  }

  if (feature === "hosting") {
    return true;
  }

  if (isBaseFeature(feature)) {
    return true;
  }

  const entitlements = getPlanEntitlements(normalizePlanSlug(company.plan));
  return entitlementValue(entitlements, feature);
}

export function subscriptionRenewalDate(
  company: SubscriptionCompanyFields
): string | null {
  return (
    company.subscription_expires_at ??
    company.next_billing_date ??
    null
  );
}

export function workspaceNeedsPayment(
  company: SubscriptionCompanyFields
): boolean {
  return (
    normalizeSubscriptionStatus(company.subscription_status) === "pending_payment"
  );
}

export function workspaceNeedsRenewal(
  company: SubscriptionCompanyFields
): boolean {
  const status = normalizeSubscriptionStatus(company.subscription_status);
  return status === "past_due" || status === "expired" || status === "cancelled";
}
