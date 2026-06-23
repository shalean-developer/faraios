import { NextResponse } from "next/server";

import { notifyQuoteAcceptedAction } from "@/app/actions/quotes";
import { resolvePortalToken } from "@/lib/services/portal-access";
import { updateQuoteStatusPortal } from "@/lib/services/quotes";
import { triggerWorkflows } from "@/lib/services/workflow-engine";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ token: string; id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { token, id } = await params;
  const ctx = await resolvePortalToken(decodeURIComponent(token));
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Invalid portal link." }, { status: 401 });
  }

  const body = (await req.json()) as { action?: string };
  if (body.action !== "accept" && body.action !== "reject") {
    return NextResponse.json({ ok: false, error: "Invalid action." }, { status: 400 });
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: "Not configured." }, { status: 500 });
  }

  const { data: quote } = await admin.client
    .from("quotes")
    .select("*, customers(name)")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .eq("customer_id", ctx.customerId)
    .maybeSingle();

  if (!quote) {
    return NextResponse.json({ ok: false, error: "Quote not found." }, { status: 404 });
  }

  if (!["sent", "viewed"].includes(quote.status)) {
    return NextResponse.json({ ok: false, error: "Quote cannot be updated." }, { status: 400 });
  }

  const status = body.action === "accept" ? "accepted" : "rejected";
  const result = await updateQuoteStatusPortal(id, status, ctx.companyId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  if (status === "accepted") {
    const customer = quote.customers as { name: string } | null;
    await notifyQuoteAcceptedAction({
      companyId: ctx.companyId,
      quoteId: id,
      quoteNumber: quote.quote_number,
      customerName: customer?.name ?? ctx.customerName,
    });
    await triggerWorkflows("quote_accepted", {
      companyId: ctx.companyId,
      entityType: "quote",
      entityId: id,
      payload: { customerId: ctx.customerId, customerName: ctx.customerName },
    });
  }

  return NextResponse.json({ ok: true });
}
