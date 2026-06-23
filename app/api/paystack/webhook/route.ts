import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hostingPlanAmountInKobo,
  normalizeHostingBillingPlan,
} from "@/lib/billing/hosting-paystack";
import {
  normalizeBillingPlan,
  planAmountInKobo,
} from "@/lib/billing/paystack";
import {
  deriveHostingSubdomain,
  hostingPlanEntitlements,
} from "@/lib/services/hosting";
import { markPaymentPaid } from "@/lib/services/payments";
import {
  notifyPaymentReceived,
} from "@/lib/services/financial-notifications";

type PaystackEvent = {
  event?: string;
  data?: {
    amount?: number;
    metadata?: {
      product_type?: string;
      company_id?: string;
      plan?: string;
      invoice_id?: string;
      payment_id?: string;
      customer_id?: string;
      payment_type?: string;
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
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  plan: string,
  paidAt: Date,
  reference: string | undefined,
  paidAmount: number
) {
  const expectedAmount = planAmountInKobo(plan);
  if (paidAmount !== expectedAmount) {
    console.error("[paystack webhook] website amount mismatch", {
      companyId,
      plan,
      expectedAmount,
      paidAmount,
      reference,
    });
    return NextResponse.json({ ok: false, error: "Payment amount mismatch." }, { status: 400 });
  }

  const nextBillingDate = new Date(paidAt);
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);

  const { error } = await admin
    .from("companies")
    .update({
      plan,
      subscription_status: "active",
      next_billing_date: nextBillingDate.toISOString(),
    })
    .eq("id", companyId);

  if (error) {
    console.error("[paystack webhook] company update failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  console.log("[paystack webhook] company billing updated", {
    companyId,
    plan,
    nextBillingDate: nextBillingDate.toISOString(),
  });
  return NextResponse.json({ ok: true });
}

async function handleHostingPayment(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  plan: string,
  paidAt: Date,
  reference: string | undefined,
  paidAmount: number
) {
  const expectedAmount = hostingPlanAmountInKobo(plan);
  if (paidAmount !== expectedAmount) {
    console.error("[paystack webhook] hosting amount mismatch", {
      companyId,
      plan,
      expectedAmount,
      paidAmount,
      reference,
    });
    return NextResponse.json({ ok: false, error: "Payment amount mismatch." }, { status: 400 });
  }

  const { data: company } = await admin
    .from("companies")
    .select("slug")
    .eq("id", companyId)
    .maybeSingle();

  const subdomain = company?.slug
    ? deriveHostingSubdomain(company.slug)
    : `host-${companyId.slice(0, 8)}`;

  const entitlements = hostingPlanEntitlements(plan);
  const nextBillingDate = new Date(paidAt);
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);

  const { data: existing } = await admin
    .from("hosting_subscriptions")
    .select("id")
    .eq("company_id", companyId)
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
        activated_at: paidAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("[paystack webhook] hosting subscription update failed", updateError.message);
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }
    subscriptionId = existing.id;
  } else {
    const { data: created, error: insertError } = await admin
      .from("hosting_subscriptions")
      .insert({
        company_id: companyId,
        plan_slug: plan,
        status: "active",
        subdomain,
        bandwidth_limit_gb: entitlements.bandwidth_limit_gb,
        sites_limit: entitlements.sites_limit,
        ssl_status: "active",
        next_billing_date: nextBillingDate.toISOString(),
        activated_at: paidAt.toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !created) {
      console.error("[paystack webhook] hosting subscription insert failed", insertError?.message);
      return NextResponse.json(
        { ok: false, error: insertError?.message ?? "Failed to create subscription." },
        { status: 500 }
      );
    }
    subscriptionId = created.id;
  }

  if (reference) {
    const { data: existingPayment } = await admin
      .from("hosting_payments")
      .select("id")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (!existingPayment) {
      await admin.from("hosting_payments").insert({
        subscription_id: subscriptionId,
        company_id: companyId,
        plan_slug: plan,
        amount_cents: paidAmount,
        currency: "ZAR",
        paystack_reference: reference,
        status: "success",
        paid_at: paidAt.toISOString(),
      });
    }
  }

  console.log("[paystack webhook] hosting subscription activated", {
    companyId,
    plan,
    subscriptionId,
    subdomain,
    nextBillingDate: nextBillingDate.toISOString(),
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
    return handleHostingPayment(admin, companyId, plan, paidAt, reference, paidAmount);
  }

  const plan = normalizeBillingPlan(payload.data?.metadata?.plan);
  return handleWebsiteSubscriptionPayment(
    admin,
    companyId,
    plan,
    paidAt,
    reference,
    paidAmount
  );
}
