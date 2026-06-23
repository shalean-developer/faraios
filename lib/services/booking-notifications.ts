import { logBookingActivity } from "@/lib/services/booking-activities";
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
    console.error("[booking-notifications] sendBookingEmail", error);
  }
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
  if (adminEmail) {
    await sendBookingEmail({
      to: adminEmail,
      subject: `New booking request — ${payload.customerName}`,
      html: `<p><strong>${payload.customerName}</strong> requested <strong>${payload.serviceName}</strong>.</p>
        <p>Date: ${new Date(payload.bookingDate).toLocaleString("en-ZA")}</p>
        <p>Source: ${payload.source}</p>`,
    });
  }

  if (payload.customerEmail) {
    await sendBookingEmail({
      to: payload.customerEmail,
      subject: "We received your booking request",
      html: `<p>Hi ${payload.customerName},</p>
        <p>Your booking request for <strong>${payload.serviceName}</strong> was received.</p>
        <p>We'll confirm your appointment shortly.</p>`,
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

  const label = input.status.replace(/_/g, " ");
  await sendBookingEmail({
    to: input.customerEmail,
    subject: `Booking update: ${label}`,
    html: `<p>Hi ${input.customerName ?? "there"},</p>
      <p>Your booking${input.serviceName ? ` for <strong>${input.serviceName}</strong>` : ""} is now <strong>${label}</strong>.</p>`,
  });
}
