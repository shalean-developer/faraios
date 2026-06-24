import { NextResponse } from "next/server";

import { withPlatformApiLog } from "@/lib/platform/with-api-log";
import { createLead } from "@/lib/services/leads";
import { createNotification } from "@/lib/services/notifications";
import {
  parseUtmFromUrl,
  trackWebsiteEvent,
} from "@/lib/services/website-tracking";
import { triggerWorkflows } from "@/lib/services/workflow-engine";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

const LEAD_LIMIT = 10;
const LEAD_WINDOW_MS = 15 * 60 * 1000;

type RouteContext = { params: Promise<{ businessId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { businessId } = await context.params;
  const route = `/api/public/business/${businessId}/leads`;

  return withPlatformApiLog(
    request,
    route,
    async () => {
      const limited = rateLimit(
        `public-lead:${getClientIp(request)}:${businessId}`,
        LEAD_LIMIT,
        LEAD_WINDOW_MS
      );
      if (!limited.ok) {
        return NextResponse.json(
          { ok: false, error: "Too many requests. Please try again later." },
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

      let body: {
        name?: string;
        email?: string;
        phone?: string;
        message?: string;
        leadType?: "contact" | "quote_request" | "general";
        sourceWebsite?: string;
        referrer?: string;
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        landingPage?: string;
        conversionPage?: string;
      };

      try {
        body = (await request.json()) as typeof body;
      } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
      }

      const sourceUrl = body.landingPage ?? body.sourceWebsite ?? null;
      const utm = sourceUrl
        ? parseUtmFromUrl(sourceUrl)
        : {
            utmSource: null,
            utmMedium: null,
            utmCampaign: null,
          };

      const leadType = body.leadType ?? "contact";
      const eventType = leadType === "quote_request" ? "quote_request" : "contact_submission";

      const result = await createLead({
        companyId: businessId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        message: body.message,
        leadType,
        source: "website",
        sourceWebsite: body.sourceWebsite,
        referrer: body.referrer ?? request.headers.get("referer") ?? undefined,
        utmSource: body.utmSource ?? utm.utmSource ?? undefined,
        utmMedium: body.utmMedium ?? utm.utmMedium ?? undefined,
        utmCampaign: body.utmCampaign ?? utm.utmCampaign ?? undefined,
        landingPage: body.landingPage ?? body.sourceWebsite ?? undefined,
        conversionPage: body.conversionPage ?? body.sourceWebsite ?? undefined,
      });

      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
      }

      await trackWebsiteEvent({
        companyId: businessId,
        eventType,
        sourceUrl: body.landingPage ?? body.sourceWebsite,
        referrer: body.referrer,
        utmSource: body.utmSource ?? utm.utmSource,
        utmMedium: body.utmMedium ?? utm.utmMedium,
        utmCampaign: body.utmCampaign ?? utm.utmCampaign,
        metadata: { leadId: result.leadId },
      });

      if (result.leadId) {
        await triggerWorkflows("lead_created", {
          companyId: businessId,
          entityType: "lead",
          entityId: result.leadId,
          payload: { name: body.name, email: body.email },
        });
        await createNotification({
          companyId: businessId,
          type: "lead",
          title: "New lead captured",
          body: body.name ?? body.email ?? "Website lead",
          entityType: "lead",
          entityId: result.leadId,
        });
      }

      return NextResponse.json({ ok: true, leadId: result.leadId });
    },
    { companyId: businessId, isPublic: true }
  );
}
