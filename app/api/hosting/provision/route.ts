import { NextResponse } from "next/server";
import { requireHostingAdmin } from "@/lib/hosting/api-auth";
import { provisionHostingOrder } from "@/lib/services/hosting-automation";

export async function POST(req: Request) {
  const auth = await requireHostingAdmin();
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as { orderId?: string };
  if (!body.orderId) {
    return NextResponse.json({ ok: false, error: "orderId is required." }, { status: 400 });
  }

  const result = await provisionHostingOrder(body.orderId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, serviceId: result.serviceId });
}
