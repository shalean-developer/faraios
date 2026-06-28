import { companyAllowsNotificationEmail } from "@/lib/services/company-notification-preferences";
import { sendResendEmail } from "@/lib/email/resend";
import { logPlatformEmail } from "@/lib/platform/email-log";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

type BookingNotificationPayload = {
  companyId: string;
  bookingId: string;
  customerName: string;
  customerEmail?: string;
  serviceName: string;
  bookingDate: string;
  customResponses?: Record<string, unknown>;
  source: string;
};

async function getCompanyContactEmail(companyId: string): Promise<string | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("companies")
    .select("primary_contact_email")
    .eq("id", companyId)
    .maybeSingle();

  return data?.primary_contact_email ?? null;
}

async function sendBookingEmail(input: {
  to: string;
  subject: string;
  html: string;
  companyId?: string;
  template?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BOOKING_FROM_EMAIL?.trim();
  const template = input.template ?? "booking";

  if (!apiKey || !from) {
    await logPlatformEmail({
      to: input.to,
      subject: input.subject,
      template,
      status: "failed",
      companyId: input.companyId,
      errorMessage: "Missing RESEND_API_KEY or BOOKING_FROM_EMAIL",
    });
    return;
  }

  const result = await sendResendEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    from,
  });

  if (!result.ok) {
    await logPlatformEmail({
      to: input.to,
      subject: input.subject,
      template,
      status: "failed",
      companyId: input.companyId,
      errorMessage: result.errorMessage,
    });
    return;
  }

  await logPlatformEmail({
    to: input.to,
    subject: input.subject,
    template,
    status: "sent",
    companyId: input.companyId,
  });
}

export async function notifyBookingCreated(
  payload: BookingNotificationPayload
): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.info("[booking-notifications] created", {
      bookingId: payload.bookingId,
      companyId: payload.companyId,
      customer: payload.customerName,
      source: payload.source,
    });
  }

  const adminEmail = await getCompanyContactEmail(payload.companyId);
  const alertsEnabled = await companyAllowsNotificationEmail(
    payload.companyId,
    "emailBookingAlerts"
  );
  if (adminEmail && alertsEnabled) {
    await sendBookingEmail({
      to: adminEmail,
      subject: `New booking request — ${payload.customerName}`,
      html: `<p><strong>${payload.customerName}</strong> requested <strong>${payload.serviceName}</strong>.</p>
        <p>Date: ${new Date(payload.bookingDate).toLocaleString("en-ZA")}</p>
        <p>Source: ${payload.source}</p>`,
      companyId: payload.companyId,
      template: "booking_created_admin",
    });
  }

  if (payload.customerEmail) {
    await sendBookingEmail({
      to: payload.customerEmail,
      subject: "We received your booking request",
      html: `<p>Hi ${payload.customerName},</p>
        <p>Your booking request for <strong>${payload.serviceName}</strong> was received.</p>
        <p>We'll confirm your appointment shortly.</p>`,
      companyId: payload.companyId,
      template: "booking_created_customer",
    });
  }
}

export async function notifyBookingStatusChanged(input: {
  companyId: string;
  bookingId: string;
  status: string;
  customerEmail?: string | null;
  customerName?: string | null;
  serviceName?: string | null;
}): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.info("[booking-notifications] status", input);
  }

  if (!input.customerEmail) return;

  const alertsEnabled = await companyAllowsNotificationEmail(
    input.companyId,
    "emailBookingAlerts"
  );
  if (!alertsEnabled) return;

  const label = input.status.replace(/_/g, " ");
  await sendBookingEmail({
    to: input.customerEmail,
    subject: `Booking update: ${label}`,
    html: `<p>Hi ${input.customerName ?? "there"},</p>
      <p>Your booking${input.serviceName ? ` for <strong>${input.serviceName}</strong>` : ""} is now <strong>${label}</strong>.</p>`,
    companyId: input.companyId,
    template: "booking_status_changed",
  });
}
