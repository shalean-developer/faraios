import { NextResponse } from "next/server";

import { calculateBookingPrice } from "@/lib/bookings/pricing-calculator";
import { getPricingRuleForService } from "@/lib/services/booking-form-config";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { ServiceAddon } from "@/types/booking-form";

type RouteContext = { params: Promise<{ businessId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { businessId } = await context.params;
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
    serviceId?: string;
    bedrooms?: number;
    bathrooms?: number;
    frequency?: string;
    addons?: ServiceAddon[];
    extraIds?: string[];
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  let serviceBasePriceCents = 0;
  if (body.serviceId) {
    const { data: service } = await admin.client
      .from("company_services")
      .select("base_price_cents")
      .eq("company_id", businessId)
      .eq("id", body.serviceId)
      .maybeSingle();
    serviceBasePriceCents = service?.base_price_cents ?? 0;
  }

  const selectedExtras =
    body.extraIds && body.extraIds.length > 0
      ? (
          await admin.client
            .from("booking_form_extras")
            .select("id, name, price_cents")
            .eq("company_id", businessId)
            .in("id", body.extraIds)
            .eq("active", true)
        ).data ?? []
      : [];

  const pricingRule = await getPricingRuleForService(businessId, body.serviceId ?? null, {
    useAdmin: true,
  });

  const pricing = calculateBookingPrice({
    serviceBasePriceCents,
    bedrooms: body.bedrooms,
    bathrooms: body.bathrooms,
    frequency: body.frequency,
    selectedAddons: body.addons,
    selectedExtras: selectedExtras as { id: string; name: string; price_cents: number }[],
    pricingRule,
  });

  return NextResponse.json({ ok: true, pricing });
}
