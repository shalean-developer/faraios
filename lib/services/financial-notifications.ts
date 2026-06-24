import { formatRevenue } from "@/lib/operations/metrics";
import { logPlatformEmail } from "@/lib/platform/email-log";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  parseNotificationPreferences,
} from "@/lib/services/company-notification-preferences";
import { portalUrl } from "@/lib/services/portal-access";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

async function companyAllowsEmail(
  companyId: string | undefined,
  key: keyof typeof DEFAULT_NOTIFICATION_PREFERENCES
): Promise<boolean> {
  if (!companyId) return true;
  const admin = tryCreateAdminClient();
  if (!admin.ok) return true;

  const { data } = await admin.client
    .from("companies")
    .select("notification_preferences")
    .eq("id", companyId)
    .maybeSingle();

  const prefs = parseNotificationPreferences(data?.notification_preferences);
  return prefs[key];
}

async function sendFinancialEmail(input: {
  to: string;
  subject: string;
  html: string;
  companyId?: string;
  template?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BOOKING_FROM_EMAIL?.trim();
  const template = input.template ?? "financial";

  if (!apiKey || !from) {
    await logPlatformEmail({
      to: input.to,
      subject: input.subject,
      template,
      status: "failed",
      companyId: input.companyId ?? null,
      errorMessage: "Missing RESEND_API_KEY or BOOKING_FROM_EMAIL",
    });
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      await logPlatformEmail({
        to: input.to,
        subject: input.subject,
        template,
        status: "failed",
        companyId: input.companyId ?? null,
        errorMessage: `HTTP ${response.status}: ${body.slice(0, 200)}`,
      });
      return;
    }

    await logPlatformEmail({
      to: input.to,
      subject: input.subject,
      template,
      status: "sent",
      companyId: input.companyId ?? null,
    });
  } catch (error) {
    console.error("[financial-notifications]", error);
    await logPlatformEmail({
      to: input.to,
      subject: input.subject,
      template,
      status: "failed",
      companyId: input.companyId ?? null,
      errorMessage: error instanceof Error ? error.message : "Send failed",
    });
  }
}

async function getCompanyContactEmail(companyId: string): Promise<string | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;
  const { data } = await admin.client
    .from("companies")
    .select("primary_contact_email, name")
    .eq("id", companyId)
    .maybeSingle();
  return data?.primary_contact_email ?? null;
}

export async function notifyQuoteSent(input: {
  companyId: string;
  customerEmail: string;
  customerName: string;
  quoteNumber: string;
  totalCents: number;
  portalToken: string;
}): Promise<void> {
  const url = portalUrl(input.portalToken);
  await sendFinancialEmail({
    to: input.customerEmail,
    subject: `Quote ${input.quoteNumber} from your service provider`,
    html: `<p>Hi ${input.customerName},</p>
      <p>You have received quote <strong>${input.quoteNumber}</strong> for <strong>${formatRevenue(input.totalCents)}</strong>.</p>
      <p><a href="${url}">View and respond to your quote</a></p>`,
    companyId: input.companyId,
    template: "quote_sent",
  });
}

export async function notifyQuoteAcceptedAdmin(input: {
  companyId: string;
  quoteNumber: string;
  customerName: string;
}): Promise<void> {
  if (!(await companyAllowsEmail(input.companyId, "emailInvoiceAlerts"))) return;
  const adminEmail = await getCompanyContactEmail(input.companyId);
  if (!adminEmail) return;
  await sendFinancialEmail({
    to: adminEmail,
    subject: `Quote ${input.quoteNumber} accepted`,
    html: `<p><strong>${input.customerName}</strong> accepted quote <strong>${input.quoteNumber}</strong>.</p>`,
    companyId: input.companyId,
    template: "quote_accepted_admin",
  });
}

export async function notifyInvoiceIssued(input: {
  companyId: string;
  customerEmail: string;
  customerName: string;
  invoiceNumber: string;
  totalCents: number;
  balanceDueCents: number;
  portalToken: string;
}): Promise<void> {
  const url = portalUrl(input.portalToken);
  await sendFinancialEmail({
    to: input.customerEmail,
    subject: `Invoice ${input.invoiceNumber}`,
    html: `<p>Hi ${input.customerName},</p>
      <p>Invoice <strong>${input.invoiceNumber}</strong> for <strong>${formatRevenue(input.totalCents)}</strong> has been issued.</p>
      <p>Balance due: <strong>${formatRevenue(input.balanceDueCents)}</strong></p>
      <p><a href="${url}">View invoice and pay online</a></p>`,
    companyId: input.companyId,
    template: "invoice_issued",
  });
}

export async function notifyPaymentReceived(input: {
  companyId: string;
  customerEmail: string;
  customerName: string;
  invoiceNumber: string;
  amountCents: number;
}): Promise<void> {
  await sendFinancialEmail({
    to: input.customerEmail,
    subject: `Payment received — ${input.invoiceNumber}`,
    html: `<p>Hi ${input.customerName},</p>
      <p>We received your payment of <strong>${formatRevenue(input.amountCents)}</strong> for invoice <strong>${input.invoiceNumber}</strong>.</p>
      <p>Thank you!</p>`,
    companyId: input.companyId,
    template: "payment_received",
  });

  if (await companyAllowsEmail(input.companyId, "emailInvoiceAlerts")) {
    const adminEmail = await getCompanyContactEmail(input.companyId);
    if (adminEmail) {
      await sendFinancialEmail({
        to: adminEmail,
        subject: `Invoice ${input.invoiceNumber} paid`,
        html: `<p>Payment of <strong>${formatRevenue(input.amountCents)}</strong> received for invoice <strong>${input.invoiceNumber}</strong> from <strong>${input.customerName}</strong>.</p>`,
        companyId: input.companyId,
        template: "payment_received_admin",
      });
    }
  }
}

export async function notifyPaymentFailedAdmin(input: {
  companyId: string;
  invoiceNumber: string;
  customerName: string;
}): Promise<void> {
  if (!(await companyAllowsEmail(input.companyId, "emailInvoiceAlerts"))) return;
  const adminEmail = await getCompanyContactEmail(input.companyId);
  if (!adminEmail) return;
  await sendFinancialEmail({
    to: adminEmail,
    subject: `Payment failed — ${input.invoiceNumber}`,
    html: `<p>A payment attempt for invoice <strong>${input.invoiceNumber}</strong> from <strong>${input.customerName}</strong> failed.</p>`,
    companyId: input.companyId,
    template: "payment_failed_admin",
  });
}

export async function notifyInvoiceOverdue(input: {
  companyId: string;
  customerEmail: string;
  customerName: string;
  invoiceNumber: string;
  balanceDueCents: number;
  portalToken: string;
}): Promise<void> {
  const url = portalUrl(input.portalToken);
  await sendFinancialEmail({
    to: input.customerEmail,
    subject: `Reminder: Invoice ${input.invoiceNumber} is overdue`,
    html: `<p>Hi ${input.customerName},</p>
      <p>Invoice <strong>${input.invoiceNumber}</strong> is overdue. Balance due: <strong>${formatRevenue(input.balanceDueCents)}</strong>.</p>
      <p><a href="${url}">Pay now</a></p>`,
    companyId: input.companyId,
    template: "invoice_overdue",
  });
}
