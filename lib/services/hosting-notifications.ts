import { createAdminClient, tryCreateAdminClient } from "@/lib/supabase/admin";

async function getCompanyEmail(companyId: string): Promise<string | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("companies")
    .select("primary_contact_email, name")
    .eq("id", companyId)
    .maybeSingle();

  return data?.primary_contact_email?.trim() || null;
}

async function getAdminAlertEmails(): Promise<string[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data: admins } = await admin.client.from("platform_admins").select("user_id");
  if (!admins?.length) return [];

  const emails: string[] = [];
  for (const row of admins) {
    const { data: user } = await admin.client.auth.admin.getUserById(row.user_id);
    if (user?.user?.email) emails.push(user.user.email);
  }
  return emails;
}

async function logHostingEmail(input: {
  companyId?: string;
  orderId?: string;
  serviceId?: string;
  templateKey: string;
  recipient: string;
  subject: string;
  status: "sent" | "failed";
  errorMessage?: string;
}) {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  await admin.client.from("hosting_email_logs").insert({
    company_id: input.companyId ?? null,
    order_id: input.orderId ?? null,
    service_id: input.serviceId ?? null,
    template_key: input.templateKey,
    recipient: input.recipient,
    subject: input.subject,
    status: input.status,
    error_message: input.errorMessage ?? null,
  });
}

async function sendHostingEmail(input: {
  to: string;
  subject: string;
  html: string;
  companyId?: string;
  orderId?: string;
  serviceId?: string;
  templateKey: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BOOKING_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    await logHostingEmail({
      ...input,
      recipient: input.to,
      status: "failed",
      errorMessage: "Missing RESEND_API_KEY or BOOKING_FROM_EMAIL",
    });
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
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

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      await logHostingEmail({
        ...input,
        recipient: input.to,
        status: "failed",
        errorMessage: `HTTP ${res.status}: ${body.slice(0, 200)}`,
      });
      return;
    }

    await logHostingEmail({
      ...input,
      recipient: input.to,
      status: "sent",
    });
  } catch (error) {
    await logHostingEmail({
      ...input,
      recipient: input.to,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Send failed",
    });
  }
}

function formatAmount(cents: number): string {
  return `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

export async function notifyHostingOrderReceived(
  companyId: string,
  orderId: string,
  domain: string,
  planName: string
) {
  const email = await getCompanyEmail(companyId);
  if (!email) return;

  await sendHostingEmail({
    to: email,
    subject: "Hosting order received — FaraiOS",
    templateKey: "hosting_order_received",
    companyId,
    orderId,
    html: `<p>We received your hosting order for <strong>${domain}</strong> on the <strong>${planName}</strong> plan.</p><p>Complete payment to start provisioning.</p>`,
  });
}

export async function notifyInvoiceCreated(
  companyId: string,
  invoiceNumber: string,
  amountCents: number
) {
  const email = await getCompanyEmail(companyId);
  if (!email) return;

  await sendHostingEmail({
    to: email,
    subject: `Invoice ${invoiceNumber} — FaraiOS Hosting`,
    templateKey: "invoice_created",
    companyId,
    html: `<p>Invoice <strong>${invoiceNumber}</strong> for ${formatAmount(amountCents)} has been created.</p>`,
  });
}

export async function notifyHostingPaymentSuccessful(
  companyId: string,
  invoiceNumber: string,
  amountCents: number
) {
  const email = await getCompanyEmail(companyId);
  if (!email) return;

  await sendHostingEmail({
    to: email,
    subject: "Payment received — FaraiOS Hosting",
    templateKey: "payment_successful",
    companyId,
    html: `<p>Payment of ${formatAmount(amountCents)} for invoice <strong>${invoiceNumber}</strong> was successful. Your hosting account is being provisioned.</p>`,
  });
}

export async function notifyHostingAccountCreated(
  companyId: string,
  domain: string,
  controlPanelUrl: string
) {
  const email = await getCompanyEmail(companyId);
  if (!email) return;

  await sendHostingEmail({
    to: email,
    subject: "Your hosting account is ready — FaraiOS",
    templateKey: "hosting_account_created",
    companyId,
    html: `<p>Your hosting account for <strong>${domain}</strong> is active.</p><p><a href="${controlPanelUrl}">Open control panel</a></p>`,
  });
}

export async function notifyHostingProvisioningFailedAdmin(
  companyId: string,
  orderId: string,
  error: string
) {
  const admins = await getAdminAlertEmails();
  for (const to of admins) {
    await sendHostingEmail({
      to,
      subject: "Hosting provisioning failed — admin alert",
      templateKey: "provisioning_failed_admin",
      companyId,
      orderId,
      html: `<p>Provisioning failed for order <strong>${orderId}</strong>.</p><p>Error: ${error}</p>`,
    });
  }
}

export async function notifyServiceSuspended(companyId: string, domain: string) {
  const email = await getCompanyEmail(companyId);
  if (!email) return;

  await sendHostingEmail({
    to: email,
    subject: "Hosting service suspended — FaraiOS",
    templateKey: "service_suspended",
    companyId,
    html: `<p>Your hosting service for <strong>${domain}</strong> has been suspended.</p>`,
  });
}

export async function notifyServiceUnsuspended(companyId: string, domain: string) {
  const email = await getCompanyEmail(companyId);
  if (!email) return;

  await sendHostingEmail({
    to: email,
    subject: "Hosting service restored — FaraiOS",
    templateKey: "service_unsuspended",
    companyId,
    html: `<p>Your hosting service for <strong>${domain}</strong> has been restored.</p>`,
  });
}

export async function notifyRenewalReminder(
  companyId: string,
  domain: string,
  dueDate: string
) {
  const email = await getCompanyEmail(companyId);
  if (!email) return;

  await sendHostingEmail({
    to: email,
    subject: "Hosting renewal reminder — FaraiOS",
    templateKey: "renewal_reminder",
    companyId,
    html: `<p>Your hosting for <strong>${domain}</strong> renews on <strong>${dueDate}</strong>.</p>`,
  });
}

export async function notifyCancellationConfirmation(companyId: string, domain: string) {
  const email = await getCompanyEmail(companyId);
  if (!email) return;

  await sendHostingEmail({
    to: email,
    subject: "Hosting cancellation confirmed — FaraiOS",
    templateKey: "cancellation_confirmation",
    companyId,
    html: `<p>Your cancellation request for <strong>${domain}</strong> has been received.</p>`,
  });
}

export async function createHostingSupportTicket(input: {
  companyId: string;
  serviceId?: string;
  subject: string;
  message: string;
  priority?: string;
  userId?: string;
}) {
  const admin = createAdminClient();

  const { data: ticket, error } = await admin
    .from("hosting_support_tickets")
    .insert({
      company_id: input.companyId,
      service_id: input.serviceId ?? null,
      subject: input.subject,
      priority: input.priority ?? "normal",
      status: "open",
    })
    .select("id")
    .single();

  if (error || !ticket) return { ok: false as const, error: error?.message ?? "Failed." };

  await admin.from("hosting_support_messages").insert({
    ticket_id: ticket.id,
    author_user_id: input.userId ?? null,
    is_staff: false,
    body: input.message,
  });

  return { ok: true as const, ticketId: ticket.id };
}
