import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { CampaignType, EmailCampaign } from "@/types/growth-engine";

export type EmailCampaignInput = {
  name: string;
  campaignType?: CampaignType;
  subject: string;
  bodyHtml: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

function mapRow(row: Record<string, unknown>): EmailCampaign {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    name: row.name as string,
    campaign_type: row.campaign_type as EmailCampaign["campaign_type"],
    subject: row.subject as string,
    body_html: row.body_html as string,
    status: row.status as EmailCampaign["status"],
    sent_count: (row.sent_count as number) ?? 0,
    open_count: (row.open_count as number) ?? 0,
    click_count: (row.click_count as number) ?? 0,
    bookings_generated: (row.bookings_generated as number) ?? 0,
    revenue_generated_cents: (row.revenue_generated_cents as number) ?? 0,
    utm_source: (row.utm_source as string) ?? null,
    utm_medium: (row.utm_medium as string) ?? null,
    utm_campaign: (row.utm_campaign as string) ?? null,
    sent_at: (row.sent_at as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listEmailCampaigns(companyId: string): Promise<EmailCampaign[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  return (data ?? []).map(mapRow);
}

export async function createEmailCampaign(
  companyId: string,
  input: EmailCampaignInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({
      company_id: companyId,
      name: input.name,
      campaign_type: input.campaignType ?? "promotion",
      subject: input.subject,
      body_html: input.bodyHtml,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? "email",
      utm_campaign: input.utmCampaign ?? input.name.toLowerCase().replace(/\s+/g, "-"),
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create campaign." };
  return { ok: true, id: data.id as string };
}

export async function sendEmailCampaign(
  companyId: string,
  campaignId: string
): Promise<{ ok: true; sentCount: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!campaign) return { ok: false, error: "Campaign not found." };
  if (campaign.status === "sent") return { ok: false, error: "Campaign already sent." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Email service not configured." };

  const { data: customers } = await admin.client
    .from("customers")
    .select("email, name")
    .eq("company_id", companyId)
    .not("email", "is", null);

  const { data: unsubscribes } = await admin.client
    .from("email_unsubscribes")
    .select("email")
    .eq("company_id", companyId);

  const unsubSet = new Set(
    (unsubscribes ?? []).map((u) => (u.email as string).toLowerCase())
  );

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BOOKING_FROM_EMAIL?.trim();
  if (!apiKey || !from) return { ok: false, error: "Email provider not configured." };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  let sentCount = 0;

  for (const customer of customers ?? []) {
    const email = (customer.email as string)?.trim();
    if (!email || unsubSet.has(email.toLowerCase())) continue;

    const unsubscribeUrl = `${appUrl}/api/public/unsubscribe?companyId=${encodeURIComponent(companyId)}&email=${encodeURIComponent(email)}`;
    const html = `${campaign.body_html as string}<p style="font-size:12px;color:#888;margin-top:24px;"><a href="${unsubscribeUrl}">Unsubscribe</a></p>`;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: campaign.subject as string,
          html,
        }),
      });
      if (res.ok) sentCount++;
    } catch {
      // continue sending to others
    }
  }

  await supabase
    .from("email_campaigns")
    .update({
      status: "sent",
      sent_count: sentCount,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("company_id", companyId);

  return { ok: true, sentCount };
}

export async function isEmailUnsubscribed(
  companyId: string,
  email: string
): Promise<boolean> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return false;

  const { data } = await admin.client
    .from("email_unsubscribes")
    .select("id")
    .eq("company_id", companyId)
    .ilike("email", email)
    .maybeSingle();

  return Boolean(data);
}

export async function unsubscribeEmail(
  companyId: string,
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Not configured." };

  const existing = await isEmailUnsubscribed(companyId, email);
  if (existing) return { ok: true };

  const { error } = await admin.client.from("email_unsubscribes").insert({
    company_id: companyId,
    email: email.trim().toLowerCase(),
    unsubscribed_at: new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
