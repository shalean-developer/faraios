import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeBillingPlan } from "@/lib/billing/paystack";

type PaystackEvent = {
  event?: string;
  data?: {
    metadata?: {
      company_id?: string;
      plan?: string;
    };
    paid_at?: string;
  };
};

function verifyPaystackSignature(rawBody: string, signature: string, secret: string) {
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
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

  const plan = normalizeBillingPlan(payload.data?.metadata?.plan);
  const paidAt = payload.data?.paid_at ? new Date(payload.data.paid_at) : new Date();
  const nextBillingDate = new Date(paidAt);
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);

  const admin = createAdminClient();
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
