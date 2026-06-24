import { NextResponse } from "next/server";

import { withPlatformApiLog } from "@/lib/platform/with-api-log";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ businessId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { businessId } = await context.params;
  const route = `/api/public/business/${businessId}/services`;

  return withPlatformApiLog(
    request,
    route,
    async () => {
      const admin = tryCreateAdminClient();
      if (!admin.ok) {
        return NextResponse.json({ ok: false, error: "API is not configured." }, { status: 503 });
      }

      const { data, error } = await admin.client
        .from("company_services")
        .select("id, name, description, base_price_cents, duration_minutes, addons, active")
        .eq("company_id", businessId)
        .eq("active", true)
        .order("name", { ascending: true });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        services: (data ?? []).map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          basePriceCents: service.base_price_cents,
          durationMinutes: service.duration_minutes,
          addons: service.addons ?? [],
          active: service.active,
        })),
      });
    },
    { companyId: businessId, isPublic: true }
  );
}
