import { planIdForSlug, normalizePlanSlug } from "@/lib/data/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

type UpsertSubscriptionInput = {
  companyId: string;
  userId?: string | null;
  plan: string;
  status: string;
  paystackCustomerId?: string | null;
  paystackSubscriptionId?: string | null;
  periodStart: Date;
  periodEnd: Date;
};

function isMissingTable(message: string, table: string): boolean {
  return (
    message.includes(table) ||
    message.includes("schema cache") ||
    message.includes("PGRST205")
  );
}

export async function upsertV7Subscription(
  input: UpsertSubscriptionInput
): Promise<void> {
  const admin = createAdminClient();
  const planSlug = normalizePlanSlug(input.plan);
  const planId = planIdForSlug(planSlug);

  const { data: existing, error: lookupError } = await admin
    .from("subscriptions")
    .select("id, status")
    .eq("company_id", input.companyId)
    .in("status", ["active", "trialing", "pending_payment", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError && !isMissingTable(lookupError.message, "subscriptions")) {
    console.error("[v7-billing] subscription lookup", lookupError.message);
    return;
  }
  if (lookupError) return;

  const payload = {
    company_id: input.companyId,
    user_id: input.userId ?? null,
    plan_id: planId,
    status: input.status,
    paystack_customer_id: input.paystackCustomerId ?? null,
    paystack_subscription_id: input.paystackSubscriptionId ?? null,
    current_period_start: input.periodStart.toISOString(),
    current_period_end: input.periodEnd.toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await admin
      .from("subscriptions")
      .update(payload)
      .eq("id", existing.id);
    if (error) {
      console.error("[v7-billing] subscription update", error.message);
    }
    return;
  }

  const { error } = await admin.from("subscriptions").insert({
    ...payload,
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[v7-billing] subscription insert", error.message);
  }
}

export async function cancelV7Subscription(
  companyId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { data: existing, error: lookupError } = await admin
    .from("subscriptions")
    .select("id")
    .eq("company_id", companyId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    if (isMissingTable(lookupError.message, "subscriptions")) {
      return { ok: true };
    }
    return { ok: false, error: lookupError.message };
  }

  if (!existing?.id) {
    return { ok: true };
  }

  const { error } = await admin
    .from("subscriptions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function recordV7PaymentHistory(input: {
  companyId: string;
  userId?: string | null;
  plan: string;
  amountCents: number;
  currency?: string;
  status: string;
  reference: string;
  paidAt: Date;
}): Promise<void> {
  const admin = createAdminClient();
  const planId = planIdForSlug(normalizePlanSlug(input.plan));

  const { data: existing, error: lookupError } = await admin
    .from("payment_history")
    .select("id")
    .eq("paystack_reference", input.reference)
    .maybeSingle();

  if (lookupError && !isMissingTable(lookupError.message, "payment_history")) {
    console.error("[v7-billing] payment lookup", lookupError.message);
    return;
  }
  if (lookupError || existing) return;

  const { error } = await admin.from("payment_history").insert({
    company_id: input.companyId,
    user_id: input.userId ?? null,
    plan_id: planId,
    amount: input.amountCents,
    currency: input.currency ?? "ZAR",
    status: input.status,
    paystack_reference: input.reference,
    paid_at: input.paidAt.toISOString(),
  });

  if (error && !error.message.includes("duplicate")) {
    console.error("[v7-billing] payment insert", error.message);
  }
}
