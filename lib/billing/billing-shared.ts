import {
  isActiveSubscriptionStatus,
  normalizeSubscriptionStatus,
} from "@/lib/subscriptions/access";
import { normalizePlanSlug, pricingPlans } from "@/lib/data/pricing";

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

export type LegacyPaymentRecord = {
  id: string;
  plan_slug: string;
  amount_cents: number;
  currency: string;
  paystack_reference: string | null;
  status: string;
  paid_at: string;
};

export type BillingOverview = {
  subscription: BillingSubscriptionRecord | null;
  payments: PaymentHistoryRecord[];
  legacyPayments: LegacyPaymentRecord[];
  resolvedDates: {
    subscriptionStartedAt: string | null;
    nextBillingDate: string | null;
  };
};

export type BillingCompanyFields = {
  plan?: string | null;
  subscription_started_at?: string | null;
  subscription_expires_at?: string | null;
  next_billing_date?: string | null;
  subscription_status?: string | null;
  created_at?: string;
};

const BILLING_PERIOD_DAYS = 30;

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function paymentTimestamps(
  payments: PaymentHistoryRecord[],
  legacyPayments: LegacyPaymentRecord[]
): string[] {
  const timestamps = [
    ...payments.map((payment) => payment.paid_at ?? payment.created_at),
    ...legacyPayments.map((payment) => payment.paid_at),
  ].filter((value): value is string => Boolean(value));

  return timestamps.sort(
    (left, right) => new Date(left).getTime() - new Date(right).getTime()
  );
}

export function resolveBillingDates(
  company: BillingCompanyFields,
  subscription: BillingSubscriptionRecord | null,
  payments: PaymentHistoryRecord[],
  legacyPayments: LegacyPaymentRecord[]
): BillingOverview["resolvedDates"] {
  const status = normalizeSubscriptionStatus(company.subscription_status);
  const isActive = isActiveSubscriptionStatus(status);
  const paymentDates = paymentTimestamps(payments, legacyPayments);
  const earliestPayment = paymentDates[0] ?? null;
  const latestPayment = paymentDates[paymentDates.length - 1] ?? null;

  const subscriptionStartedAt =
    company.subscription_started_at ??
    subscription?.current_period_start ??
    earliestPayment ??
    (isActive ? company.created_at ?? null : null);

  let nextBillingDate =
    company.subscription_expires_at ??
    company.next_billing_date ??
    subscription?.current_period_end ??
    null;

  if (!nextBillingDate && subscriptionStartedAt && isActive) {
    const anchor = latestPayment ?? subscriptionStartedAt;
    nextBillingDate = addDays(anchor, BILLING_PERIOD_DAYS);
  }

  return { subscriptionStartedAt, nextBillingDate };
}

export type BillingPaymentRow = {
  id: string;
  date: string;
  plan: string;
  amount: number;
  reference: string | null;
  status: string;
};

export function buildBillingPaymentRows(
  billing: BillingOverview,
  company?: BillingCompanyFields
): BillingPaymentRow[] {
  const v7Rows = billing.payments.map((payment) => ({
    id: payment.id,
    date: payment.paid_at ?? payment.created_at,
    plan: payment.plan_slug,
    amount: payment.amount / 100,
    reference: payment.paystack_reference,
    status: payment.status,
  }));

  const seenReferences = new Set(
    v7Rows.map((row) => row.reference).filter((reference): reference is string => Boolean(reference))
  );

  const legacyRows = billing.legacyPayments
    .filter(
      (payment) =>
        !payment.paystack_reference || !seenReferences.has(payment.paystack_reference)
    )
    .map((payment) => ({
      id: payment.id,
      date: payment.paid_at,
      plan: payment.plan_slug,
      amount: payment.amount_cents / 100,
      reference: payment.paystack_reference,
      status: payment.status,
    }));

  const rows = [...v7Rows, ...legacyRows];

  if (rows.length > 0 || !company) {
    return rows.sort(
      (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
    );
  }

  const status = normalizeSubscriptionStatus(company.subscription_status);
  if (!isActiveSubscriptionStatus(status)) {
    return rows;
  }

  const startedAt =
    billing.resolvedDates.subscriptionStartedAt ??
    company.subscription_started_at ??
    company.created_at;
  if (!startedAt) {
    return rows;
  }

  const planSlug = normalizePlanSlug(company.plan);
  const planRecord = pricingPlans.find((plan) => plan.slug === planSlug);

  return [
    {
      id: "subscription-summary",
      date: startedAt,
      plan: planSlug,
      amount: planRecord?.monthly_price ?? 0,
      reference: null,
      status: status === "trialing" ? "trialing" : "active",
    },
  ];
}

export function subscriptionStatusLabel(status: string | null | undefined): string {
  return normalizeSubscriptionStatus(status).replace(/_/g, " ");
}
