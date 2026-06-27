import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeHostingBillingPlan,
} from "@/lib/billing/hosting-paystack";
import {
  normalizeBillingPlan,
} from "@/lib/billing/paystack";
import { activateHostingSubscription } from "@/lib/billing/hosting-subscription-payment";
import { handleHostingOrderWebhook } from "@/lib/billing/hosting-order-payment";
import { activateWorkspaceSubscription } from "@/lib/billing/workspace-subscription-payment";
import { markPaymentPaid } from "@/lib/services/payments";
import {
  notifyPaymentReceived,
} from "@/lib/services/financial-notifications";
import { triggerWorkflows } from "@/lib/services/workflow-engine";

type PaystackEvent = {
  event?: string;
  data?: {
    amount?: number;
    customer?: { customer_code?: string };
    metadata?: {
      product_type?: string;
      company_id?: string;
      plan?: string;
      invoice_id?: string;
      order_id?: string;
      payment_id?: string;
      customer_id?: string;
      payment_type?: string;
      include_setup_fee?: boolean | string;
    };
    paid_at?: string;
    reference?: string;
  };
};

function verifyPaystackSignature(rawBody: string, signature: string, secret: string) {
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
}

async function handleWebsiteSubscriptionPayment(
  companyId: string,
  plan: string,
  paidAt: Date,
  reference: string | undefined,
  paidAmount: number,
  paystackCustomerCode?: string,
  includeSetupFee?: boolean
) {
  const result = await activateWorkspaceSubscription({
    companyId,
    plan,
    paidAt,
    paidAmount,
    reference,
    paystackCustomerCode,
    includeSetupFee,
  });

  if (!result.ok) {
    console.error("[paystack webhook] workspace activation failed", result.error);
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  console.log("[paystack webhook] company billing updated", {
    companyId,
    plan,
    alreadyActive: result.alreadyActive ?? false,
  });
  return NextResponse.json({ ok: true });
}

async function handleHostingPayment(
  companyId: string,
  plan: string,
  paidAt: Date,
  reference: string | undefined,
  paidAmount: number,
  orderId?: string,
  invoiceId?: string
) {
  if (orderId || invoiceId) {
    const orderResult = await handleHostingOrderWebhook({
      companyId,
      orderId,
      invoiceId,
      reference,
      paidAt,
      paidAmount,
    });

    if (!orderResult.ok) {
      console.error("[paystack webhook] hosting order payment failed", orderResult.error);
      return NextResponse.json({ ok: false, error: orderResult.error }, { status: 500 });
    }

    console.log("[paystack webhook] hosting order paid and provisioned", {
      companyId,
      orderId,
      invoiceId,
    });
    return NextResponse.json({ ok: true });
  }

  const result = await activateHostingSubscription({
    companyId,
    plan,
    paidAt,
    paidAmount,
    reference,
  });

  if (!result.ok) {
    console.error("[paystack webhook] hosting activation failed", result.error);
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  console.log("[paystack webhook] hosting subscription activated", {
    companyId,
    plan,
    alreadyActive: result.alreadyActive ?? false,
  });
  return NextResponse.json({ ok: true });
}

async function handleCustomerInvoicePayment(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  invoiceId: string,
  paymentId: string,
  paidAt: Date,
  reference: string | undefined,
  paidAmount: number
) {
  const { data: invoice } = await admin
    .from("invoices")
    .select("*, customers(name, email)")
    .eq("company_id", companyId)
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
  }

  const { data: payment } = await admin
    .from("customer_payments")
    .select("*")
    .eq("id", paymentId)
    .eq("company_id", companyId)
    .eq("invoice_id", invoiceId)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ ok: false, error: "Payment not found." }, { status: 404 });
  }

  if (paidAmount !== payment.amount_cents) {
    console.error("[paystack webhook] customer invoice amount mismatch", {
      paymentId,
      expected: payment.amount_cents,
      paidAmount,
      reference,
    });
    return NextResponse.json({ ok: false, error: "Payment amount mismatch." }, { status: 400 });
  }

  if (reference) {
    const { data: existing } = await admin
      .from("customer_payments")
      .select("id")
      .eq("provider", "paystack")
      .eq("provider_reference", reference)
      .neq("id", paymentId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  const result = await markPaymentPaid(paymentId, reference ?? paymentId, paidAt.toISOString());
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  const customer = invoice.customers as { name: string; email: string | null } | null;
  if (customer?.email) {
    await notifyPaymentReceived({
      companyId,
      customerEmail: customer.email,
      customerName: customer.name,
      invoiceNumber: invoice.invoice_number,
      amountCents: payment.amount_cents,
    });
  }

  await triggerWorkflows("invoice_paid", {
    companyId,
    entityType: "invoice",
    entityId: invoiceId,
    payload: {
      paymentId,
      amountCents: payment.amount_cents,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("[paystack webhook] missing PAYSTACK_SECRET_KEY");
    return NextResponse.json({ ok: false, error: "Missing PAYSTACK_SECRET_KEY." }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  if (!signature || !verifyPaystackSignature(rawBody, signature, secret)) {
    console.error("[paystack webhook] invalid signature");
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as PaystackEvent;
  console.log("[paystack webhook] event received", payload.event ?? "unknown");
  if (payload.event !== "charge.success") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const companyId = payload.data?.metadata?.company_id;
  if (!companyId) {
    console.error("[paystack webhook] missing company metadata");
    return NextResponse.json({ ok: false, error: "Missing company metadata." }, { status: 400 });
  }

  const paidAmount = payload.data?.amount;
  if (paidAmount == null) {
    console.error("[paystack webhook] missing paid amount");
    return NextResponse.json({ ok: false, error: "Missing payment amount." }, { status: 400 });
  }

  const paidAt = payload.data?.paid_at ? new Date(payload.data.paid_at) : new Date();
  const reference = payload.data?.reference;
  const productType = payload.data?.metadata?.product_type ?? "website";
  const admin = createAdminClient();

  if (productType === "customer_invoice") {
    const invoiceId = payload.data?.metadata?.invoice_id;
    const paymentId = payload.data?.metadata?.payment_id;
    if (!invoiceId || !paymentId) {
      return NextResponse.json({ ok: false, error: "Missing invoice metadata." }, { status: 400 });
    }
    return handleCustomerInvoicePayment(
      admin,
      companyId,
      invoiceId,
      paymentId,
      paidAt,
      reference,
      paidAmount
    );
  }

  if (productType === "hosting") {
    const plan = normalizeHostingBillingPlan(payload.data?.metadata?.plan);
    return handleHostingPayment(
      companyId,
      plan,
      paidAt,
      reference,
      paidAmount,
      payload.data?.metadata?.order_id,
      payload.data?.metadata?.invoice_id
    );
  }

  const plan = normalizeBillingPlan(payload.data?.metadata?.plan);
  const includeSetupFee =
    payload.data?.metadata?.include_setup_fee === false ||
    payload.data?.metadata?.include_setup_fee === "false"
      ? false
      : payload.data?.metadata?.include_setup_fee === true ||
          payload.data?.metadata?.include_setup_fee === "true"
        ? true
        : undefined;
  return handleWebsiteSubscriptionPayment(
    companyId,
    plan,
    paidAt,
    reference,
    paidAmount,
    payload.data?.customer?.customer_code,
    includeSetupFee
  );
}
