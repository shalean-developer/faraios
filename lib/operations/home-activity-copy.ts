import { formatRevenue } from "@/lib/operations/metrics";

export function activityServiceForCustomer(
  service: string | null | undefined,
  customerName: string | null | undefined
): string {
  const serviceLabel = service?.trim();
  const customerLabel = customerName?.trim();

  if (serviceLabel && customerLabel) {
    return `${serviceLabel} for ${customerLabel}`;
  }
  if (customerLabel) return customerLabel;
  if (serviceLabel) return serviceLabel;
  return "Details unavailable";
}

export function bookingActivityTitle(): string {
  return "New Booking Created";
}

export function invoiceActivityTitle(status: string): string {
  switch (status) {
    case "issued":
      return "Invoice Sent";
    case "paid":
      return "Invoice Paid";
    case "partially_paid":
      return "Partial Payment Received";
    case "overdue":
      return "Invoice Overdue";
    case "draft":
      return "Invoice Created";
    default:
      return "Invoice Updated";
  }
}

export function quoteActivityTitle(status: string): string {
  switch (status) {
    case "draft":
      return "New Quote Created";
    case "sent":
    case "viewed":
      return "Quote Sent";
    case "accepted":
      return "Quote Accepted";
    case "converted":
      return "Quote Converted";
    default:
      return "New Quote";
  }
}

export function paymentActivityTitle(): string {
  return "Payment Received";
}

export function leadActivityTitle(): string {
  return "New Lead Captured";
}

export function reviewActivityTitle(): string {
  return "Review Request Sent";
}

export function paymentActivitySubtitle(
  amountCents: number,
  customerName: string | null | undefined
): string {
  const amount = formatRevenue(amountCents);
  const customerLabel = customerName?.trim();
  return customerLabel ? `${amount} from ${customerLabel}` : amount;
}

export function leadActivitySubtitle(input: {
  name?: string | null;
  email?: string | null;
  message?: string | null;
  leadType?: string | null;
}): string {
  const name = input.name?.trim();
  const message = input.message?.trim();
  const email = input.email?.trim();

  if (name && message) {
    return message.length > 72 ? `${name} — ${message.slice(0, 69)}…` : `${name} — ${message}`;
  }
  if (name) return name;
  if (email) return email;
  return formatLeadType(input.leadType);
}

function formatLeadType(leadType: string | null | undefined): string {
  switch (leadType) {
    case "quote_request":
      return "Quote request";
    case "contact":
      return "Contact enquiry";
    default:
      return "Inbound lead";
  }
}

export function firstLineItemDescription(
  items: { description: string; sort_order?: number }[] | null | undefined
): string | null {
  if (!items?.length) return null;
  const sorted = [...items].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  return sorted[0]?.description?.trim() || null;
}

const LOG_ACTION_TITLES: Record<string, string> = {
  booking_created: "New Booking Created",
  invoice_sent: "Invoice Sent",
  invoice_created: "Invoice Created",
  invoice_paid: "Invoice Paid",
  quote_sent: "Quote Sent",
  quote_created: "New Quote Created",
  payment_received: "Payment Received",
  lead_captured: "New Lead Captured",
  review_request_sent: "Review Request Sent",
  customer_created: "New Customer Added",
  workflow_triggered: "Automation Triggered",
};

export function activityLogTitle(action: string): string {
  const normalized = action.trim().toLowerCase();
  if (LOG_ACTION_TITLES[normalized]) {
    return LOG_ACTION_TITLES[normalized];
  }

  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function activityLogSubtitle(metadata: Record<string, unknown>): string {
  const service = String(
    metadata.service ?? metadata.service_name ?? metadata.serviceName ?? ""
  );
  const customerName = String(
    metadata.customer_name ?? metadata.customerName ?? metadata.name ?? ""
  );
  const detail = activityServiceForCustomer(service, customerName);
  if (detail !== "Details unavailable") return detail;

  const message = String(metadata.message ?? metadata.description ?? "").trim();
  if (message) return message;

  const entityLabel = String(metadata.entity_label ?? metadata.entityLabel ?? "").trim();
  if (entityLabel) return entityLabel;

  return "Workspace activity";
}
