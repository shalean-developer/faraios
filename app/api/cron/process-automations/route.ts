import { NextResponse } from "next/server";

import { recordPlatformCronRun } from "@/lib/platform/cron-run";
import { processPendingAutomationJobs } from "@/lib/services/workflow-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startedAt = new Date();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    await recordPlatformCronRun({
      jobId: "process-automations",
      status: "failed",
      startedAt,
      errorMessage: "Unauthorized cron request",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await processPendingAutomationJobs();
    await recordPlatformCronRun({
      jobId: "process-automations",
      status: "success",
      startedAt,
      output: { processed },
    });
    return NextResponse.json({ ok: true, processed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron job failed";
    await recordPlatformCronRun({
      jobId: "process-automations",
      status: "failed",
      startedAt,
      errorMessage: message,
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
