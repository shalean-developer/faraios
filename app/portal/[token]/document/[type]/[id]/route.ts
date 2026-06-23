import { NextResponse } from "next/server";

import { renderFinancialDocumentHtml } from "@/lib/pdf/financial-document";
import { resolvePortalToken } from "@/lib/services/portal-access";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ token: string; type: string; id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token, type, id } = await params;
  const ctx = await resolvePortalToken(decodeURIComponent(token));
  if (!ctx) {
    return NextResponse.json({ error: "Invalid portal link." }, { status: 401 });
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  const { data: company } = await admin.client
    .from("companies")
    .select("name, primary_contact_email, contact_phone")
    .eq("id", ctx.companyId)
    .maybeSingle();

  if (type === "quote") {
    const [{ data: quote }, { data: lineItems }] = await Promise.all([
      admin.client
        .from("quotes")
        .select("*")
        .eq("id", id)
        .eq("company_id", ctx.companyId)
        .eq("customer_id", ctx.customerId)
        .maybeSingle(),
      admin.client.from("quote_line_items").select("*").eq("quote_id", id).order("sort_order"),
    ]);
    if (!quote) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const html = renderFinancialDocumentHtml({
      type: "quote",
      documentNumber: quote.quote_number,
      companyName: company?.name ?? ctx.companyName,
      companyEmail: company?.primary_contact_email,
      companyPhone: company?.contact_phone,
      customerName: ctx.customerName,
      customerEmail: ctx.customerEmail,
      status: quote.status,
      lineItems: (lineItems ?? []).map((li) => ({
        description: li.description,
        quantity: Number(li.quantity),
        unitPriceCents: li.unit_price_cents,
        totalCents: li.total_cents,
      })),
      subtotalCents: quote.subtotal_cents,
      discountCents: quote.discount_cents,
      taxCents: quote.tax_cents,
      totalCents: quote.total_cents,
      notes: quote.notes,
      validUntil: quote.valid_until,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${quote.quote_number}.html"`,
      },
    });
  }

  if (type === "invoice") {
    const [{ data: invoice }, { data: lineItems }] = await Promise.all([
      admin.client
        .from("invoices")
        .select("*")
        .eq("id", id)
        .eq("company_id", ctx.companyId)
        .eq("customer_id", ctx.customerId)
        .maybeSingle(),
      admin.client.from("invoice_line_items").select("*").eq("invoice_id", id).order("sort_order"),
    ]);
    if (!invoice) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const html = renderFinancialDocumentHtml({
      type: "invoice",
      documentNumber: invoice.invoice_number,
      companyName: company?.name ?? ctx.companyName,
      companyEmail: company?.primary_contact_email,
      companyPhone: company?.contact_phone,
      customerName: ctx.customerName,
      customerEmail: ctx.customerEmail,
      status: invoice.status,
      lineItems: (lineItems ?? []).map((li) => ({
        description: li.description,
        quantity: Number(li.quantity),
        unitPriceCents: li.unit_price_cents,
        totalCents: li.total_cents,
      })),
      subtotalCents: invoice.subtotal_cents,
      discountCents: invoice.discount_cents,
      taxCents: invoice.tax_cents,
      totalCents: invoice.total_cents,
      amountPaidCents: invoice.amount_paid_cents,
      balanceDueCents: invoice.balance_due_cents,
      notes: invoice.notes,
      dueDate: invoice.due_date,
      issuedAt: invoice.issued_at,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${invoice.invoice_number}.html"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
}
