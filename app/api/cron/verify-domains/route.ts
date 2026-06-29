import { NextResponse } from "next/server";

import { recordPlatformCronRun } from "@/lib/platform/cron-run";
import { processPendingPleskDomainVerifications } from "@/lib/services/website-domains";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  const startedAt = new Date();

  if (!isAuthorized(request)) {
    await recordPlatformCronRun({
      jobId: "verify-domains",
      status: "failed",
      startedAt,
      errorMessage: "Unauthorized cron request",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const output = await processPendingPleskDomainVerifications(50);
    await recordPlatformCronRun({
      jobId: "verify-domains",
      status: "success",
      startedAt,
      output,
    });
    return NextResponse.json({ ok: true, ...output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron job failed";
    await recordPlatformCronRun({
      jobId: "verify-domains",
      status: "failed",
      startedAt,
      errorMessage: message,
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
