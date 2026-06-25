import { NextResponse } from "next/server";

import { withPlatformApiLog } from "@/lib/platform/with-api-log";
import { createNotification } from "@/lib/services/notifications";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

const ENQUIRY_LIMIT = 8;
const ENQUIRY_WINDOW_MS = 15 * 60 * 1000;

type RouteContext = { params: Promise<{ businessSlug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { businessSlug } = await context.params;
  const slug = decodeURIComponent(businessSlug);
  const route = `/api/public/site/${slug}/enquiries`;

  return withPlatformApiLog(
    request,
    route,
    async () => {
      const limited = rateLimit(
        `public-site-enquiry:${getClientIp(request)}:${slug}`,
        ENQUIRY_LIMIT,
        ENQUIRY_WINDOW_MS
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
        .select("id, name, primary_contact_email")
        .eq("slug", slug)
        .maybeSingle();

      if (!company?.id) {
        return NextResponse.json({ ok: false, error: "Business not found." }, { status: 404 });
      }

      const { data: website } = await admin.client
        .from("websites")
        .select("id, status")
        .eq("client_id", company.id)
        .eq("builder_mode", true)
        .eq("status", "published")
        .maybeSingle();

      if (!website?.id) {
        return NextResponse.json(
          { ok: false, error: "Website is not published." },
          { status: 404 }
        );
      }

      let body: {
        name?: string;
        email?: string;
        phone?: string;
        message?: string;
        serviceInterest?: string;
      };

      try {
        body = (await request.json()) as typeof body;
      } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
      }

      const name = body.name?.trim();
      if (!name) {
        return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
      }

      const { data: enquiry, error } = await admin.client
        .from("website_enquiries")
        .insert({
          website_id: website.id,
          company_id: company.id,
          name,
          email: body.email?.trim() || null,
          phone: body.phone?.trim() || null,
          message: body.message?.trim() || null,
          service_interest: body.serviceInterest?.trim() || null,
          status: "new",
        })
        .select("id")
        .single();

      if (error || !enquiry) {
        return NextResponse.json(
          { ok: false, error: error?.message ?? "Could not save enquiry." },
          { status: 500 }
        );
      }

      await createNotification({
        companyId: company.id as string,
        type: "lead",
        title: "New website enquiry",
        body: `${name}${body.serviceInterest ? ` · ${body.serviceInterest}` : ""}`,
        entityType: "website_enquiry",
        entityId: enquiry.id as string,
      });

      return NextResponse.json({ ok: true, enquiryId: enquiry.id });
    },
    { isPublic: true }
  );
}
