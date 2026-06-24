import { DEFAULT_CUSTOMER_SEGMENTS } from "@/lib/customers/segment-definitions";
import {
  createEmailCampaign,
  sendEmailCampaignToSegment,
} from "@/lib/services/email-campaigns";
import { getSegmentCustomers, listCustomerSegments } from "@/lib/services/customer-segments";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { createClient } from "@/lib/supabase/server";

export type RetentionCampaignRecord = {
  id: string;
  companyId: string;
  name: string;
  campaignType: string;
  segmentId: string | null;
  segmentType: string | null;
  messageTemplate: string | null;
  enabled: boolean;
  lastRunAt: string | null;
  createdAt: string;
};

function mapRow(row: Record<string, unknown>): RetentionCampaignRecord {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    name: row.name as string,
    campaignType: row.campaign_type as string,
    segmentId: (row.segment_id as string) ?? null,
    segmentType: null,
    messageTemplate: (row.message_template as string) ?? null,
    enabled: Boolean(row.enabled),
    lastRunAt: (row.last_run_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function listRetentionCampaignsWithSegments(
  companyId: string
): Promise<RetentionCampaignRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const [campaigns, segments] = await Promise.all([
    listRetentionCampaignsRaw(companyId),
    listCustomerSegments(companyId),
  ]);

  return campaigns.map((campaign) => {
    const segment = segments.find((item) => item.id === campaign.segmentId);
    return {
      ...campaign,
      segmentType: segment?.segmentType ?? null,
    };
  });
}

async function listRetentionCampaignsRaw(companyId: string): Promise<RetentionCampaignRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("retention_campaigns")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[retention] list", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function createRetentionCampaign(input: {
  companyId: string;
  name: string;
  campaignType: "win_back" | "service_reminder" | "seasonal" | "loyalty";
  segmentType: string;
  subject: string;
  bodyHtml: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };

  const segments = await listCustomerSegments(input.companyId);
  const segment = segments.find((item) => item.segmentType === input.segmentType);
  if (!segment) return { ok: false, error: "Segment not found." };

  const segmentId = segment.id.includes("-") ? segment.id : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("retention_campaigns")
    .insert({
      company_id: input.companyId,
      name: input.name.trim(),
      campaign_type: input.campaignType,
      segment_id: segmentId,
      message_template: JSON.stringify({
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        segmentType: input.segmentType,
        criteria: segment.criteria,
      }),
      enabled: true,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create retention campaign." };
  }

  return { ok: true, id: data.id as string };
}

export async function runRetentionCampaign(input: {
  companyId: string;
  campaignId: string;
}): Promise<{ ok: true; sentCount: number } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { data: campaign, error } = await admin.client
    .from("retention_campaigns")
    .select("*")
    .eq("id", input.campaignId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (error || !campaign) {
    return { ok: false, error: error?.message ?? "Campaign not found." };
  }

  let template: {
    subject?: string;
    bodyHtml?: string;
    segmentType?: string;
    criteria?: unknown;
  } = {};

  try {
    template = JSON.parse((campaign.message_template as string) ?? "{}") as typeof template;
  } catch {
    return { ok: false, error: "Invalid campaign template." };
  }

  const segmentType = template.segmentType ?? "inactive";
  const criteria =
    template.criteria ??
    DEFAULT_CUSTOMER_SEGMENTS.find((item) => item.segmentType === segmentType)?.criteria ??
    {};

  const audience = await getSegmentCustomers(input.companyId, segmentType, criteria);
  if (audience.length === 0) {
    return { ok: false, error: "No customers in this segment with email addresses." };
  }

  const subject = template.subject?.trim() || `We miss you — ${campaign.name}`;
  const bodyHtml =
    template.bodyHtml?.trim() ||
    "<p>We would love to serve you again. Reply or book online anytime.</p>";

  const created = await createEmailCampaign(input.companyId, {
    name: `${campaign.name} (${new Date().toLocaleDateString("en-ZA")})`,
    campaignType: "reactivation",
    subject,
    bodyHtml,
    utmCampaign: `retention-${campaign.campaign_type}`,
  });

  if (!created.ok) return created;

  const sent = await sendEmailCampaignToSegment(input.companyId, created.id, {
    segmentType,
    criteria,
  });

  if (!sent.ok) return sent;

  await admin.client
    .from("retention_campaigns")
    .update({ last_run_at: new Date().toISOString() })
    .eq("id", input.campaignId);

  return sent;
}

export async function toggleRetentionCampaign(input: {
  companyId: string;
  campaignId: string;
  enabled: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("retention_campaigns")
    .update({ enabled: input.enabled })
    .eq("id", input.campaignId)
    .eq("company_id", input.companyId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
