"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyMembership } from "@/lib/services/company-access";
import { notifyInvoiceIssued } from "@/lib/services/financial-notifications";
import {
  createInvoice,
  createInvoiceFromBooking,
  cancelDraftInvoice,
  getInvoiceById,
  issueInvoice,
} from "@/lib/services/invoices";
import { getOrCreatePortalToken } from "@/lib/services/portal-access";
import type { DepositType } from "@/lib/financial/status";
import type { LineItemInput } from "@/types/financial";

export type InvoiceActionResult = { ok: true; id: string } | { ok: false; error: string };

function revalidateInvoicePaths(slug: string) {
  revalidatePath(`/${slug}/dashboard/invoices`);
  revalidatePath(`/${slug}/dashboard`);
  revalidatePath(`/${slug}/dashboard/revenue`);
  revalidatePath(`/${slug}/dashboard/payments`);
  revalidatePath(`/${slug}/dashboard/reports`);
}

export async function createInvoiceAction(input: {
  companyId: string;
  companySlug: string;
  customerId: string;
  lineItems: LineItemInput[];
  discountCents?: number;
  taxCents?: number;
  notes?: string;
  dueDate?: string;
  depositType?: DepositType;
  depositValue?: number;
  issue?: boolean;
}): Promise<InvoiceActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await createInvoice({
    companyId: input.companyId,
    customerId: input.customerId,
    lineItems: input.lineItems,
    discountCents: input.discountCents,
    taxCents: input.taxCents,
    notes: input.notes,
    dueDate: input.dueDate ?? null,
    depositType: input.depositType,
    depositValue: input.depositValue,
    actorId: access.userId,
    issue: input.issue ?? false,
  });

  if (result.ok) revalidateInvoicePaths(input.companySlug);
  return result;
}

export async function createInvoiceFromBookingAction(input: {
  companyId: string;
  companySlug: string;
  bookingId: string;
}): Promise<InvoiceActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await createInvoiceFromBooking(
    input.companyId,
    input.bookingId,
    access.userId
  );
  if (result.ok) revalidateInvoicePaths(input.companySlug);
  return result;
}

export async function issueInvoiceAction(input: {
  companyId: string;
  companySlug: string;
  invoiceId: string;
}): Promise<InvoiceActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await issueInvoice(input.companyId, input.invoiceId, access.userId);
  if (!result.ok) return result;

  const detail = await getInvoiceById(input.companyId, input.invoiceId);
  if (detail?.invoice.customers?.email) {
    const token = await getOrCreatePortalToken(input.companyId, detail.invoice.customer_id);
    if (token) {
      await notifyInvoiceIssued({
        companyId: input.companyId,
        customerEmail: detail.invoice.customers.email,
        customerName: detail.invoice.customers.name,
        invoiceNumber: detail.invoice.invoice_number,
        totalCents: detail.invoice.total_cents,
        balanceDueCents: detail.invoice.balance_due_cents,
        portalToken: token,
      });
    }
  }

  revalidateInvoicePaths(input.companySlug);
  return result;
}

export async function cancelDraftInvoiceAction(input: {
  companyId: string;
  companySlug: string;
  invoiceId: string;
}): Promise<InvoiceActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await cancelDraftInvoice(
    input.companyId,
    input.invoiceId,
    access.userId
  );
  if (result.ok) revalidateInvoicePaths(input.companySlug);
  return result;
}
