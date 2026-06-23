import { NextResponse } from "next/server";

import { resolvePortalToken } from "@/lib/services/portal-access";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ token: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { token } = await params;
  const ctx = await resolvePortalToken(decodeURIComponent(token));
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Invalid portal link." }, { status: 401 });
  }

  const body = (await req.json()) as { name?: string; phone?: string };
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: "Not configured." }, { status: 500 });
  }

  const updates: Record<string, string> = {};
  if (body.name?.trim()) updates.name = body.name.trim();
  if (body.phone !== undefined) updates.phone = body.phone.trim();

  const { error } = await admin.client
    .from("customers")
    .update(updates)
    .eq("id", ctx.customerId)
    .eq("company_id", ctx.companyId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
