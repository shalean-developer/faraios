"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyMembership } from "@/lib/services/company-access";
import {
  notifyQuoteAcceptedAdmin,
  notifyQuoteSent,
} from "@/lib/services/financial-notifications";
import { getOrCreatePortalToken } from "@/lib/services/portal-access";
import {
  convertQuoteToBooking,
  convertQuoteToInvoice,
  createQuote,
  createQuoteFromBooking,
  getQuoteById,
  sendQuote,
} from "@/lib/services/quotes";
import type { LineItemInput } from "@/types/financial";

export type QuoteActionResult = { ok: true; id: string } | { ok: false; error: string };

function revalidateQuotePaths(slug: string) {
  revalidatePath(`/${slug}/dashboard/bookings/quote-requests`);
  revalidatePath(`/${slug}/dashboard/quotes`);
  revalidatePath(`/${slug}/dashboard`);
  revalidatePath(`/${slug}/dashboard/revenue`);
  revalidatePath(`/${slug}/dashboard/reports`);
}

export async function createQuoteAction(input: {
  companyId: string;
  companySlug: string;
  customerId: string;
  lineItems: LineItemInput[];
  discountCents?: number;
  taxCents?: number;
  notes?: string;
  validUntil?: string;
}): Promise<QuoteActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await createQuote({
    companyId: input.companyId,
    customerId: input.customerId,
    lineItems: input.lineItems,
    discountCents: input.discountCents,
    taxCents: input.taxCents,
    notes: input.notes,
    validUntil: input.validUntil ?? null,
    actorId: access.userId,
  });

  if (result.ok) revalidateQuotePaths(input.companySlug);
  return result;
}

export async function createQuoteFromBookingAction(input: {
  companyId: string;
  companySlug: string;
  bookingId: string;
}): Promise<QuoteActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await createQuoteFromBooking(
    input.companyId,
    input.bookingId,
    access.userId
  );
  if (result.ok) revalidateQuotePaths(input.companySlug);
  return result;
}

export async function sendQuoteAction(input: {
  companyId: string;
  companySlug: string;
  quoteId: string;
}): Promise<QuoteActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await sendQuote(input.companyId, input.quoteId, access.userId);
  if (!result.ok) return result;

  const detail = await getQuoteById(input.companyId, input.quoteId);
  if (detail?.quote.customers?.email) {
    const token = await getOrCreatePortalToken(input.companyId, detail.quote.customer_id);
    if (token) {
      await notifyQuoteSent({
        companyId: input.companyId,
        customerEmail: detail.quote.customers.email,
        customerName: detail.quote.customers.name,
        quoteNumber: detail.quote.quote_number,
        totalCents: detail.quote.total_cents,
        portalToken: token,
      });
    }
  }

  revalidateQuotePaths(input.companySlug);
  return result;
}

export async function convertQuoteToBookingAction(input: {
  companyId: string;
  companySlug: string;
  quoteId: string;
}): Promise<QuoteActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await convertQuoteToBooking(
    input.companyId,
    input.quoteId,
    access.userId
  );
  if (result.ok) {
    revalidateQuotePaths(input.companySlug);
    revalidatePath(`/${input.companySlug}/dashboard/bookings`);
  }
  return result;
}

export async function convertQuoteToInvoiceAction(input: {
  companyId: string;
  companySlug: string;
  quoteId: string;
}): Promise<QuoteActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await convertQuoteToInvoice(
    input.companyId,
    input.quoteId,
    access.userId
  );
  if (result.ok) {
    revalidateQuotePaths(input.companySlug);
    revalidatePath(`/${input.companySlug}/dashboard/invoices`);
  }
  return result;
}

export async function notifyQuoteAcceptedAction(input: {
  companyId: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
}): Promise<void> {
  await notifyQuoteAcceptedAdmin(input);
}
