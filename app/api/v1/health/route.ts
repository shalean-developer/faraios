import { NextResponse } from "next/server";

import { logPlatformApiRequest } from "@/lib/platform/api-log";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

const ROUTE = "/api/v1/health";

export async function GET(request: Request) {
  const startedAt = Date.now();
  let companyId: string | null = null;

  const finish = async (response: NextResponse, errorMessage?: string | null) => {
    await logPlatformApiRequest({
      route: ROUTE,
      method: "GET",
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

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return finish(
      NextResponse.json({ ok: false, error: "API is not configured." }, { status: 503 }),
      admin.error
    );
  }

  const { data: connected, error } = await admin.client
    .from("connected_websites")
    .select("company_id, production_url, type, api_key_status")
    .eq("api_key", apiKey)
    .eq("type", "external")
    .maybeSingle();

  if (error || !connected?.company_id) {
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

  await admin.client
    .from("connected_websites")
    .update({ api_key_last_used_at: new Date().toISOString() })
    .eq("api_key", apiKey);

  await admin.client.from("business_api_key_events").insert({
    company_id: connected.company_id,
    event_type: "used",
    key_prefix: apiKey.slice(0, 8),
    metadata: { endpoint: ROUTE },
  });

  return finish(
    NextResponse.json({
      ok: true,
      companyId: connected.company_id,
      productionUrl: connected.production_url,
      type: connected.type,
    })
  );
}
