import { NextResponse } from "next/server";

import { tryCreateAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-faraios-company-key")?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Missing X-FaraiOS-Company-Key header." },
      { status: 401 }
    );
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: "API is not configured." },
      { status: 503 }
    );
  }

  const { data: connected, error } = await admin.client
    .from("connected_websites")
    .select("company_id, production_url, type, api_key_status")
    .eq("api_key", apiKey)
    .eq("type", "external")
    .maybeSingle();

  if (error || !connected?.company_id) {
    return NextResponse.json(
      { ok: false, error: "Invalid API key." },
      { status: 401 }
    );
  }

  if (connected.api_key_status === "revoked") {
    return NextResponse.json(
      { ok: false, error: "API key has been revoked." },
      { status: 401 }
    );
  }

  await admin.client
    .from("connected_websites")
    .update({ api_key_last_used_at: new Date().toISOString() })
    .eq("api_key", apiKey);

  await admin.client.from("business_api_key_events").insert({
    company_id: connected.company_id,
    event_type: "used",
    key_prefix: apiKey.slice(0, 8),
    metadata: { endpoint: "/api/v1/health" },
  });

  return NextResponse.json({
    ok: true,
    companyId: connected.company_id,
    productionUrl: connected.production_url,
    type: connected.type,
  });
}
