import {
  hostingPlanAmountInKobo,
  normalizeHostingBillingPlan,
} from "@/lib/billing/hosting-paystack";
import { PAYSTACK_BASE_URL } from "@/lib/billing/paystack";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deriveHostingSubdomain,
  hostingPlanEntitlements,
} from "@/lib/services/hosting";

export type ActivateHostingSubscriptionInput = {
  companyId: string;
  plan: string;
  paidAt: Date;
  paidAmount: number;
  reference?: string;
};

export type ActivateHostingSubscriptionResult =
  | { ok: true; alreadyActive?: boolean }
  | { ok: false; error: string };

type PaystackVerifyResponse = {
  status?: boolean;
  message?: string;
  data?: {
    status?: string;
    amount?: number;
    paid_at?: string;
    reference?: string;
    metadata?: {
      product_type?: string;
      company_id?: string;
      plan?: string;
    };
  };
};

export async function activateHostingSubscription(
  input: ActivateHostingSubscriptionInput
): Promise<ActivateHostingSubscriptionResult> {
  const admin = createAdminClient();
  const plan = normalizeHostingBillingPlan(input.plan);
  const expectedAmount = hostingPlanAmountInKobo(plan);

  if (input.paidAmount !== expectedAmount) {
    return { ok: false, error: "Payment amount mismatch." };
  }

  if (input.reference) {
    const { data: existingPayment, error: lookupError } = await admin
      .from("hosting_payments")
      .select("id")
      .eq("paystack_reference", input.reference)
      .maybeSingle();

    const missingLedger =
      lookupError?.code === "PGRST205" ||
      lookupError?.message?.includes("hosting_payments") ||
      lookupError?.message?.includes("schema cache");

    if (!missingLedger && existingPayment) {
      return { ok: true, alreadyActive: true };
    }
  }

  const { data: company } = await admin
    .from("companies")
    .select("slug")
    .eq("id", input.companyId)
    .maybeSingle();

  const subdomain = company?.slug
    ? deriveHostingSubdomain(company.slug)
    : `host-${input.companyId.slice(0, 8)}`;

  const entitlements = hostingPlanEntitlements(plan);
  const nextBillingDate = new Date(input.paidAt);
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);

  const { data: existing } = await admin
    .from("hosting_subscriptions")
    .select("id")
    .eq("company_id", input.companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let subscriptionId: string;

  if (existing?.id) {
    const { error: updateError } = await admin
      .from("hosting_subscriptions")
      .update({
        plan_slug: plan,
        status: "active",
        subdomain,
        bandwidth_limit_gb: entitlements.bandwidth_limit_gb,
        sites_limit: entitlements.sites_limit,
        ssl_status: "active",
        next_billing_date: nextBillingDate.toISOString(),
        activated_at: input.paidAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }
    subscriptionId = existing.id;
  } else {
    const { data: created, error: insertError } = await admin
      .from("hosting_subscriptions")
      .insert({
        company_id: input.companyId,
        plan_slug: plan,
        status: "active",
        subdomain,
        bandwidth_limit_gb: entitlements.bandwidth_limit_gb,
        sites_limit: entitlements.sites_limit,
        ssl_status: "active",
        next_billing_date: nextBillingDate.toISOString(),
        activated_at: input.paidAt.toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !created) {
      return {
        ok: false,
        error: insertError?.message ?? "Failed to create hosting subscription.",
      };
    }
    subscriptionId = created.id;
  }

  if (input.reference) {
    const { data: existingPayment, error: lookupError } = await admin
      .from("hosting_payments")
      .select("id")
      .eq("paystack_reference", input.reference)
      .maybeSingle();

    const missingLedger =
      lookupError?.code === "PGRST205" ||
      lookupError?.message?.includes("hosting_payments") ||
      lookupError?.message?.includes("schema cache");

    if (!missingLedger && !existingPayment) {
      await admin.from("hosting_payments").insert({
        subscription_id: subscriptionId,
        company_id: input.companyId,
        plan_slug: plan,
        amount_cents: input.paidAmount,
        currency: "ZAR",
        paystack_reference: input.reference,
        status: "success",
        paid_at: input.paidAt.toISOString(),
      });
    }
  }

  return { ok: true };
}

export async function verifyPaystackHostingPayment(reference: string): Promise<
  | {
      ok: true;
      companyId: string;
      plan: string;
      paidAt: Date;
      paidAmount: number;
    }
  | { ok: false; error: string }
> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { ok: false, error: "Missing PAYSTACK_SECRET_KEY." };
  }

  const paystackRes = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: "no-store",
    }
  );

  const payload = (await paystackRes.json()) as PaystackVerifyResponse;
  if (!paystackRes.ok || !payload.status || !payload.data) {
    return {
      ok: false,
      error: payload.message ?? "Could not verify payment.",
    };
  }

  if (payload.data.status !== "success") {
    return { ok: false, error: "Payment has not completed yet." };
  }

  const productType = payload.data.metadata?.product_type;
  if (productType !== "hosting") {
    return { ok: false, error: "This payment is not a hosting subscription." };
  }

  const companyId = payload.data.metadata?.company_id;
  if (!companyId) {
    return { ok: false, error: "Missing workspace metadata on payment." };
  }

  const paidAmount = payload.data.amount;
  if (paidAmount == null) {
    return { ok: false, error: "Missing payment amount." };
  }

  return {
    ok: true,
    companyId,
    plan: normalizeHostingBillingPlan(payload.data.metadata?.plan),
    paidAt: payload.data.paid_at ? new Date(payload.data.paid_at) : new Date(),
    paidAmount,
  };
}

export async function confirmHostingPaymentFromReference(input: {
  reference: string;
  companyId: string;
}): Promise<ActivateHostingSubscriptionResult> {
  const verified = await verifyPaystackHostingPayment(input.reference);
  if (!verified.ok) return verified;

  if (verified.companyId !== input.companyId) {
    return { ok: false, error: "Payment does not belong to this workspace." };
  }

  return activateHostingSubscription({
    companyId: verified.companyId,
    plan: verified.plan,
    paidAt: verified.paidAt,
    paidAmount: verified.paidAmount,
    reference: input.reference,
  });
}
