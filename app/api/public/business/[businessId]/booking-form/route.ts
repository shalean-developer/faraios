import { NextResponse } from "next/server";

import { withPlatformApiLog } from "@/lib/platform/with-api-log";
import { getPublishedBookingFormForCompany } from "@/lib/services/booking-forms";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ businessId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { businessId } = await context.params;
  const route = `/api/public/business/${businessId}/booking-form`;

  return withPlatformApiLog(
    request,
    route,
    async () => {
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

      const form = await getPublishedBookingFormForCompany(businessId);
      if (!form) {
        return NextResponse.json(
          { ok: false, error: "No published booking form for this business." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        form: {
          businessId: form.company_id,
          industry: form.industry_slug,
          name: form.name,
          version: form.version,
          fields: form.fields,
          requiredFields: form.fields.filter((f) => f.required).map((f) => f.key),
        },
      });
    },
    { companyId: businessId, isPublic: true }
  );
}
