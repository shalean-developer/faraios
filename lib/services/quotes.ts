import { computeLineItemTotals } from "@/lib/financial/line-items";
import { logFinancialAudit } from "@/lib/services/financial-audit";
import { createEngineBooking } from "@/lib/services/booking-engine";
import { createInvoiceFromQuote } from "@/lib/services/invoices";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { LineItemInput, Quote, QuoteLineItem, QuoteWithCustomer } from "@/types/financial";

export type QuoteMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function allocateQuoteNumber(
  client: Awaited<ReturnType<typeof createClient>>,
  companyId: string
): Promise<string | null> {
  const { data, error } = await client.rpc("allocate_document_number", {
    p_company_id: companyId,
    p_document_type: "quote",
    p_prefix: "QTE",
  });
  if (error || !data) return null;
  return data as string;
}

export async function listQuotesForCompany(companyId: string): Promise<QuoteWithCustomer[]> {
  if (!isSupabaseConfigured() || !companyId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("*, customers(name, email, phone)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[quotes] listQuotesForCompany", error.message);
    return [];
  }
  return (data ?? []) as QuoteWithCustomer[];
}

export async function listQuotesForCustomer(
  companyId: string,
  customerId: string
): Promise<Quote[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select("*")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Quote[];
}

export async function getQuoteById(
  companyId: string,
  quoteId: string
): Promise<{ quote: QuoteWithCustomer; lineItems: QuoteLineItem[] } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const [{ data: quote }, { data: lineItems }] = await Promise.all([
    supabase
      .from("quotes")
      .select("*, customers(name, email, phone)")
      .eq("company_id", companyId)
      .eq("id", quoteId)
      .maybeSingle(),
    supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("sort_order"),
  ]);
  if (!quote) return null;
  return {
    quote: quote as QuoteWithCustomer,
    lineItems: (lineItems ?? []) as QuoteLineItem[],
  };
}

export async function createQuote(input: {
  companyId: string;
  customerId: string;
  bookingId?: string | null;
  lineItems: LineItemInput[];
  discountCents?: number;
  taxCents?: number;
  notes?: string;
  validUntil?: string | null;
  createdBy?: string | null;
  actorId?: string | null;
}): Promise<QuoteMutationResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured." };
  if (!input.lineItems.length) return { ok: false, error: "At least one line item is required." };

  const supabase = await createClient();
  const quoteNumber = await allocateQuoteNumber(supabase, input.companyId);
  if (!quoteNumber) return { ok: false, error: "Could not allocate quote number." };

  const totals = computeLineItemTotals(
    input.lineItems,
    input.discountCents ?? 0,
    input.taxCents ?? 0
  );

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      company_id: input.companyId,
      customer_id: input.customerId,
      booking_id: input.bookingId ?? null,
      quote_number: quoteNumber,
      status: "draft",
      subtotal_cents: totals.subtotalCents,
      discount_cents: totals.discountCents,
      tax_cents: totals.taxCents,
      total_cents: totals.totalCents,
      notes: input.notes?.trim() || null,
      valid_until: input.validUntil ?? null,
      created_by: input.createdBy ?? input.actorId ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !quote) return { ok: false, error: error?.message ?? "Could not create quote." };

  const { error: itemsError } = await supabase.from("quote_line_items").insert(
    totals.lineItems.map((li) => ({ ...li, quote_id: quote.id }))
  );
  if (itemsError) return { ok: false, error: itemsError.message };

  await logFinancialAudit({
    companyId: input.companyId,
    entityType: "quote",
    entityId: quote.id,
    action: "created",
    actorId: input.actorId,
    metadata: { quote_number: quoteNumber },
  });

  return { ok: true, id: quote.id };
}

export async function createQuoteFromBooking(
  companyId: string,
  bookingId: string,
  actorId?: string | null
): Promise<QuoteMutationResult> {
  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, customers(id)")
    .eq("company_id", companyId)
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { ok: false, error: "Booking not found." };
  if (!booking.customer_id) return { ok: false, error: "Booking has no linked customer." };

  const lineItems: LineItemInput[] = [
    {
      description: booking.service ?? "Service",
      quantity: 1,
      unitPriceCents: booking.price_cents ?? 0,
      serviceId: booking.service_id,
    },
  ];

  const addons = (booking.addons ?? []) as Array<{ name?: string; price_cents?: number }>;
  for (const addon of addons) {
    if (addon.name) {
      lineItems.push({
        description: addon.name,
        quantity: 1,
        unitPriceCents: addon.price_cents ?? 0,
      });
    }
  }

  return createQuote({
    companyId,
    customerId: booking.customer_id,
    bookingId,
    lineItems,
    actorId,
  });
}

export async function sendQuote(
  companyId: string,
  quoteId: string,
  actorId?: string | null
): Promise<QuoteMutationResult> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("quotes")
    .update({ status: "sent", sent_at: now, updated_at: now })
    .eq("company_id", companyId)
    .eq("id", quoteId)
    .eq("status", "draft");

  if (error) return { ok: false, error: error.message };

  await logFinancialAudit({
    companyId,
    entityType: "quote",
    entityId: quoteId,
    action: "sent",
    actorId,
  });

  return { ok: true, id: quoteId };
}

export async function updateQuoteStatusPortal(
  quoteId: string,
  status: "viewed" | "accepted" | "rejected",
  companyId: string
): Promise<QuoteMutationResult> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Not configured." };

  const now = new Date().toISOString();
  const patch: Record<string, string> = { updated_at: now, status };
  if (status === "viewed") patch.viewed_at = now;
  if (status === "accepted") patch.accepted_at = now;
  if (status === "rejected") patch.rejected_at = now;

  const { error } = await admin.client
    .from("quotes")
    .update(patch)
    .eq("id", quoteId)
    .eq("company_id", companyId);

  if (error) return { ok: false, error: error.message };

  await logFinancialAudit({
    companyId,
    entityType: "quote",
    entityId: quoteId,
    action: status,
    useAdmin: true,
  });

  return { ok: true, id: quoteId };
}

export async function convertQuoteToBooking(
  companyId: string,
  quoteId: string,
  actorId?: string | null
): Promise<QuoteMutationResult & { bookingId?: string }> {
  const detail = await getQuoteById(companyId, quoteId);
  if (!detail) return { ok: false, error: "Quote not found." };
  if (detail.quote.status !== "accepted") {
    return { ok: false, error: "Only accepted quotes can be converted to bookings." };
  }

  const customer = detail.quote.customers;
  const firstLine = detail.lineItems[0];
  const result = await createEngineBooking({
    companyId,
    customerName: customer?.name ?? "Customer",
    customerEmail: customer?.email ?? undefined,
    customerPhone: customer?.phone ?? undefined,
    serviceId: firstLine?.service_id ?? undefined,
    service: firstLine?.description,
    bookingDate: new Date().toISOString(),
    source: "internal",
    status: "confirmed",
    skipFormValidation: true,
    skipAvailabilityCheck: true,
  });

  if (!result.ok) return result;

  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase
    .from("quotes")
    .update({
      status: "converted",
      converted_booking_id: result.bookingId,
      updated_at: now,
    })
    .eq("id", quoteId);

  await logFinancialAudit({
    companyId,
    entityType: "quote",
    entityId: quoteId,
    action: "converted_to_booking",
    actorId,
    metadata: { booking_id: result.bookingId },
  });

  return { ok: true, id: quoteId, bookingId: result.bookingId };
}

export async function convertQuoteToInvoice(
  companyId: string,
  quoteId: string,
  actorId?: string | null
): Promise<QuoteMutationResult & { invoiceId?: string }> {
  const detail = await getQuoteById(companyId, quoteId);
  if (!detail) return { ok: false, error: "Quote not found." };
  if (detail.quote.status !== "accepted") {
    return { ok: false, error: "Only accepted quotes can be converted to invoices." };
  }

  const invoiceResult = await createInvoiceFromQuote(companyId, quoteId, actorId);
  if (!invoiceResult.ok) return invoiceResult;

  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase
    .from("quotes")
    .update({
      status: "converted",
      converted_invoice_id: invoiceResult.id,
      updated_at: now,
    })
    .eq("id", quoteId);

  return { ok: true, id: quoteId, invoiceId: invoiceResult.id };
}

export async function expireStaleQuotes(companyId: string): Promise<void> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("quotes")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .in("status", ["sent", "viewed"])
    .lt("valid_until", today);
}

export async function updateQuote(input: {
  companyId: string;
  quoteId: string;
  lineItems: LineItemInput[];
  discountCents?: number;
  taxCents?: number;
  notes?: string;
  validUntil?: string | null;
  actorId?: string | null;
}): Promise<QuoteMutationResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured." };
  if (!input.lineItems.length) return { ok: false, error: "At least one line item is required." };

  const detail = await getQuoteById(input.companyId, input.quoteId);
  if (!detail) return { ok: false, error: "Quote not found." };

  const editable = ["draft", "sent", "viewed"];
  if (!editable.includes(detail.quote.status)) {
    return {
      ok: false,
      error: `Quotes with status "${detail.quote.status}" cannot be edited.`,
    };
  }

  const supabase = await createClient();
  const totals = computeLineItemTotals(
    input.lineItems,
    input.discountCents ?? detail.quote.discount_cents,
    input.taxCents ?? detail.quote.tax_cents
  );

  const now = new Date().toISOString();
  const { error: quoteError } = await supabase
    .from("quotes")
    .update({
      subtotal_cents: totals.subtotalCents,
      discount_cents: totals.discountCents,
      tax_cents: totals.taxCents,
      total_cents: totals.totalCents,
      notes: input.notes?.trim() ?? detail.quote.notes,
      valid_until:
        input.validUntil !== undefined ? input.validUntil : detail.quote.valid_until,
      updated_at: now,
    })
    .eq("company_id", input.companyId)
    .eq("id", input.quoteId);

  if (quoteError) return { ok: false, error: quoteError.message };

  const { error: deleteError } = await supabase
    .from("quote_line_items")
    .delete()
    .eq("quote_id", input.quoteId);

  if (deleteError) return { ok: false, error: deleteError.message };

  const { error: itemsError } = await supabase.from("quote_line_items").insert(
    totals.lineItems.map((li) => ({ ...li, quote_id: input.quoteId }))
  );
  if (itemsError) return { ok: false, error: itemsError.message };

  await logFinancialAudit({
    companyId: input.companyId,
    entityType: "quote",
    entityId: input.quoteId,
    action: "updated",
    actorId: input.actorId,
    metadata: { quote_number: detail.quote.quote_number },
  });

  return { ok: true, id: input.quoteId };
}
