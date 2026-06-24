import { tryCreateAdminClient } from "@/lib/supabase/admin";

export type PlatformApiLogInput = {
  route: string;
  method: string;
  statusCode: number;
  companyId?: string | null;
  durationMs?: number;
  errorMessage?: string | null;
  isPublic?: boolean;
};

export async function logPlatformApiRequest(input: PlatformApiLogInput): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  try {
    await admin.client.from("platform_api_logs").insert({
      route: input.route,
      method: input.method,
      status_code: input.statusCode,
      company_id: input.companyId ?? null,
      duration_ms: input.durationMs ?? 0,
      error_message: input.errorMessage ?? null,
      is_public: input.isPublic ?? false,
    });
  } catch (error) {
    console.error("[platform] logPlatformApiRequest", error);
  }
}
