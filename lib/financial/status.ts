export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "converted",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const INVOICE_STATUSES = [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
  "refunded",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "refunded",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_PROVIDERS = [
  "paystack",
  "payfast",
  "eft",
  "cash",
  "stripe",
  "ozow",
  "peach",
  "yoco",
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const DEPOSIT_TYPES = ["full", "percentage", "fixed"] as const;
export type DepositType = (typeof DEPOSIT_TYPES)[number];

export const PAYMENT_TYPES = ["full", "deposit", "balance", "partial"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export function quoteStatusBadgeClass(status: string | null): string {
  switch (status) {
    case "accepted":
    case "converted":
      return "bg-emerald-50 text-emerald-700";
    case "sent":
    case "viewed":
      return "bg-blue-50 text-blue-700";
    case "rejected":
    case "expired":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function invoiceStatusBadgeClass(status: string | null): string {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700";
    case "partially_paid":
      return "bg-amber-50 text-amber-700";
    case "issued":
      return "bg-blue-50 text-blue-700";
    case "overdue":
      return "bg-red-50 text-red-700";
    case "cancelled":
    case "refunded":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function paymentStatusBadgeClass(status: string | null): string {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700";
    case "processing":
    case "pending":
      return "bg-amber-50 text-amber-700";
    case "failed":
    case "cancelled":
      return "bg-red-50 text-red-700";
    case "refunded":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function computeDepositAmountCents(
  totalCents: number,
  depositType: DepositType,
  depositValue: number
): number {
  if (depositType === "full") return totalCents;
  if (depositType === "percentage") {
    return Math.round(totalCents * (Math.min(100, depositValue) / 100));
  }
  return Math.min(totalCents, depositValue);
}
