import { NextResponse } from "next/server";

import { initializeCustomerPayment } from "@/lib/payments";
import { resolvePortalToken } from "@/lib/services/portal-access";
import { getInvoiceDepositDueCents } from "@/lib/services/invoices";
import { createCustomerPayment } from "@/lib/services/payments";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { PaymentProvider, PaymentType } from "@/lib/financial/status";

type Params = { params: Promise<{ token: string }> };

export async function POST(req: Request, { params }: Params) {
  const { token } = await params;
  const ctx = await resolvePortalToken(decodeURIComponent(token));
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Invalid portal link." }, { status: 401 });
  }

  const body = (await req.json()) as {
    invoiceId?: string;
    provider?: PaymentProvider;
    paymentType?: PaymentType;
    customerEmail?: string;
  };

  if (!body.invoiceId || !body.provider) {
    return NextResponse.json({ ok: false, error: "Missing payment details." }, { status: 400 });
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: "Not configured." }, { status: 500 });
  }

  const { data: invoice } = await admin.client
    .from("invoices")
    .select("*")
    .eq("id", body.invoiceId)
    .eq("company_id", ctx.companyId)
    .eq("customer_id", ctx.customerId)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
  }

  if (invoice.balance_due_cents <= 0 || ["paid", "cancelled"].includes(invoice.status)) {
    return NextResponse.json({ ok: false, error: "Invoice is not payable." }, { status: 400 });
  }

  const paymentType = body.paymentType ?? "full";
  let amountCents = invoice.balance_due_cents;
  if (paymentType === "deposit" && invoice.amount_paid_cents === 0) {
    amountCents = getInvoiceDepositDueCents(invoice);
  }

  const paymentResult = await createCustomerPayment({
    companyId: ctx.companyId,
    customerId: ctx.customerId,
    invoiceId: body.invoiceId,
    amountCents,
    provider: body.provider,
    paymentType,
    bookingId: invoice.booking_id,
    status: body.provider === "eft" ? "pending" : "processing",
    useAdmin: true,
  });

  if (!paymentResult.ok) {
    return NextResponse.json({ ok: false, error: paymentResult.error }, { status: 500 });
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const callbackUrl = `${base.replace(/\/$/, "")}/portal/payment/callback`;

  const init = await initializeCustomerPayment(body.provider, {
    companyId: ctx.companyId,
    customerId: ctx.customerId,
    invoiceId: body.invoiceId,
    paymentId: paymentResult.id,
    amountCents,
    currency: "ZAR",
    customerEmail: body.customerEmail ?? ctx.customerEmail ?? "customer@example.com",
    paymentType,
    callbackUrl,
  });

  if (!init.ok) {
    return NextResponse.json({ ok: false, error: init.error }, { status: 500 });
  }

  if (init.reference && body.provider !== "eft") {
    await admin.client
      .from("customer_payments")
      .update({ provider_reference: init.reference })
      .eq("id", paymentResult.id);
  }

  return NextResponse.json({
    ok: true,
    paymentId: paymentResult.id,
    authorizationUrl: init.authorizationUrl,
    instructions: init.instructions,
  });
}
