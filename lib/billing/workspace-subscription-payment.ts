import {
  normalizeBillingPlan,
  PAYSTACK_BASE_URL,
  planAmountInKobo,
} from "@/lib/billing/paystack";
import {
  cancelV7Subscription,
  recordV7PaymentHistory,
  upsertV7Subscription,
} from "@/lib/billing/v7-records";
import { isSelfServePlan } from "@/lib/data/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActivateWorkspaceSubscriptionInput = {
  companyId: string;
  plan: string;
  paidAt: Date;
  paidAmount: number;
  reference?: string;
  paystackCustomerCode?: string;
  userId?: string | null;
};

export type ActivateWorkspaceSubscriptionResult =
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
    customer?: { customer_code?: string };
    metadata?: {
      product_type?: string;
      company_id?: string;
      plan?: string;
    };
  };
};

function isMissingSchemaColumn(message: string, column: string): boolean {
  return message.includes(column) || message.includes("schema cache");
}

async function updateCompanySubscription(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  payload: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await admin
    .from("companies")
    .update(payload)
    .eq("id", companyId);

  if (!error) return { ok: true };

  const message = error.message;
  const missingNewColumns =
    isMissingSchemaColumn(message, "subscription_started_at") ||
    isMissingSchemaColumn(message, "subscription_expires_at") ||
    isMissingSchemaColumn(message, "paystack_customer_code");

  if (!missingNewColumns) {
    return { ok: false, error: message };
  }

  const fallbackPayload: Record<string, unknown> = {
    plan: payload.plan,
    subscription_status: payload.subscription_status,
    next_billing_date: payload.next_billing_date,
  };

  const { error: fallbackError } = await admin
    .from("companies")
    .update(fallbackPayload)
    .eq("id", companyId);

  if (fallbackError) {
    return { ok: false, error: fallbackError.message };
  }

  return { ok: true };
}

async function recordSubscriptionPayment(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    companyId: string;
    plan: string;
    paidAmount: number;
    paidAt: Date;
    reference: string;
  }
) {
  const { data: existingPayment, error: lookupError } = await admin
    .from("subscription_payments")
    .select("id")
    .eq("paystack_reference", input.reference)
    .maybeSingle();

  const missingLedger =
    lookupError?.code === "PGRST205" ||
    lookupError?.message?.includes("subscription_payments") ||
    lookupError?.message?.includes("schema cache");

  if (missingLedger || existingPayment) return;

  await admin.from("subscription_payments").insert({
    company_id: input.companyId,
    plan_slug: input.plan,
    amount_cents: input.paidAmount,
    currency: "ZAR",
    paystack_reference: input.reference,
    status: "success",
    paid_at: input.paidAt.toISOString(),
  });
}

export async function activateWorkspaceSubscription(
  input: ActivateWorkspaceSubscriptionInput
): Promise<ActivateWorkspaceSubscriptionResult> {
  const admin = createAdminClient();
  const plan = normalizeBillingPlan(input.plan);
  if (!isSelfServePlan(plan)) {
    return { ok: false, error: "Enterprise plans require a custom quote." };
  }
  const expectedAmount = planAmountInKobo(plan);

  if (expectedAmount <= 0) {
    return { ok: false, error: "This plan cannot be purchased online." };
  }

  if (input.paidAmount !== expectedAmount) {
    return { ok: false, error: "Payment amount mismatch." };
  }

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("subscription_status")
    .eq("id", input.companyId)
    .maybeSingle();

  if (companyError || !company) {
    return { ok: false, error: companyError?.message ?? "Workspace not found." };
  }

  if (company.subscription_status === "active") {
    return { ok: true, alreadyActive: true };
  }

  const expiresAt = new Date(input.paidAt);
  expiresAt.setDate(expiresAt.getDate() + 30);

  const updatePayload: Record<string, unknown> = {
    plan,
    subscription_status: "active",
    subscription_started_at: input.paidAt.toISOString(),
    subscription_expires_at: expiresAt.toISOString(),
    next_billing_date: expiresAt.toISOString(),
  };

  if (input.paystackCustomerCode) {
    updatePayload.paystack_customer_code = input.paystackCustomerCode;
  }

  const updateResult = await updateCompanySubscription(
    admin,
    input.companyId,
    updatePayload
  );
  if (!updateResult.ok) {
    return updateResult;
  }

  if (input.reference) {
    await recordSubscriptionPayment(admin, {
      companyId: input.companyId,
      plan,
      paidAmount: input.paidAmount,
      paidAt: input.paidAt,
      reference: input.reference,
    });

    await recordV7PaymentHistory({
      companyId: input.companyId,
      userId: input.userId,
      plan,
      amountCents: input.paidAmount,
      status: "success",
      reference: input.reference,
      paidAt: input.paidAt,
    });
  }

  await upsertV7Subscription({
    companyId: input.companyId,
    userId: input.userId,
    plan,
    status: "active",
    paystackCustomerId: input.paystackCustomerCode,
    periodStart: input.paidAt,
    periodEnd: expiresAt,
  });

  return { ok: true };
}

export async function verifyPaystackWorkspacePayment(
  reference: string
): Promise<
  | {
      ok: true;
      companyId: string;
      plan: string;
      paidAt: Date;
      paidAmount: number;
      paystackCustomerCode?: string;
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

  const companyId = payload.data.metadata?.company_id;
  if (!companyId) {
    return { ok: false, error: "Missing workspace metadata on payment." };
  }

  const productType = payload.data.metadata?.product_type ?? "website";
  if (productType !== "website") {
    return { ok: false, error: "This payment is not a workspace subscription." };
  }

  const paidAmount = payload.data.amount;
  if (paidAmount == null) {
    return { ok: false, error: "Missing payment amount." };
  }

  const paidAt = payload.data.paid_at
    ? new Date(payload.data.paid_at)
    : new Date();

  return {
    ok: true,
    companyId,
    plan: normalizeBillingPlan(payload.data.metadata?.plan),
    paidAt,
    paidAmount,
    paystackCustomerCode: payload.data.customer?.customer_code,
  };
}

export async function confirmWorkspacePaymentFromReference(input: {
  reference: string;
  companyId: string;
}): Promise<ActivateWorkspaceSubscriptionResult> {
  const verified = await verifyPaystackWorkspacePayment(input.reference);
  if (!verified.ok) return verified;

  if (verified.companyId !== input.companyId) {
    return { ok: false, error: "Payment does not belong to this workspace." };
  }

  return activateWorkspaceSubscription({
    companyId: verified.companyId,
    plan: verified.plan,
    paidAt: verified.paidAt,
    paidAmount: verified.paidAmount,
    reference: input.reference,
    paystackCustomerCode: verified.paystackCustomerCode,
  });
}
