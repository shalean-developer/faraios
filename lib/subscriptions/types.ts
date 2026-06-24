import type { SubscriptionPlanSlug } from "@/lib/subscriptions/plan-entitlements";

/** Canonical workspace subscription statuses stored on `companies.subscription_status`. */
export type SubscriptionStatus =
  | "trialing"
  | "pending_payment"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export type CompanySubscription = {
  plan: SubscriptionPlanSlug;
  subscription_status: SubscriptionStatus;
  subscription_started_at?: string | null;
  subscription_expires_at?: string | null;
  next_billing_date?: string | null;
  paystack_customer_code?: string | null;
  paystack_subscription_code?: string | null;
};

export type SubscriptionCompanyFields = {
  plan?: string | null;
  subscription_status?: string | null;
  subscription_started_at?: string | null;
  subscription_expires_at?: string | null;
  next_billing_date?: string | null;
  paystack_customer_code?: string | null;
  paystack_subscription_code?: string | null;
};
