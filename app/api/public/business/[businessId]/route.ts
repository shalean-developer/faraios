import { NextResponse } from "next/server";

import { tryCreateAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ businessId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { businessId } = await context.params;
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: "API is not configured." }, { status: 503 });
  }

  const { data: company, error } = await admin.client
    .from("companies")
    .select(
      `
      id,
      name,
      slug,
      contact_phone,
      contact_location,
      service_areas,
      business_description,
      booking_hours,
      industries ( name, slug )
    `
    )
    .eq("id", businessId)
    .maybeSingle();

  if (error || !company) {
    return NextResponse.json({ ok: false, error: "Business not found." }, { status: 404 });
  }

  type IndustryRow = { name?: string; slug?: string } | null;
  const rawIndustry = company.industries;
  const industry: IndustryRow = Array.isArray(rawIndustry)
    ? rawIndustry[0] ?? null
    : (rawIndustry as IndustryRow);

  return NextResponse.json({
    ok: true,
    business: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      phone: company.contact_phone,
      location: company.contact_location,
      serviceAreas: company.service_areas,
      description: company.business_description,
      bookingHours: company.booking_hours,
      industry: industry
        ? { name: industry.name, slug: industry.slug }
        : null,
    },
  });
}
