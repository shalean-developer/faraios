import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { WebsiteTrackingEventType } from "@/types/website-engine";

export type TrackWebsiteEventInput = {
  companyId: string;
  eventType: WebsiteTrackingEventType;
  websiteId?: string | null;
  connectedWebsiteId?: string | null;
  sourceUrl?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  deviceType?: string | null;
  metadata?: Record<string, unknown>;
};

export async function trackWebsiteEvent(
  input: TrackWebsiteEventInput
): Promise<{ ok: true; eventId: string } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: "Tracking is not configured." };
  }

  const { data, error } = await admin.client
    .from("website_tracking_events")
    .insert({
      company_id: input.companyId,
      website_id: input.websiteId ?? null,
      connected_website_id: input.connectedWebsiteId ?? null,
      event_type: input.eventType,
      source_url: input.sourceUrl ?? null,
      referrer: input.referrer ?? null,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      device_type: input.deviceType ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to record event." };
  }

  return { ok: true, eventId: data.id as string };
}

export async function getRecentTrackingEvents(
  companyId: string,
  limit = 20
): Promise<
  {
    id: string;
    event_type: string;
    source_url: string | null;
    referrer: string | null;
    utm_source: string | null;
    created_at: string;
  }[]
> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("website_tracking_events")
    .select("id, event_type, source_url, referrer, utm_source, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export function parseUtmFromUrl(url: string): {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
} {
  try {
    const parsed = new URL(url);
    return {
      utmSource: parsed.searchParams.get("utm_source"),
      utmMedium: parsed.searchParams.get("utm_medium"),
      utmCampaign: parsed.searchParams.get("utm_campaign"),
    };
  } catch {
    return { utmSource: null, utmMedium: null, utmCampaign: null };
  }
}

export function detectDeviceType(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad/.test(ua)) return "mobile";
  if (/tablet/.test(ua)) return "tablet";
  return "desktop";
}
