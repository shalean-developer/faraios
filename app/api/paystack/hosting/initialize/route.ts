import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  hostingPlanAmountInKobo,
  normalizeHostingBillingPlan,
} from "@/lib/billing/hosting-paystack";
import { getHostingOrderPaymentAmount } from "@/lib/billing/hosting-order-payment";
import { PAYSTACK_BASE_URL } from "@/lib/billing/paystack";
import { companyBillingPath } from "@/lib/paths/company";

type InitBody = {
  companyId?: string;
  plan?: string;
  email?: string;
  orderId?: string;
  invoiceId?: string;
  returnPath?: string;
};

export async function POST(req: Request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { ok: false, error: "Missing PAYSTACK_SECRET_KEY." },
      { status: 500 }
    );
  }

  const body = (await req.json()) as InitBody;
  if (!body.companyId || !body.email) {
    return NextResponse.json(
      { ok: false, error: "companyId and email are required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id")
    .eq("company_id", body.companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json(
      { ok: false, error: "No access to this company." },
      { status: 403 }
    );
  }

  const plan = normalizeHostingBillingPlan(body.plan);
  let amount: number;

  if (body.invoiceId) {
    const invoiceAmount = await getHostingOrderPaymentAmount(body.invoiceId);
    if (invoiceAmount == null) {
      return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
    }
    amount = invoiceAmount;
  } else {
    amount = hostingPlanAmountInKobo(plan);
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL." },
      { status: 500 }
    );
  }

  const { data: company } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", body.companyId)
    .maybeSingle();

  const callbackPath =
    body.returnPath?.trim() ||
    (company?.slug
      ? body.orderId
        ? `/${encodeURIComponent(company.slug)}/dashboard/hosting/services?payment=success`
        : companyBillingPath(company.slug, { tab: "hosting", payment: "success" })
      : "/app");
  const callbackUrl = `${(siteUrl ?? "").replace(/\/$/, "")}${callbackPath}`;

  const paystackRes = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: body.email,
      amount,
      callback_url: callbackUrl,
      metadata: {
        product_type: "hosting",
        company_id: body.companyId,
        plan,
        order_id: body.orderId,
        invoice_id: body.invoiceId,
      },
    }),
  });

  const paystackJson = await paystackRes.json();
  if (!paystackRes.ok || !paystackJson?.status) {
    return NextResponse.json(
      { ok: false, error: paystackJson?.message ?? "Failed to initialize payment." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    authorizationUrl: paystackJson.data.authorization_url as string,
    reference: paystackJson.data.reference as string,
  });
}
