import { tryCreateAdminClient } from "@/lib/supabase/admin";

export async function recordPlatformCronRun(input: {
  jobId: string;
  status: "success" | "failed";
  output?: Record<string, unknown> | null;
  errorMessage?: string | null;
  startedAt: Date;
  finishedAt?: Date;
}): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  const finishedAt = input.finishedAt ?? new Date();
  const durationMs = Math.max(0, finishedAt.getTime() - input.startedAt.getTime());

  try {
    await admin.client.from("platform_cron_runs").insert({
      job_id: input.jobId,
      status: input.status,
      output: input.output ?? null,
      error_message: input.errorMessage ?? null,
      started_at: input.startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: durationMs,
    });
  } catch (error) {
    console.error("[platform] recordPlatformCronRun", error);
  }
}
