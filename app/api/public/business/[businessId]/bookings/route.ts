import { NextResponse } from "next/server";

import { withPlatformApiLog } from "@/lib/platform/with-api-log";
import { createEngineBooking } from "@/lib/services/booking-engine";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { ServiceAddon } from "@/types/booking-form";

const BOOKING_LIMIT = 10;
const BOOKING_WINDOW_MS = 15 * 60 * 1000;

type RouteContext = { params: Promise<{ businessId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { businessId } = await context.params;
  const route = `/api/public/business/${businessId}/bookings`;

  return withPlatformApiLog(
    request,
    route,
    async () => {
      const limited = rateLimit(
        `public-booking:${getClientIp(request)}:${businessId}`,
        BOOKING_LIMIT,
        BOOKING_WINDOW_MS
      );
      if (!limited.ok) {
        return NextResponse.json(
          { ok: false, error: "Too many booking requests. Please try again later." },
          { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
        );
      }

      const admin = tryCreateAdminClient();
      if (!admin.ok) {
        return NextResponse.json({ ok: false, error: "API is not configured." }, { status: 503 });
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
        customerName?: string;
        customerEmail?: string;
        customerPhone?: string;
        serviceId?: string;
        service?: string;
        bookingDate?: string;
        preferredTime?: string;
        address?: string;
        notes?: string;
        addons?: ServiceAddon[];
        customResponses?: Record<string, unknown>;
        sourceWebsite?: string;
        referrer?: string;
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        websiteId?: string;
        deviceType?: string;
        consentGiven?: boolean;
        landingPage?: string;
        conversionPage?: string;
      };

      try {
        body = (await request.json()) as typeof body;
      } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
      }

      const result = await createEngineBooking({
        companyId: businessId,
        customerName: body.customerName ?? "",
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        serviceId: body.serviceId,
        service: body.service,
        bookingDate: body.bookingDate ?? "",
        preferredTime: body.preferredTime,
        address: body.address,
        notes: body.notes,
        addons: body.addons,
        customResponses: body.customResponses,
        sourceWebsite: body.sourceWebsite ?? request.headers.get("referer") ?? undefined,
        referrer: body.referrer ?? request.headers.get("referer") ?? undefined,
        utmSource: body.utmSource,
        utmMedium: body.utmMedium,
        utmCampaign: body.utmCampaign,
        websiteId: body.websiteId,
        deviceType:
          body.deviceType ??
          (request.headers.get("user-agent")?.toLowerCase().includes("mobile")
            ? "mobile"
            : "desktop"),
        consentGiven: body.consentGiven,
        landingPage: body.landingPage,
        conversionPage: body.conversionPage,
        source: "public",
      });

      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ ok: true, bookingId: result.bookingId });
    },
    { companyId: businessId, isPublic: true }
  );
}
