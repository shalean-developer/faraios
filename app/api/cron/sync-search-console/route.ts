import { NextResponse } from "next/server";

import { recordPlatformCronRun } from "@/lib/platform/cron-run";
import { syncSearchConsoleForAllCompanies } from "@/lib/services/search-console-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startedAt = new Date();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    await recordPlatformCronRun({
      jobId: "sync-search-console",
      status: "failed",
      startedAt,
      errorMessage: "Unauthorized cron request",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const output = await syncSearchConsoleForAllCompanies();
    await recordPlatformCronRun({
      jobId: "sync-search-console",
      status: output.errors.length ? "failed" : "success",
      startedAt,
      output,
      errorMessage: output.errors.length ? output.errors.join("; ") : undefined,
    });
    return NextResponse.json({ ok: true, ...output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron job failed";
    await recordPlatformCronRun({
      jobId: "sync-search-console",
      status: "failed",
      startedAt,
      errorMessage: message,
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
