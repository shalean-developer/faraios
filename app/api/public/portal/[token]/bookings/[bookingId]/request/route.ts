import { NextResponse } from "next/server";

import { resolvePortalToken } from "@/lib/services/portal-access";
import { createNotification } from "@/lib/services/notifications";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ token: string; bookingId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { token, bookingId } = await params;
  const ctx = await resolvePortalToken(decodeURIComponent(token));
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Invalid portal link." }, { status: 401 });
  }

  const body = (await req.json()) as { requestType?: string; message?: string };
  if (!["reschedule", "cancel"].includes(body.requestType ?? "")) {
    return NextResponse.json({ ok: false, error: "Invalid request type." }, { status: 400 });
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: "Not configured." }, { status: 500 });
  }

  const { data: booking } = await admin.client
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("company_id", ctx.companyId)
    .eq("customer_id", ctx.customerId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 404 });
  }

  const { error } = await admin.client.from("portal_booking_requests").insert({
    company_id: ctx.companyId,
    customer_id: ctx.customerId,
    booking_id: bookingId,
    request_type: body.requestType,
    message: body.message ?? null,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await createNotification({
    companyId: ctx.companyId,
    type: "booking",
    title: `Customer ${body.requestType} request`,
    body: `${ctx.customerName} requested to ${body.requestType} a booking.`,
    entityType: "booking",
    entityId: bookingId,
  });

  return NextResponse.json({ ok: true });
}
