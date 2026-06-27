import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeBillingPlan,
  PAYSTACK_BASE_URL,
} from "@/lib/billing/paystack";
import { workspaceCheckoutAmountInKobo } from "@/lib/billing/workspace-checkout";
import { getWorkspaceSetupFeeEnabled } from "@/lib/billing/platform-billing-settings";
import {
  isActiveSubscriptionStatus,
  normalizeSubscriptionStatus,
} from "@/lib/subscriptions/access";
import { isSelfServePlan, normalizePlanSlug, type PricingPlanSlug } from "@/lib/data/pricing";

type InitBody = {
  companyId?: string;
  plan?: string;
  email?: string;
  includeSetupFee?: boolean;
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

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("slug, subscription_status, setup_fee_waived, setup_fee_paid_at")
    .eq("id", body.companyId)
    .maybeSingle();

  if (companyError || !company?.slug) {
    return NextResponse.json(
      { ok: false, error: "Company not found." },
      { status: 404 }
    );
  }

  const plan = normalizeBillingPlan(body.plan) as PricingPlanSlug;
  if (!isSelfServePlan(plan)) {
    return NextResponse.json(
      { ok: false, error: "Enterprise plans require a custom quote. Contact sales." },
      { status: 400 }
    );
  }

  const subscriptionActive = isActiveSubscriptionStatus(
    normalizeSubscriptionStatus(company.subscription_status)
  );
  const setupFeeEnabled = await getWorkspaceSetupFeeEnabled();
  const amount = workspaceCheckoutAmountInKobo({
    plan,
    setupFeeEnabled,
    setupFeeWaived: company.setup_fee_waived === true,
    setupFeePaid: Boolean(company.setup_fee_paid_at),
    subscriptionActive,
    includeSetupFee: body.includeSetupFee,
  });

  if (amount <= 0) {
    return NextResponse.json(
      { ok: false, error: "This plan cannot be purchased online." },
      { status: 400 }
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL." },
      { status: 500 }
    );
  }
  const callbackUrl = `${(siteUrl ?? "").replace(/\/$/, "")}/${encodeURIComponent(company.slug)}/dashboard/billing?payment=success`;

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
        company_id: body.companyId,
        plan,
        product_type: "website",
        include_setup_fee: body.includeSetupFee !== false,
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
