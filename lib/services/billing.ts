import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { normalizePlanSlug, planLabelForSlug } from "@/lib/data/pricing";
import type {
  BillingOverview,
  BillingSubscriptionRecord,
  PaymentHistoryRecord,
} from "@/lib/billing/billing-shared";

export type {
  BillingOverview,
  BillingSubscriptionRecord,
  PaymentHistoryRecord,
} from "@/lib/billing/billing-shared";
export { subscriptionStatusLabel } from "@/lib/billing/billing-shared";

async function listPaymentHistory(
  companyId: string
): Promise<PaymentHistoryRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_history")
    .select(
      `
      id,
      company_id,
      user_id,
      plan_id,
      amount,
      currency,
      status,
      paystack_reference,
      paid_at,
      created_at,
      plans:plan_id ( slug, name )
    `
    )
    .eq("company_id", companyId)
    .order("paid_at", { ascending: false, nullsFirst: false })
    .limit(30);

  if (error) {
    const missing =
      error.code === "PGRST205" ||
      error.message.includes("payment_history") ||
      error.message.includes("schema cache");
    if (!missing) {
      console.error("[billing] listPaymentHistory", error.message);
    }
    return [];
  }

  return (data ?? []).map((row) => {
    const plan = row.plans as { slug?: string; name?: string } | null;
    return {
      id: row.id as string,
      company_id: row.company_id as string,
      user_id: row.user_id as string | null,
      plan_id: row.plan_id as string,
      plan_slug: plan?.slug ?? normalizePlanSlug(row.plan_id as string),
      amount: row.amount as number,
      currency: row.currency as string,
      status: row.status as string,
      paystack_reference: row.paystack_reference as string | null,
      paid_at: row.paid_at as string | null,
      created_at: row.created_at as string,
    };
  });
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

export async function getBillingOverview(
  companyId: string
): Promise<BillingOverview> {
  if (!isSupabaseConfigured()) {
    return { subscription: null, payments: [], legacyPayments: [] };
  }

  const supabase = await createClient();

  const [subscription, payments] = await Promise.all([
    getActiveSubscription(companyId),
    listPaymentHistory(companyId),
  ]);

  let legacyPayments: BillingOverview["legacyPayments"] = [];
  if (payments.length === 0) {
    const { data } = await supabase
      .from("subscription_payments")
      .select("id, plan_slug, amount_cents, currency, paystack_reference, status, paid_at")
      .eq("company_id", companyId)
      .order("paid_at", { ascending: false })
      .limit(20);
    legacyPayments = (data ?? []) as BillingOverview["legacyPayments"];
  }

  return { subscription, payments, legacyPayments };
}
