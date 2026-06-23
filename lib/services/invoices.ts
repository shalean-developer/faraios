import { computeLineItemTotals } from "@/lib/financial/line-items";
import { computeDepositAmountCents } from "@/lib/financial/status";
import { logFinancialAudit } from "@/lib/services/financial-audit";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceWithCustomer,
  LineItemInput,
} from "@/types/financial";
import type { DepositType } from "@/lib/financial/status";

export type InvoiceMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function allocateInvoiceNumber(
  client: Awaited<ReturnType<typeof createClient>>,
  companyId: string
): Promise<string | null> {
  const { data, error } = await client.rpc("allocate_document_number", {
    p_company_id: companyId,
    p_document_type: "invoice",
    p_prefix: "INV",
  });
  if (error || !data) return null;
  return data as string;
}

function deriveInvoiceStatus(
  totalCents: number,
  amountPaidCents: number,
  dueDate: string | null,
  currentStatus: string
): string {
  if (currentStatus === "cancelled" || currentStatus === "refunded") return currentStatus;
  if (amountPaidCents >= totalCents && totalCents > 0) return "paid";
  if (amountPaidCents > 0) return "partially_paid";
  if (dueDate && currentStatus === "issued") {
    const due = new Date(dueDate);
    if (due < new Date() && amountPaidCents < totalCents) return "overdue";
  }
  return currentStatus;
}

export async function listInvoicesForCompany(
  companyId: string
): Promise<InvoiceWithCustomer[]> {
  if (!isSupabaseConfigured() || !companyId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, customers(name, email, phone)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[invoices] listInvoicesForCompany", error.message);
    return [];
  }
  return (data ?? []) as InvoiceWithCustomer[];
}

export async function listInvoicesForCustomer(
  companyId: string,
  customerId: string
): Promise<Invoice[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Invoice[];
}

export async function getInvoiceById(
  companyId: string,
  invoiceId: string
): Promise<{ invoice: InvoiceWithCustomer; lineItems: InvoiceLineItem[] } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const [{ data: invoice }, { data: lineItems }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, customers(name, email, phone)")
      .eq("company_id", companyId)
      .eq("id", invoiceId)
      .maybeSingle(),
    supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("sort_order"),
  ]);
  if (!invoice) return null;
  return {
    invoice: invoice as InvoiceWithCustomer,
    lineItems: (lineItems ?? []) as InvoiceLineItem[],
  };
}

export async function createInvoice(input: {
  companyId: string;
  customerId: string;
  bookingId?: string | null;
  quoteId?: string | null;
  lineItems: LineItemInput[];
  discountCents?: number;
  taxCents?: number;
  notes?: string;
  dueDate?: string | null;
  depositType?: DepositType;
  depositValue?: number;
  actorId?: string | null;
  issue?: boolean;
}): Promise<InvoiceMutationResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured." };
  if (!input.lineItems.length) return { ok: false, error: "At least one line item is required." };

  const supabase = await createClient();
  const invoiceNumber = await allocateInvoiceNumber(supabase, input.companyId);
  if (!invoiceNumber) return { ok: false, error: "Could not allocate invoice number." };

  const totals = computeLineItemTotals(
    input.lineItems,
    input.discountCents ?? 0,
    input.taxCents ?? 0
  );

  const depositType = input.depositType ?? "full";
  const depositValue = input.depositValue ?? 100;
  const now = new Date().toISOString();
  const issue = input.issue ?? false;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      company_id: input.companyId,
      customer_id: input.customerId,
      booking_id: input.bookingId ?? null,
      quote_id: input.quoteId ?? null,
      invoice_number: invoiceNumber,
      status: issue ? "issued" : "draft",
      subtotal_cents: totals.subtotalCents,
      discount_cents: totals.discountCents,
      tax_cents: totals.taxCents,
      total_cents: totals.totalCents,
      amount_paid_cents: 0,
      balance_due_cents: totals.totalCents,
      deposit_type: depositType,
      deposit_value: depositValue,
      due_date: input.dueDate ?? null,
      notes: input.notes?.trim() || null,
      issued_at: issue ? now : null,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !invoice) return { ok: false, error: error?.message ?? "Could not create invoice." };

  const { error: itemsError } = await supabase.from("invoice_line_items").insert(
    totals.lineItems.map((li) => ({ ...li, invoice_id: invoice.id }))
  );
  if (itemsError) return { ok: false, error: itemsError.message };

  await logFinancialAudit({
    companyId: input.companyId,
    entityType: "invoice",
    entityId: invoice.id,
    action: issue ? "issued" : "created",
    actorId: input.actorId,
    metadata: { invoice_number: invoiceNumber },
  });

  return { ok: true, id: invoice.id };
}

export async function createInvoiceFromBooking(
  companyId: string,
  bookingId: string,
  actorId?: string | null
): Promise<InvoiceMutationResult> {
  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
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

  const { data: settings } = await supabase
    .from("company_payment_settings")
    .select("default_deposit_type, default_deposit_value")
    .eq("company_id", companyId)
    .maybeSingle();

  return createInvoice({
    companyId,
    customerId: booking.customer_id,
    bookingId,
    lineItems,
    depositType: (settings?.default_deposit_type as DepositType) ?? "full",
    depositValue: settings?.default_deposit_value ?? 100,
    actorId,
    issue: true,
  });
}

export async function createInvoiceFromQuote(
  companyId: string,
  quoteId: string,
  actorId?: string | null
): Promise<InvoiceMutationResult> {
  const supabase = await createClient();
  const [{ data: quote }, { data: lineItems }] = await Promise.all([
    supabase.from("quotes").select("*").eq("company_id", companyId).eq("id", quoteId).maybeSingle(),
    supabase.from("quote_line_items").select("*").eq("quote_id", quoteId).order("sort_order"),
  ]);

  if (!quote) return { ok: false, error: "Quote not found." };

  const items: LineItemInput[] = (lineItems ?? []).map((li) => ({
    serviceId: li.service_id,
    description: li.description,
    quantity: Number(li.quantity),
    unitPriceCents: li.unit_price_cents,
  }));

  const { data: settings } = await supabase
    .from("company_payment_settings")
    .select("default_deposit_type, default_deposit_value")
    .eq("company_id", companyId)
    .maybeSingle();

  return createInvoice({
    companyId,
    customerId: quote.customer_id,
    bookingId: quote.booking_id,
    quoteId,
    lineItems: items,
    discountCents: quote.discount_cents,
    taxCents: quote.tax_cents,
    notes: quote.notes,
    dueDate: quote.valid_until,
    depositType: (settings?.default_deposit_type as DepositType) ?? "full",
    depositValue: settings?.default_deposit_value ?? 100,
    actorId,
    issue: true,
  });
}

export async function issueInvoice(
  companyId: string,
  invoiceId: string,
  actorId?: string | null
): Promise<InvoiceMutationResult> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "issued", issued_at: now, updated_at: now })
    .eq("company_id", companyId)
    .eq("id", invoiceId)
    .eq("status", "draft");

  if (error) return { ok: false, error: error.message };

  await logFinancialAudit({
    companyId,
    entityType: "invoice",
    entityId: invoiceId,
    action: "issued",
    actorId,
  });

  return { ok: true, id: invoiceId };
}

export async function recalculateInvoicePaymentStatus(
  companyId: string,
  invoiceId: string
): Promise<void> {
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) return;

  const { data: payments } = await supabase
    .from("customer_payments")
    .select("amount_cents")
    .eq("invoice_id", invoiceId)
    .eq("status", "paid");

  const amountPaid = (payments ?? []).reduce((sum, p) => sum + p.amount_cents, 0);
  const balanceDue = Math.max(0, invoice.total_cents - amountPaid);
  const status = deriveInvoiceStatus(
    invoice.total_cents,
    amountPaid,
    invoice.due_date,
    invoice.status === "draft" ? "draft" : "issued"
  );

  const now = new Date().toISOString();
  await supabase
    .from("invoices")
    .update({
      amount_paid_cents: amountPaid,
      balance_due_cents: balanceDue,
      status,
      paid_at: status === "paid" ? now : invoice.paid_at,
      updated_at: now,
    })
    .eq("id", invoiceId);

  if (status === "paid" && invoice.booking_id) {
    await supabase
      .from("bookings")
      .update({ payment_status: "paid", updated_at: now })
      .eq("id", invoice.booking_id);
  } else if (amountPaid > 0 && invoice.booking_id) {
    await supabase
      .from("bookings")
      .update({ payment_status: "pending", updated_at: now })
      .eq("id", invoice.booking_id);
  }
}

export function getInvoiceDepositDueCents(invoice: Invoice): number {
  const remaining = invoice.balance_due_cents;
  if (invoice.amount_paid_cents > 0) return remaining;
  return computeDepositAmountCents(
    invoice.total_cents,
    invoice.deposit_type,
    invoice.deposit_value
  );
}

export async function markOverdueInvoices(companyId: string): Promise<void> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("invoices")
    .update({ status: "overdue", updated_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .in("status", ["issued", "partially_paid"])
    .lt("due_date", today);
}
