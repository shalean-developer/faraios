import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { MarketingAnalytics } from "@/types/growth-engine";

export async function getMarketingAnalytics(
  companyId: string
): Promise<MarketingAnalytics> {
  const empty: MarketingAnalytics = {
    websiteVisits: 0,
    leads: 0,
    bookings: 0,
    quoteRequests: 0,
    conversionRate: 0,
    topSources: [],
    topServicePages: [],
    reviewRequestsSent: 0,
    campaignPerformance: [],
    campaignRevenueCents: 0,
  };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return empty;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString();

  const visitQuery = admin.client
    .from("website_tracking_events")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("event_type", "page_visit")
    .gte("created_at", since);

  const leadQuery = admin.client
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", since);

  const bookingCountQuery = admin.client
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", since);

  const quoteQuery = admin.client
    .from("website_tracking_events")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("event_type", "quote_request")
    .gte("created_at", since);

  const bookingsQuery = admin.client
    .from("bookings")
    .select("utm_source, source, source_website")
    .eq("company_id", companyId)
    .gte("created_at", since);

  const eventsQuery = admin.client
    .from("website_tracking_events")
    .select("source_url, event_type")
    .eq("company_id", companyId)
    .gte("created_at", since)
    .in("event_type", ["page_visit", "booking_form_view"]);

  const reviewQuery = admin.client
    .from("review_requests")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("sent_at", since);

  const campaignsQuery = admin.client
    .from("email_campaigns")
    .select("name, sent_count, bookings_generated, revenue_generated_cents, status")
    .eq("company_id", companyId)
    .eq("status", "sent");

  const [
    visitResult,
    leadResult,
    bookingCountResult,
    quoteResult,
    bookingsResult,
    eventsResult,
    reviewResult,
    campaignsResult,
  ] = await Promise.all([
    visitQuery,
    leadQuery,
    bookingCountQuery,
    quoteQuery,
    bookingsQuery,
    eventsQuery,
    reviewQuery,
    campaignsQuery,
  ]);

  for (const [label, result] of [
    ["website_tracking_events visits", visitResult],
    ["leads", leadResult],
    ["bookings count", bookingCountResult],
    ["quote requests", quoteResult],
    ["bookings attribution", bookingsResult],
    ["tracking events", eventsResult],
    ["review_requests", reviewResult],
    ["email_campaigns", campaignsResult],
  ] as const) {
    if (result.error) {
      console.error(`[marketing_analytics] ${label}`, result.error.message);
    }
  }

  const visitCount = visitResult.count;
  const leadCount = leadResult.count;
  const bookingCount = bookingCountResult.count;
  const quoteRequestCount = quoteResult.count;
  const bookings = bookingsResult.data;
  const events = eventsResult.data;
  const reviewCount = reviewResult.count;
  const campaigns = campaignsResult.data;

  const sourceMap = new Map<string, number>();
  for (const b of bookings ?? []) {
    const src =
      (b.utm_source as string)?.trim() ||
      (b.source as string)?.trim() ||
      (b.source_website as string)?.trim() ||
      "direct";
    sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);
  }

  const pageMap = new Map<string, number>();
  for (const e of events ?? []) {
    const url = (e.source_url as string) ?? "unknown";
    let path = url;
    try {
      path = new URL(url).pathname;
    } catch {
      // keep raw
    }
    pageMap.set(path, (pageMap.get(path) ?? 0) + 1);
  }

  const visits = visitCount ?? 0;
  const bookingsTotal = bookingCount ?? 0;
  const conversionRate =
    visits > 0 ? Math.round((bookingsTotal / visits) * 1000) / 10 : 0;

  const campaignPerformance = (campaigns ?? []).map((c) => ({
    name: c.name as string,
    sentCount: (c.sent_count as number) ?? 0,
    bookingsGenerated: (c.bookings_generated as number) ?? 0,
    revenueCents: (c.revenue_generated_cents as number) ?? 0,
  }));

  const campaignRevenueCents = campaignPerformance.reduce(
    (sum, c) => sum + c.revenueCents,
    0
  );

  return {
    websiteVisits: visits,
    leads: leadCount ?? 0,
    bookings: bookingsTotal,
    quoteRequests: quoteRequestCount ?? 0,
    conversionRate,
    topSources: Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topServicePages: Array.from(pageMap.entries())
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    reviewRequestsSent: reviewCount ?? 0,
    campaignPerformance,
    campaignRevenueCents,
  };
}

export type MarketingAnalyticsSummary = {
  leadToBookingRate: number;
  visitToLeadRate: number;
  hasActivity: boolean;
  topSource: string | null;
  topPage: string | null;
};

export function summarizeMarketingAnalytics(
  analytics: MarketingAnalytics
): MarketingAnalyticsSummary {
  const leadToBookingRate =
    analytics.leads > 0
      ? Math.round((analytics.bookings / analytics.leads) * 1000) / 10
      : 0;
  const visitToLeadRate =
    analytics.websiteVisits > 0
      ? Math.round((analytics.leads / analytics.websiteVisits) * 1000) / 10
      : 0;

  return {
    leadToBookingRate,
    visitToLeadRate,
    hasActivity:
      analytics.websiteVisits > 0 ||
      analytics.leads > 0 ||
      analytics.bookings > 0 ||
      analytics.campaignPerformance.length > 0,
    topSource: analytics.topSources[0]?.source ?? null,
    topPage: analytics.topServicePages[0]?.page ?? null,
  };
}
