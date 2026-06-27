import { NextResponse } from "next/server";

import { withPlatformApiLog } from "@/lib/platform/with-api-log";
import {
  detectDeviceType,
  parseUtmFromUrl,
  trackWebsiteEvent,
} from "@/lib/services/website-tracking";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { WebsiteTrackingEventType } from "@/types/website-engine";

const TRACKING_LIMIT = 60;
const CLICK_TRACKING_LIMIT = 200;
const TRACKING_WINDOW_MS = 60 * 1000;

const VALID_EVENTS: WebsiteTrackingEventType[] = [
  "page_visit",
  "booking_form_view",
  "booking_submission",
  "quote_request",
  "contact_submission",
  "web_vital",
  "click",
];

export async function POST(request: Request) {
  const route = "/api/public/tracking";

  return withPlatformApiLog(
    request,
    route,
    async () => {
      let body: {
        businessId?: string;
        websiteId?: string;
        eventType?: string;
        sourceUrl?: string;
        referrer?: string;
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        metadata?: Record<string, unknown>;
      };

      try {
        body = (await request.json()) as typeof body;
      } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
      }

      const businessId = body.businessId?.trim();
      const eventType = body.eventType as WebsiteTrackingEventType | undefined;

      if (!businessId || !eventType || !VALID_EVENTS.includes(eventType)) {
        return NextResponse.json(
          { ok: false, error: "businessId and valid eventType are required." },
          { status: 400 }
        );
      }

      const limited = rateLimit(
        `tracking${eventType === "click" ? "-click" : ""}:${getClientIp(request)}:${businessId}`,
        eventType === "click" ? CLICK_TRACKING_LIMIT : TRACKING_LIMIT,
        TRACKING_WINDOW_MS
      );
      if (!limited.ok) {
        return NextResponse.json(
          { ok: false, error: "Rate limit exceeded." },
          { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
        );
      }

      const admin = tryCreateAdminClient();
      if (!admin.ok) {
        return NextResponse.json({ ok: false, error: "API not configured." }, { status: 503 });
      }

      const { data: company } = await admin.client
        .from("companies")
        .select("id")
        .eq("id", businessId)
        .maybeSingle();

      if (!company) {
        return NextResponse.json({ ok: false, error: "Business not found." }, { status: 404 });
      }

      const { data: connected } = await admin.client
        .from("connected_websites")
        .select("tracking_enabled")
        .eq("company_id", businessId)
        .maybeSingle();

      if (connected && connected.tracking_enabled === false) {
        return NextResponse.json({ ok: false, error: "Tracking is disabled." }, { status: 403 });
      }

      const sourceUrl = body.sourceUrl ?? request.headers.get("referer") ?? null;
      const utm = sourceUrl
        ? parseUtmFromUrl(sourceUrl)
        : {
            utmSource: null,
            utmMedium: null,
            utmCampaign: null,
          };

      const userAgent = request.headers.get("user-agent");

      const result = await trackWebsiteEvent({
        companyId: businessId,
        websiteId: body.websiteId?.trim() || null,
        eventType,
        sourceUrl,
        referrer: body.referrer ?? request.headers.get("referer"),
        utmSource: body.utmSource ?? utm.utmSource,
        utmMedium: body.utmMedium ?? utm.utmMedium,
        utmCampaign: body.utmCampaign ?? utm.utmCampaign,
        deviceType: detectDeviceType(userAgent),
        metadata: body.metadata ?? {},
      });

      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
      }

      return NextResponse.json({ ok: true, eventId: result.eventId });
    },
    { isPublic: true }
  );
}
