import { createAdminClient } from "@/lib/supabase/admin";
import { markHostingInvoicePaid } from "@/lib/services/hosting-automation";
import { PAYSTACK_BASE_URL } from "@/lib/billing/paystack";

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
      order_id?: string;
      invoice_id?: string;
      plan?: string;
    };
  };
};

export async function verifyPaystackHostingOrderPayment(reference: string): Promise<
  | {
      ok: true;
      companyId: string;
      orderId: string;
      invoiceId: string;
      paidAt: Date;
      paidAmount: number;
    }
  | { ok: false; error: string }
> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Missing PAYSTACK_SECRET_KEY." };

  const paystackRes = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: "no-store",
    }
  );

  const payload = (await paystackRes.json()) as PaystackVerifyResponse;
  if (!paystackRes.ok || !payload.status || !payload.data) {
    return { ok: false, error: payload.message ?? "Could not verify payment." };
  }

  if (payload.data.status !== "success") {
    return { ok: false, error: "Payment has not completed yet." };
  }

  const productType = payload.data.metadata?.product_type;
  if (productType !== "hosting") {
    return { ok: false, error: "This payment is not a hosting payment." };
  }

  const companyId = payload.data.metadata?.company_id;
  const orderId = payload.data.metadata?.order_id;
  const invoiceId = payload.data.metadata?.invoice_id;

  if (!companyId || !orderId || !invoiceId) {
    return { ok: false, error: "Missing hosting order metadata on payment." };
  }

  const paidAmount = payload.data.amount;
  if (paidAmount == null) {
    return { ok: false, error: "Missing payment amount." };
  }

  return {
    ok: true,
    companyId,
    orderId,
    invoiceId,
    paidAt: payload.data.paid_at ? new Date(payload.data.paid_at) : new Date(),
    paidAmount,
  };
}

export async function activateHostingOrderPayment(input: {
  reference: string;
  companyId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const verified = await verifyPaystackHostingOrderPayment(input.reference);
  if (!verified.ok) return verified;

  if (verified.companyId !== input.companyId) {
    return { ok: false, error: "Payment does not belong to this workspace." };
  }

  const result = await markHostingInvoicePaid({
    invoiceId: verified.invoiceId,
    paystackReference: input.reference,
    paidAt: verified.paidAt,
    paidAmount: verified.paidAmount,
  });

  if (!result.ok) return result;
  return { ok: true };
}

export async function handleHostingOrderWebhook(input: {
  companyId: string;
  orderId?: string;
  invoiceId?: string;
  reference?: string;
  paidAt: Date;
  paidAmount: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.invoiceId) {
    return markHostingInvoicePaid({
      invoiceId: input.invoiceId,
      paystackReference: input.reference ?? "",
      paidAt: input.paidAt,
      paidAmount: input.paidAmount,
    }).then((r) => (r.ok ? { ok: true as const } : r));
  }

  if (input.reference) {
    const verified = await verifyPaystackHostingOrderPayment(input.reference);
    if (!verified.ok) return verified;
    const result = await markHostingInvoicePaid({
      invoiceId: verified.invoiceId,
      paystackReference: input.reference,
      paidAt: verified.paidAt,
      paidAmount: verified.paidAmount,
    });
    return result.ok ? { ok: true } : result;
  }

  return { ok: false, error: "Missing invoice metadata." };
}

export async function getHostingOrderPaymentAmount(invoiceId: string): Promise<number | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hosting_invoices")
    .select("amount_cents")
    .eq("id", invoiceId)
    .maybeSingle();
  return data?.amount_cents ?? null;
}
