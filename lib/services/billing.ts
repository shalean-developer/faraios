import { normalizePlanSlug, planLabelForSlug, pricingPlans } from "@/lib/data/pricing";
import { createAdminClient, tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import {
  isActiveSubscriptionStatus,
  normalizeSubscriptionStatus,
} from "@/lib/subscriptions/access";
import type {
  BillingCompanyFields,
  BillingOverview,
  BillingSubscriptionRecord,
  LegacyPaymentRecord,
  PaymentHistoryRecord,
} from "@/lib/billing/billing-shared";
import { resolveBillingDates } from "@/lib/billing/billing-shared";

export type {
  BillingOverview,
  BillingSubscriptionRecord,
  PaymentHistoryRecord,
} from "@/lib/billing/billing-shared";
export { subscriptionStatusLabel } from "@/lib/billing/billing-shared";

const EMPTY_BILLING_OVERVIEW: BillingOverview = {
  subscription: null,
  payments: [],
  legacyPayments: [],
  resolvedDates: {
    subscriptionStartedAt: null,
    nextBillingDate: null,
  },
};

function isMissingTableError(error: { code?: string; message?: string }, table: string): boolean {
  const message = error.message ?? "";
  return (
    error.code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes(`relation "public.${table}" does not exist`) ||
    message.includes(`Could not find the table 'public.${table}'`)
  );
}

function planSlugFromPlanId(planId: string): string {
  const record = pricingPlans.find((plan) => plan.id === planId);
  if (record) return record.slug;
  return normalizePlanSlug(planId.replace(/^plan_/, ""));
}

function getBillingAdminClient() {
  const result = tryCreateAdminClient();
  if (!result.ok) {
    console.error("[billing] admin client unavailable", result.error);
    return null;
  }
  return result.client;
}

async function listPaymentHistory(companyId: string): Promise<PaymentHistoryRecord[]> {
  const admin = getBillingAdminClient();
  const supabase = admin ?? (await createClient());

  const { data, error } = await supabase
    .from("payment_history")
    .select(
      "id, company_id, user_id, plan_id, amount, currency, status, paystack_reference, paid_at, created_at"
    )
    .eq("company_id", companyId)
    .order("paid_at", { ascending: false, nullsFirst: false })
    .limit(30);

  if (error) {
    if (!isMissingTableError(error, "payment_history")) {
      console.error("[billing] listPaymentHistory", error.message);
    }
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    company_id: row.company_id as string,
    user_id: row.user_id as string | null,
    plan_id: row.plan_id as string,
    plan_slug: planSlugFromPlanId(row.plan_id as string),
    amount: row.amount as number,
    currency: row.currency as string,
    status: row.status as string,
    paystack_reference: row.paystack_reference as string | null,
    paid_at: row.paid_at as string | null,
    created_at: row.created_at as string,
  }));
}

async function listLegacySubscriptionPayments(
  companyId: string
): Promise<LegacyPaymentRecord[]> {
  const admin = getBillingAdminClient();
  const supabase = admin ?? (await createClient());

  const { data, error } = await supabase
    .from("subscription_payments")
    .select("id, plan_slug, amount_cents, currency, paystack_reference, status, paid_at")
    .eq("company_id", companyId)
    .order("paid_at", { ascending: false })
    .limit(30);

  if (error) {
    if (!isMissingTableError(error, "subscription_payments")) {
      console.error("[billing] listLegacySubscriptionPayments", error.message);
    }
    return [];
  }

  return (data ?? []) as LegacyPaymentRecord[];
}

async function getActiveSubscription(
  companyId: string
): Promise<BillingSubscriptionRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      `
      id,
      company_id,
      user_id,
      plan_id,
      status,
      paystack_customer_id,
      paystack_subscription_id,
      current_period_start,
      current_period_end,
      created_at,
      updated_at,
      plans:plan_id ( slug, name )
    `
    )
    .eq("company_id", companyId)
    .in("status", ["active", "trialing", "past_due", "pending_payment"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const missing =
      error.code === "PGRST205" ||
      error.message.includes("subscriptions") ||
      error.message.includes("schema cache");
    if (!missing) {
      console.error("[billing] getActiveSubscription", error.message);
    }
    return null;
  }

  if (!data) return null;

  const plan = data.plans as { slug?: string; name?: string } | null;
  return {
    id: data.id as string,
    company_id: data.company_id as string,
    user_id: data.user_id as string | null,
    plan_id: data.plan_id as string,
    plan_slug: plan?.slug ?? "starter",
    plan_name: plan?.name ?? planLabelForSlug("starter"),
    status: data.status as string,
    paystack_customer_id: data.paystack_customer_id as string | null,
    paystack_subscription_id: data.paystack_subscription_id as string | null,
    current_period_start: data.current_period_start as string | null,
    current_period_end: data.current_period_end as string | null,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

function isMissingSchemaColumn(message: string, column: string): boolean {
  return message.includes(column) || message.includes("schema cache");
}

async function backfillCompanyBillingDates(
  companyId: string,
  company: BillingCompanyFields,
  resolvedDates: BillingOverview["resolvedDates"]
): Promise<void> {
  const status = normalizeSubscriptionStatus(company.subscription_status);
  if (!isActiveSubscriptionStatus(status)) return;

  const needsStarted = !company.subscription_started_at && resolvedDates.subscriptionStartedAt;
  const needsRenewal =
    !company.subscription_expires_at &&
    !company.next_billing_date &&
    resolvedDates.nextBillingDate;

  if (!needsStarted && !needsRenewal) return;

  try {
    const admin = createAdminClient();
    const payload: Record<string, string> = {};

    if (needsStarted && resolvedDates.subscriptionStartedAt) {
      payload.subscription_started_at = resolvedDates.subscriptionStartedAt;
    }
    if (needsRenewal && resolvedDates.nextBillingDate) {
      payload.subscription_expires_at = resolvedDates.nextBillingDate;
      payload.next_billing_date = resolvedDates.nextBillingDate;
    }

    const { error } = await admin
      .from("companies")
      .update(payload)
      .eq("id", companyId);

    if (error) {
      const missingNewColumns =
        isMissingSchemaColumn(error.message, "subscription_started_at") ||
        isMissingSchemaColumn(error.message, "subscription_expires_at");

      if (missingNewColumns && payload.next_billing_date) {
        await admin
          .from("companies")
          .update({ next_billing_date: payload.next_billing_date })
          .eq("id", companyId);
        return;
      }

      console.error("[billing] backfillCompanyBillingDates", error.message);
    }
  } catch (error) {
    console.error("[billing] backfillCompanyBillingDates", error);
  }
}

export async function getBillingOverview(
  companyId: string,
  company?: BillingCompanyFields
): Promise<BillingOverview> {
  if (!isSupabaseConfigured()) {
    return EMPTY_BILLING_OVERVIEW;
  }

  const [subscription, payments, legacyPayments] = await Promise.all([
    getActiveSubscription(companyId),
    listPaymentHistory(companyId),
    listLegacySubscriptionPayments(companyId),
  ]);

  const resolvedDates = resolveBillingDates(
    company ?? {},
    subscription,
    payments,
    legacyPayments
  );

  if (company) {
    await backfillCompanyBillingDates(companyId, company, resolvedDates);
  }

  return {
    subscription,
    payments,
    legacyPayments,
    resolvedDates,
  };
}
