import {
  getInvoiceById,
  getInvoiceDepositDueCents,
  recalculateInvoicePaymentStatus,
} from "@/lib/services/invoices";
import { logFinancialAudit } from "@/lib/services/financial-audit";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { CustomerPayment, PaymentWithRelations } from "@/types/financial";
import type { PaymentProvider, PaymentType } from "@/lib/financial/status";

export type PaymentMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type PaymentListSummary = {
  total: number;
  collectedCents: number;
  pendingCents: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
};

export function summarizePayments(payments: CustomerPayment[]): PaymentListSummary {
  let collectedCents = 0;
  let pendingCents = 0;
  let pendingCount = 0;
  let failedCount = 0;
  let refundedCount = 0;

  for (const payment of payments) {
    if (payment.status === "paid") {
      collectedCents += payment.amount_cents;
    } else if (payment.status === "pending" || payment.status === "processing") {
      pendingCents += payment.amount_cents;
      pendingCount += 1;
    } else if (payment.status === "failed") {
      failedCount += 1;
    } else if (payment.status === "refunded") {
      refundedCount += 1;
    }
  }

  return {
    total: payments.length,
    collectedCents,
    pendingCents,
    pendingCount,
    failedCount,
    refundedCount,
  };
}

export async function listPaymentsForCompany(
  companyId: string
): Promise<PaymentWithRelations[]> {
  if (!isSupabaseConfigured() || !companyId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_payments")
    .select("*, customers(name, email), invoices(invoice_number)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[payments] listPaymentsForCompany", error.message);
    return [];
  }
  return (data ?? []) as PaymentWithRelations[];
}

export async function listPaymentsForCustomer(
  companyId: string,
  customerId: string
): Promise<CustomerPayment[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_payments")
    .select("*")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CustomerPayment[];
}

export async function getCustomerPaymentSummary(
  companyId: string,
  customerId: string
): Promise<{ totalSpentCents: number; lastPaymentDate: string | null }> {
  const payments = await listPaymentsForCustomer(companyId, customerId);
  const paid = payments.filter((p) => p.status === "paid");
  const totalSpentCents = paid.reduce((sum, p) => sum + p.amount_cents, 0);
  const lastPaymentDate = paid[0]?.paid_at ?? paid[0]?.created_at ?? null;
  return { totalSpentCents, lastPaymentDate };
}

export async function createCustomerPayment(input: {
  companyId: string;
  customerId: string;
  invoiceId: string;
  amountCents: number;
  provider: PaymentProvider;
  paymentType: PaymentType;
  providerReference?: string | null;
  status?: string;
  notes?: string | null;
  bookingId?: string | null;
  useAdmin?: boolean;
}): Promise<PaymentMutationResult> {
  const client = input.useAdmin ? tryCreateAdminClient() : null;
  const supabase = client?.ok ? client.client : await createClient();

  const now = new Date().toISOString();
  const status = input.status ?? "pending";

  const { data, error } = await supabase
    .from("customer_payments")
    .insert({
      company_id: input.companyId,
      customer_id: input.customerId,
      invoice_id: input.invoiceId,
      booking_id: input.bookingId ?? null,
      amount_cents: input.amountCents,
      currency: "ZAR",
      provider: input.provider,
      provider_reference: input.providerReference ?? null,
      status,
      payment_type: input.paymentType,
      notes: input.notes ?? null,
      paid_at: status === "paid" ? now : null,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create payment." };

  await logFinancialAudit({
    companyId: input.companyId,
    entityType: "payment",
    entityId: data.id,
    action: "created",
    metadata: { provider: input.provider, amount_cents: input.amountCents },
    useAdmin: input.useAdmin,
  });

  if (status === "paid") {
    await recalculateInvoicePaymentStatus(input.companyId, input.invoiceId);
  }

  return { ok: true, id: data.id };
}

export async function markPaymentPaid(
  paymentId: string,
  providerReference: string,
  paidAt?: string
): Promise<PaymentMutationResult> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Not configured." };

  const { data: payment } = await admin.client
    .from("customer_payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) return { ok: false, error: "Payment not found." };
  if (payment.status === "paid") return { ok: true, id: paymentId };

  const now = paidAt ?? new Date().toISOString();
  const { error } = await admin.client
    .from("customer_payments")
    .update({
      status: "paid",
      provider_reference: providerReference,
      paid_at: now,
      updated_at: now,
    })
    .eq("id", paymentId);

  if (error) return { ok: false, error: error.message };

  await recalculateInvoicePaymentStatus(payment.company_id, payment.invoice_id);

  await logFinancialAudit({
    companyId: payment.company_id,
    entityType: "payment",
    entityId: paymentId,
    action: "paid",
    metadata: { provider_reference: providerReference },
    useAdmin: true,
  });

  return { ok: true, id: paymentId };
}

export async function markPaymentFailed(paymentId: string): Promise<PaymentMutationResult> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Not configured." };

  const { data: payment } = await admin.client
    .from("customer_payments")
    .select("company_id")
    .eq("id", paymentId)
    .maybeSingle();

  const { error } = await admin.client
    .from("customer_payments")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (error) return { ok: false, error: error.message };

  if (payment) {
    await logFinancialAudit({
      companyId: payment.company_id,
      entityType: "payment",
      entityId: paymentId,
      action: "failed",
      useAdmin: true,
    });
  }

  return { ok: true, id: paymentId };
}

export async function confirmEftPayment(
  companyId: string,
  paymentId: string,
  actorId?: string | null
): Promise<PaymentMutationResult> {
  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("customer_payments")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", paymentId)
    .eq("provider", "eft")
    .maybeSingle();

  if (!payment) return { ok: false, error: "EFT payment not found." };
  if (payment.status === "paid") return { ok: true, id: paymentId };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("customer_payments")
    .update({ status: "paid", paid_at: now, updated_at: now })
    .eq("id", paymentId);

  if (error) return { ok: false, error: error.message };

  await recalculateInvoicePaymentStatus(companyId, payment.invoice_id);

  await logFinancialAudit({
    companyId,
    entityType: "payment",
    entityId: paymentId,
    action: "eft_confirmed",
    actorId,
  });

  return { ok: true, id: paymentId };
}

export async function resolvePaymentAmountForInvoice(
  companyId: string,
  invoiceId: string,
  paymentType: PaymentType
): Promise<{ ok: true; amountCents: number } | { ok: false; error: string }> {
  const detail = await getInvoiceById(companyId, invoiceId);
  if (!detail) return { ok: false, error: "Invoice not found." };

  const invoice = detail.invoice;
  if (invoice.status === "paid" || invoice.status === "cancelled") {
    return { ok: false, error: "Invoice is not payable." };
  }

  let amountCents: number;
  if (paymentType === "deposit") {
    amountCents = getInvoiceDepositDueCents(invoice);
  } else if (paymentType === "balance") {
    amountCents = invoice.balance_due_cents;
  } else {
    amountCents = invoice.balance_due_cents;
  }

  if (amountCents <= 0) return { ok: false, error: "Nothing due on this invoice." };
  return { ok: true, amountCents };
}
