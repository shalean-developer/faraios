import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { log404Hit } from "@/lib/services/seo/monitor-404-service";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, projectId, missingUrl, referrer, userAgent } = body as {
      companyId?: string;
      projectId?: string;
      missingUrl?: string;
      referrer?: string;
      userAgent?: string;
    };

    if (!companyId || !projectId || !missingUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = tryCreateAdminClient();
    if (!admin.ok) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const { data: project } = await admin.client
      .from("seo_projects")
      .select("id, company_id")
      .eq("id", projectId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "Invalid project" }, { status: 404 });
    }

    await log404Hit({
      projectId,
      companyId,
      missingUrl: missingUrl.slice(0, 500),
      referrer: referrer?.slice(0, 500),
      userAgent: userAgent?.slice(0, 200),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
