import { NextResponse } from "next/server";

import { logPlatformApiRequest } from "@/lib/platform/api-log";
import { createEngineBooking } from "@/lib/services/booking-engine";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { ServiceAddon } from "@/types/booking-form";

const BOOKING_LIMIT = 20;
const BOOKING_WINDOW_MS = 15 * 60 * 1000;
const ROUTE = "/api/v1/bookings";

export async function POST(request: Request) {
  const startedAt = Date.now();
  let companyId: string | null = null;

  const finish = async (response: NextResponse, errorMessage?: string | null) => {
    await logPlatformApiRequest({
      route: ROUTE,
      method: "POST",
      statusCode: response.status,
      companyId,
      durationMs: Date.now() - startedAt,
      errorMessage: errorMessage ?? null,
    });
    return response;
  };

  const apiKey = request.headers.get("x-faraios-company-key")?.trim();
  if (!apiKey) {
    return finish(
      NextResponse.json(
        { ok: false, error: "Missing X-FaraiOS-Company-Key header." },
        { status: 401 }
      ),
      "Missing API key"
    );
  }

  const limited = rateLimit(
    `v1-booking:${getClientIp(request)}:${apiKey}`,
    BOOKING_LIMIT,
    BOOKING_WINDOW_MS
  );
  if (!limited.ok) {
    return finish(
      NextResponse.json(
        { ok: false, error: "Too many booking requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      ),
      "Rate limited"
    );
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
    consentGiven?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return finish(
      NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 }),
      "Invalid JSON"
    );
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return finish(
      NextResponse.json({ ok: false, error: "API is not configured." }, { status: 503 }),
      admin.error
    );
  }

  const { data: connected, error: connectedError } = await admin.client
    .from("connected_websites")
    .select("company_id, production_url, api_key_status")
    .eq("api_key", apiKey)
    .eq("type", "external")
    .maybeSingle();

  if (connectedError || !connected?.company_id) {
    return finish(
      NextResponse.json({ ok: false, error: "Invalid API key." }, { status: 401 }),
      "Invalid API key"
    );
  }

  companyId = connected.company_id;

  if (connected.api_key_status === "revoked") {
    return finish(
      NextResponse.json({ ok: false, error: "API key has been revoked." }, { status: 401 }),
      "Revoked API key"
    );
  }

  const result = await createEngineBooking({
    companyId: connected.company_id,
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
    sourceWebsite: body.sourceWebsite ?? connected.production_url ?? undefined,
    consentGiven: body.consentGiven ?? true,
    source: "external",
  });

  if (!result.ok) {
    return finish(
      NextResponse.json({ ok: false, error: result.error }, { status: 400 }),
      result.error
    );
  }

  return finish(NextResponse.json({ ok: true, bookingId: result.bookingId }));
}
