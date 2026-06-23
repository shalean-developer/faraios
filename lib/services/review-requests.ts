import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { ReviewRequest } from "@/types/growth-engine";
import { getLocalSeoSettingsAdmin } from "@/lib/services/local-seo";

function mapRow(row: Record<string, unknown>): ReviewRequest {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    customer_id: (row.customer_id as string) ?? null,
    booking_id: (row.booking_id as string) ?? null,
    customer_email: (row.customer_email as string) ?? null,
    customer_name: (row.customer_name as string) ?? null,
    status: row.status as ReviewRequest["status"],
    sent_at: row.sent_at as string,
    clicked_at: (row.clicked_at as string) ?? null,
    created_at: row.created_at as string,
  };
}

async function sendReviewEmail(input: {
  to: string;
  businessName: string;
  reviewLink: string;
  customerName: string;
  trackingUrl: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BOOKING_FROM_EMAIL?.trim();
  if (!apiKey || !from) return false;

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
        subject: `How was your experience with ${input.businessName}?`,
        html: `
          <p>Hi ${input.customerName},</p>
          <p>Thank you for choosing ${input.businessName}. We'd love to hear about your experience.</p>
          <p><a href="${input.trackingUrl}">Leave us a review on Google</a></p>
          <p>Your feedback helps us serve you better.</p>
        `,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listReviewRequests(companyId: string): Promise<ReviewRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("review_requests")
    .select("*")
    .eq("company_id", companyId)
    .order("sent_at", { ascending: false })
    .limit(50);

  return (data ?? []).map(mapRow);
}

export async function sendReviewRequest(input: {
  companyId: string;
  bookingId?: string;
  customerId?: string;
  customerEmail: string;
  customerName: string;
  businessName: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const settings = await getLocalSeoSettingsAdmin(input.companyId);
  const reviewLink = settings?.google_review_link?.trim();
  if (!reviewLink) {
    return { ok: false, error: "Google review link is not configured in SEO settings." };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Email service not configured." };

  const { data: unsub } = await admin.client
    .from("email_unsubscribes")
    .select("id")
    .eq("company_id", input.companyId)
    .ilike("email", input.customerEmail)
    .maybeSingle();

  if (unsub) {
    return { ok: false, error: "Customer has unsubscribed from emails." };
  }

  const { data: row, error } = await admin.client
    .from("review_requests")
    .insert({
      company_id: input.companyId,
      booking_id: input.bookingId ?? null,
      customer_id: input.customerId ?? null,
      customer_email: input.customerEmail,
      customer_name: input.customerName,
      status: "sent",
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Failed to record review request." };
  }

  const requestId = row.id as string;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const trackingUrl = `${appUrl}/api/public/review-click?requestId=${encodeURIComponent(requestId)}&redirect=${encodeURIComponent(reviewLink)}`;

  const sent = await sendReviewEmail({
    to: input.customerEmail,
    businessName: input.businessName,
    reviewLink,
    customerName: input.customerName,
    trackingUrl,
  });

  if (!sent) {
    await admin.client
      .from("review_requests")
      .update({ status: "failed" })
      .eq("id", requestId);
    return { ok: false, error: "Failed to send review request email." };
  }

  return { ok: true, id: requestId };
}

export async function maybeAutoSendReviewRequest(input: {
  companyId: string;
  bookingId: string;
  customerEmail?: string | null;
  customerName?: string | null;
  businessName: string;
}): Promise<void> {
  if (!input.customerEmail?.trim()) return;

  const settings = await getLocalSeoSettingsAdmin(input.companyId);
  if (!settings?.auto_review_request_enabled) return;

  await sendReviewRequest({
    companyId: input.companyId,
    bookingId: input.bookingId,
    customerEmail: input.customerEmail.trim(),
    customerName: input.customerName?.trim() || "there",
    businessName: input.businessName,
  });
}

export async function markReviewRequestClicked(requestId: string): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  await admin.client
    .from("review_requests")
    .update({
      status: "clicked",
      clicked_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "sent");
}
