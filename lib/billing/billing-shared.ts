import { normalizeSubscriptionStatus } from "@/lib/subscriptions/access";

export type BillingSubscriptionRecord = {
  id: string;
  company_id: string;
  user_id: string | null;
  plan_id: string;
  plan_slug: string;
  plan_name: string;
  status: string;
  paystack_customer_id: string | null;
  paystack_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentHistoryRecord = {
  id: string;
  company_id: string;
  user_id: string | null;
  plan_id: string;
  plan_slug: string;
  amount: number;
  currency: string;
  status: string;
  paystack_reference: string | null;
  paid_at: string | null;
  created_at: string;
};

export type BillingOverview = {
  subscription: BillingSubscriptionRecord | null;
  payments: PaymentHistoryRecord[];
  legacyPayments: {
    id: string;
    plan_slug: string;
    amount_cents: number;
    currency: string;
    paystack_reference: string | null;
    status: string;
    paid_at: string;
  }[];
};

export function subscriptionStatusLabel(status: string | null | undefined): string {
  return normalizeSubscriptionStatus(status).replace(/_/g, " ");
}
