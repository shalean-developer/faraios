import { formatRevenue } from "@/lib/operations/metrics";
import { portalUrl } from "@/lib/services/portal-access";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

async function sendFinancialEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BOOKING_FROM_EMAIL?.trim();
  if (!apiKey || !from) return;

  try {
    await fetch("https://api.resend.com/emails", {
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
  } catch (error) {
    console.error("[financial-notifications]", error);
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
  });
}

export async function notifyQuoteAcceptedAdmin(input: {
  companyId: string;
  quoteNumber: string;
  customerName: string;
}): Promise<void> {
  const adminEmail = await getCompanyContactEmail(input.companyId);
  if (!adminEmail) return;
  await sendFinancialEmail({
    to: adminEmail,
    subject: `Quote ${input.quoteNumber} accepted`,
    html: `<p><strong>${input.customerName}</strong> accepted quote <strong>${input.quoteNumber}</strong>.</p>`,
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
  });

  const adminEmail = await getCompanyContactEmail(input.companyId);
  if (adminEmail) {
    await sendFinancialEmail({
      to: adminEmail,
      subject: `Invoice ${input.invoiceNumber} paid`,
      html: `<p>Payment of <strong>${formatRevenue(input.amountCents)}</strong> received for invoice <strong>${input.invoiceNumber}</strong> from <strong>${input.customerName}</strong>.</p>`,
    });
  }
}

export async function notifyPaymentFailedAdmin(input: {
  companyId: string;
  invoiceNumber: string;
  customerName: string;
}): Promise<void> {
  const adminEmail = await getCompanyContactEmail(input.companyId);
  if (!adminEmail) return;
  await sendFinancialEmail({
    to: adminEmail,
    subject: `Payment failed — ${input.invoiceNumber}`,
    html: `<p>A payment attempt for invoice <strong>${input.invoiceNumber}</strong> from <strong>${input.customerName}</strong> failed.</p>`,
  });
}

export async function notifyInvoiceOverdue(input: {
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
  });
}
