import { clickAnalyticsKey } from "@/lib/website-builder/click-tracking";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { titleLengthStatus, descriptionLengthStatus } from "@/lib/website-builder/seo";
import type { BuilderWebsite, WebsiteServicePageRecord } from "@/types/website-builder";
import type {
  BuilderAnalytics,
  BuilderClickAnalytics,
  BuilderPageAnalytics,
  WebVitalName,
  WebVitalRating,
  WebVitalSummary,
} from "@/types/website-builder-analytics";

const CONVERSION_EVENTS = new Set([
  "contact_submission",
  "booking_submission",
  "quote_request",
]);

const DEFAULT_PERIOD_DAYS = 30;

type TrackingRow = {
  event_type: string;
  source_url: string | null;
  referrer: string | null;
  utm_source: string | null;
  device_type: string | null;
  metadata: Record<string, unknown> | null;
};

export function extractPathFromUrl(url: string | null): string {
  if (!url?.trim()) return "/";
  try {
    const parsed = new URL(url);
    return parsed.pathname || "/";
  } catch {
    if (url.startsWith("/")) return url.split("?")[0] || "/";
    return "/";
  }
}

export function computePageSeoScore(input: {
  title: string | null;
  description: string | null;
}): number {
  let score = 0;
  const title = input.title?.trim() ?? "";
  const description = input.description?.trim() ?? "";

  if (title) score += 35;
  if (description) score += 35;
  if (title && titleLengthStatus(title.length) === "good") score += 15;
  if (description && descriptionLengthStatus(description.length) === "good") score += 15;

  return Math.min(100, score);
}

export function webVitalRating(name: WebVitalName, value: number): WebVitalRating {
  if (name === "LCP") {
    if (value <= 2500) return "good";
    if (value <= 4000) return "needs-improvement";
    return "poor";
  }
  if (name === "CLS") {
    if (value <= 0.1) return "good";
    if (value <= 0.25) return "needs-improvement";
    return "poor";
  }
  if (name === "INP") {
    if (value <= 200) return "good";
    if (value <= 500) return "needs-improvement";
    return "poor";
  }
  if (name === "FCP") {
    if (value <= 1800) return "good";
    if (value <= 3000) return "needs-improvement";
    return "poor";
  }
  if (value <= 800) return "good";
  if (value <= 1800) return "needs-improvement";
  return "poor";
}

export function percentile75(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.75) - 1;
  return Math.round(sorted[Math.max(0, index)] * 100) / 100;
}

function referrerLabel(referrer: string | null, utmSource: string | null): string {
  if (utmSource?.trim()) return utmSource.trim();
  if (!referrer?.trim()) return "Direct";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer.slice(0, 48);
  }
}

export function buildBuilderPageCatalog(input: {
  website: BuilderWebsite;
  servicePages: WebsiteServicePageRecord[];
  companySlug: string;
}): BuilderPageAnalytics[] {
  const pages: BuilderPageAnalytics[] = [
    {
      path: `/site/${input.companySlug}`,
      label: "Home",
      views: 0,
      clicks: 0,
      conversions: 0,
      conversionRate: 0,
      seoScore: computePageSeoScore({
        title: input.website.seo_title,
        description: input.website.seo_description,
      }),
    },
    {
      path: `/site/${input.companySlug}/blog`,
      label: "Blog",
      views: 0,
      clicks: 0,
      conversions: 0,
      conversionRate: 0,
      seoScore: computePageSeoScore({
        title: input.website.seo_title ? `${input.website.seo_title} — Blog` : "Blog",
        description: input.website.seo_description,
      }),
    },
  ];

  for (const page of input.servicePages) {
    if (page.status !== "published") continue;
    pages.push({
      path: `/site/${input.companySlug}/services/${page.slug}`,
      label: page.title,
      views: 0,
      clicks: 0,
      conversions: 0,
      conversionRate: 0,
      seoScore: computePageSeoScore({
        title: page.seo_title ?? page.title,
        description: page.seo_description ?? page.description,
      }),
    });
  }

  return pages;
}

export function aggregateBuilderAnalytics(input: {
  events: TrackingRow[];
  pages: BuilderPageAnalytics[];
}): BuilderAnalytics {
  const pageByPath = new Map(input.pages.map((page) => [page.path, { ...page }]));
  const referrerMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const vitalSamples = new Map<WebVitalName, number[]>();
  const clickMap = new Map<string, BuilderClickAnalytics>();

  let totalViews = 0;
  let totalClicks = 0;
  let totalConversions = 0;

  for (const event of input.events) {
    const path = extractPathFromUrl(event.source_url);
    const page = pageByPath.get(path);

    if (event.event_type === "page_visit") {
      totalViews += 1;
      if (page) page.views += 1;

      const referrer = referrerLabel(event.referrer, event.utm_source);
      referrerMap.set(referrer, (referrerMap.get(referrer) ?? 0) + 1);

      const device = event.device_type?.trim() || "unknown";
      deviceMap.set(device, (deviceMap.get(device) ?? 0) + 1);
    }

    if (event.event_type === "click") {
      totalClicks += 1;
      if (page) page.clicks += 1;

      const label = typeof event.metadata?.label === "string" ? event.metadata.label : "Click";
      const href = typeof event.metadata?.href === "string" ? event.metadata.href : null;
      const element =
        event.metadata?.element === "button" ? "button" : ("link" as const);
      const key = clickAnalyticsKey({ label, href, element });
      const existing = clickMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        clickMap.set(key, { label, href, element, count: 1 });
      }
    }

    if (CONVERSION_EVENTS.has(event.event_type)) {
      totalConversions += 1;
      if (page) page.conversions += 1;
    }

    if (event.event_type === "web_vital") {
      const name = event.metadata?.name;
      const value = event.metadata?.value;
      if (
        typeof name === "string" &&
        ["LCP", "CLS", "INP", "FCP", "TTFB"].includes(name) &&
        typeof value === "number" &&
        Number.isFinite(value)
      ) {
        const vitalName = name as WebVitalName;
        const samples = vitalSamples.get(vitalName) ?? [];
        samples.push(value);
        vitalSamples.set(vitalName, samples);
      }
    }
  }

  const pages = [...pageByPath.values()].map((page) => ({
    ...page,
    conversionRate: page.views > 0 ? Math.round((page.conversions / page.views) * 1000) / 10 : 0,
  }));

  pages.sort((a, b) => b.views - a.views);

  const webVitals: WebVitalSummary[] = (["LCP", "CLS", "INP", "FCP", "TTFB"] as WebVitalName[])
    .map((name) => {
      const samples = vitalSamples.get(name) ?? [];
      const p75 = percentile75(samples);
      return {
        name,
        p75,
        rating: samples.length > 0 ? webVitalRating(name, p75) : "needs-improvement",
        sampleCount: samples.length,
      };
    })
    .filter((vital) => vital.sampleCount > 0);

  const conversionRate =
    totalViews > 0 ? Math.round((totalConversions / totalViews) * 1000) / 10 : 0;

  return {
    periodDays: DEFAULT_PERIOD_DAYS,
    totalViews,
    totalClicks,
    totalConversions,
    conversionRate,
    pages,
    topClicks: Array.from(clickMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    webVitals,
    topReferrers: Array.from(referrerMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    deviceBreakdown: Array.from(deviceMap.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count),
    hasData:
      totalViews > 0 || totalClicks > 0 || totalConversions > 0 || webVitals.length > 0,
  };
}

export async function getBuilderAnalytics(input: {
  companyId: string;
  website: BuilderWebsite;
  servicePages: WebsiteServicePageRecord[];
  companySlug: string;
  periodDays?: number;
}): Promise<BuilderAnalytics> {
  const periodDays = input.periodDays ?? DEFAULT_PERIOD_DAYS;
  const pages = buildBuilderPageCatalog({
    website: input.website,
    servicePages: input.servicePages,
    companySlug: input.companySlug,
  });

  const empty = aggregateBuilderAnalytics({ events: [], pages });
  empty.periodDays = periodDays;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return empty;

  const since = new Date();
  since.setDate(since.getDate() - periodDays);

  const { data, error } = await admin.client
    .from("website_tracking_events")
    .select("event_type, source_url, referrer, utm_source, device_type, metadata")
    .eq("company_id", input.companyId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("[builder_analytics]", error.message);
    return empty;
  }

  const result = aggregateBuilderAnalytics({
    events: (data ?? []) as TrackingRow[],
    pages,
  });
  result.periodDays = periodDays;
  return result;
}

export function formatWebVitalValue(name: WebVitalName, value: number): string {
  if (name === "CLS") return value.toFixed(3);
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}
