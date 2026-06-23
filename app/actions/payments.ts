"use server";

import { revalidatePath } from "next/cache";

import { initializeCustomerPayment } from "@/lib/payments";
import { requireCompanyMembership } from "@/lib/services/company-access";
import { getInvoiceById } from "@/lib/services/invoices";
import {
  confirmEftPayment,
  createCustomerPayment,
  resolvePaymentAmountForInvoice,
} from "@/lib/services/payments";
import type { PaymentProvider, PaymentType } from "@/lib/financial/status";

export type PaymentActionResult = { ok: true; id: string } | { ok: false; error: string };

function revalidatePaymentPaths(slug: string) {
  revalidatePath(`/${slug}/dashboard/payments`);
  revalidatePath(`/${slug}/dashboard/invoices`);
  revalidatePath(`/${slug}/dashboard/revenue`);
}

export async function confirmEftPaymentAction(input: {
  companyId: string;
  companySlug: string;
  paymentId: string;
}): Promise<PaymentActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await confirmEftPayment(
    input.companyId,
    input.paymentId,
    access.userId
  );
  if (result.ok) revalidatePaymentPaths(input.companySlug);
  return result;
}

export async function initializeInvoicePaymentAction(input: {
  companyId: string;
  companySlug: string;
  invoiceId: string;
  provider: PaymentProvider;
  paymentType: PaymentType;
  customerEmail: string;
}): Promise<
  | { ok: true; paymentId: string; authorizationUrl?: string; instructions?: string }
  | { ok: false; error: string }
> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const amountResult = await resolvePaymentAmountForInvoice(
    input.companyId,
    input.invoiceId,
    input.paymentType
  );
  if (!amountResult.ok) return amountResult;

  const detail = await getInvoiceById(input.companyId, input.invoiceId);
  if (!detail) return { ok: false, error: "Invoice not found." };

  const paymentResult = await createCustomerPayment({
    companyId: input.companyId,
    customerId: detail.invoice.customer_id,
    invoiceId: input.invoiceId,
    amountCents: amountResult.amountCents,
    provider: input.provider,
    paymentType: input.paymentType,
    bookingId: detail.invoice.booking_id,
    status: input.provider === "eft" ? "pending" : "processing",
  });

  if (!paymentResult.ok) return paymentResult;

  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const callbackUrl = `${base.replace(/\/$/, "")}/portal/payment/callback`;

  const init = await initializeCustomerPayment(input.provider, {
    companyId: input.companyId,
    customerId: detail.invoice.customer_id,
    invoiceId: input.invoiceId,
    paymentId: paymentResult.id,
    amountCents: amountResult.amountCents,
    currency: "ZAR",
    customerEmail: input.customerEmail,
    paymentType: input.paymentType,
    callbackUrl,
  });

  if (!init.ok) return init;

  revalidatePaymentPaths(input.companySlug);
  return {
    ok: true,
    paymentId: paymentResult.id,
    authorizationUrl: init.authorizationUrl,
    instructions: init.instructions,
  };
}
