import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHostingOrder } from "@/lib/services/hosting-automation";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    companyId?: string;
    planId?: string;
    domainName?: string;
    domainType?: "new" | "existing" | "transfer";
    billingCycle?: "monthly" | "yearly";
  };

  if (!body.companyId || !body.planId || !body.domainName) {
    return NextResponse.json(
      { ok: false, error: "companyId, planId, and domainName are required." },
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

  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("company_id", body.companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const result = await createHostingOrder({
    companyId: body.companyId,
    planId: body.planId,
    domainName: body.domainName,
    domainType: body.domainType,
    billingCycle: body.billingCycle,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    orderId: result.order.id,
    invoiceId: result.invoice.id,
  });
}
