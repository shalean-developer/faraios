import type { InvoiceStatus } from "@/lib/financial/status";

const EDITABLE_QUOTE_STATUSES = new Set(["draft", "sent", "viewed"]);

export function canEditQuote(status: string): boolean {
  return EDITABLE_QUOTE_STATUSES.has(status);
}

export function canEditInvoice(status: InvoiceStatus): boolean {
  return status === "draft";
}
