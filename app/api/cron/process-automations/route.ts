import { NextResponse } from "next/server";

import { processPendingAutomationJobs } from "@/lib/services/workflow-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await processPendingAutomationJobs();
  return NextResponse.json({ ok: true, processed });
}
